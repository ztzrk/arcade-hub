import { describe, expect, it } from "vitest";
import {
  getShipCells,
  type GridCoord,
  type PlacedShip,
} from "@arcade-hub/shared";
import { BattleshipEngine } from "./BattleshipEngine.ts";
import { EngineError } from "./IGameEngine.ts";

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SAMPLE_SHIPS_P1: PlacedShip[] = [
  { id: "carrier", row: 0, col: 0, orientation: "H" }, // (0,0..4)
  { id: "battleship", row: 2, col: 0, orientation: "H" }, // (2,0..3)
  { id: "cruiser", row: 4, col: 0, orientation: "H" }, // (4,0..2)
  { id: "submarine", row: 6, col: 0, orientation: "H" }, // (6,0..2)
  { id: "destroyer", row: 8, col: 0, orientation: "H" }, // (8,0..1)
];
const SAMPLE_MINES_P1: GridCoord[] = [
  { row: 9, col: 8 },
  { row: 9, col: 9 },
];

const SAMPLE_SHIPS_P2: PlacedShip[] = [
  { id: "carrier", row: 0, col: 5, orientation: "V" }, // (0..4, 5)
  { id: "battleship", row: 1, col: 7, orientation: "V" }, // (1..4, 7)
  { id: "cruiser", row: 6, col: 4, orientation: "H" }, // (6, 4..6)
  { id: "submarine", row: 8, col: 4, orientation: "H" }, // (8, 4..6)
  { id: "destroyer", row: 9, col: 0, orientation: "H" }, // (9, 0..1)
];
const SAMPLE_MINES_P2: GridCoord[] = [
  { row: 0, col: 0 },
  { row: 5, col: 5 },
];

describe("BattleshipEngine (Battleship Taktis 1v1)", () => {
  it("validates fleet & mine placement and enforces fog-of-war", () => {
    const engine = new BattleshipEngine(createSeededRng(7));
    let state = engine.initState(["p1", "p2"]);

    // Reject ship overlapping a mine
    expect(() =>
      engine.handleAction(state, "p1", {
        type: "LOCK_FLEET",
        ships: SAMPLE_SHIPS_P1,
        mines: [
          { row: 0, col: 0 },
          { row: 9, col: 9 },
        ],
      })
    ).toThrow(EngineError);

    state = engine.handleAction(state, "p1", {
      type: "LOCK_FLEET",
      ships: SAMPLE_SHIPS_P1,
      mines: SAMPLE_MINES_P1,
    }).newState;
    expect(state.phase).toBe("SETUP_FLEET");

    state = engine.handleAction(state, "p2", {
      type: "LOCK_FLEET",
      ships: SAMPLE_SHIPS_P2,
      mines: SAMPLE_MINES_P2,
    }).newState;
    expect(state.phase).toBe("BATTLE");

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.opponentSunkShips).toHaveLength(0);
    expect(p1View.revealedOpponentShips).toBeNull();
    expect(p1View.revealedOpponentMines).toBeNull();
    expect(p1View.opponentAliveShipsCount).toBe(5);
  });

  it("caps HIT streaks at 2 shots per turn and triggers ricochet on Sea Mine hit", () => {
    const engine = new BattleshipEngine(createSeededRng(11));
    let state = engine.initState(["p1", "p2"]);
    state = engine.handleAction(state, "p1", {
      type: "LOCK_FLEET",
      ships: SAMPLE_SHIPS_P1,
      mines: SAMPLE_MINES_P1,
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "LOCK_FLEET",
      ships: SAMPLE_SHIPS_P2,
      mines: SAMPLE_MINES_P2,
    }).newState;

    // P1 shot 1: HIT on P2 carrier (0,5) -> keeps turn with 1 shot left
    state = engine.handleAction(state, "p1", {
      type: "FIRE_SHOT",
      row: 0,
      col: 5,
    }).newState;
    expect(state.currentTurnPlayerId).toBe("p1");
    expect(state.shotsUsedThisTurn).toBe(1);

    // Skills blocked mid-streak after firing
    expect(() =>
      engine.handleAction(state, "p1", {
        type: "USE_SONAR",
        centerRow: 1,
        centerCol: 1,
      })
    ).toThrow(EngineError);

    // P1 shot 2: HIT on P2 carrier (1,5) -> capped at 2 shots, turn passes to P2
    state = engine.handleAction(state, "p1", {
      type: "FIRE_SHOT",
      row: 1,
      col: 5,
    }).newState;
    expect(state.currentTurnPlayerId).toBe("p2");
    expect(state.shotsUsedThisTurn).toBe(0);

    // P2 shoots P1's mine at (9,8) -> MINE_HIT triggers ricochet hit on P2 and ends turn
    state = engine.handleAction(state, "p2", {
      type: "FIRE_SHOT",
      row: 9,
      col: 8,
    }).newState;
    expect(state.currentTurnPlayerId).toBe("p1");
    const p2View = engine.getViewForPlayer(state, "p2");
    expect(p2View.myShots.some((s) => s.outcome === "MINE_HIT")).toBe(true);
    expect(p2View.incomingShots.some((s) => s.isRicochet)).toBe(true);
  });

  it("supports Sonar Ping, Emergency Shift, Cross Strike, and full match win", () => {
    const engine = new BattleshipEngine(createSeededRng(25));
    let state = engine.initState(["p1", "p2"]);
    state = engine.handleAction(state, "p1", {
      type: "LOCK_FLEET",
      ships: SAMPLE_SHIPS_P1,
      mines: SAMPLE_MINES_P1,
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "LOCK_FLEET",
      ships: SAMPLE_SHIPS_P2,
      mines: SAMPLE_MINES_P2,
    }).newState;

    // P1 uses Sonar Ping centered at (8,5) -> detects P2 submarine (8,4..6) = 3 cells
    state = engine.handleAction(state, "p1", {
      type: "USE_SONAR",
      centerRow: 8,
      centerCol: 5,
    }).newState;
    expect(state.currentTurnPlayerId).toBe("p2");
    const p1Sonar = engine.getViewForPlayer(state, "p1").lastSonarResult;
    expect(p1Sonar?.detectedShipCells).toBe(3);
    expect(p1Sonar?.detectedMines).toBe(0);

    // P2 uses Emergency Shift on destroyer (9,0..1) -> UP to (8,0..1)
    state = engine.handleAction(state, "p2", {
      type: "USE_SHIFT_SHIP",
      shipId: "destroyer",
      direction: "UP",
    }).newState;
    expect(state.currentTurnPlayerId).toBe("p1");
    expect(
      engine.getViewForPlayer(state, "p2").myShips.find((s) => s.id === "destroyer")?.row
    ).toBe(8);

    // P1 uses Cross Strike at (2,5) -> hits P2 carrier cells
    state = engine.handleAction(state, "p1", {
      type: "USE_CROSS_STRIKE",
      row: 2,
      col: 5,
    }).newState;
    expect(state.currentTurnPlayerId).toBe("p2");
    expect(engine.getViewForPlayer(state, "p1").skills.CROSS_STRIKE.used).toBe(true);

    // P2 sinks P1's submarine -> P2 kills P1's SONAR_PING availability (not yet used by P2? test P1 submarine)
    const p1SubCells = getShipCells(SAMPLE_SHIPS_P1[3]!);
    // P2 hits 2 cells on turn 1, then misses or finishes on next turn
    state = engine.handleAction(state, "p2", {
      type: "FIRE_SHOT",
      row: p1SubCells[0]!.row,
      col: p1SubCells[0]!.col,
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "FIRE_SHOT",
      row: p1SubCells[1]!.row,
      col: p1SubCells[1]!.col,
    }).newState;
    // P1 misses at (9,9)
    state = engine.handleAction(state, "p1", {
      type: "FIRE_SHOT",
      row: 9,
      col: 9,
    }).newState;
    // P2 sinks P1's submarine
    state = engine.handleAction(state, "p2", {
      type: "FIRE_SHOT",
      row: p1SubCells[2]!.row,
      col: p1SubCells[2]!.col,
    }).newState;
    expect(engine.getViewForPlayer(state, "p1").skills.SONAR_PING.shipAlive).toBe(false);
    // P2 shoots water to hand turn back
    state = engine.handleAction(state, "p2", {
      type: "FIRE_SHOT",
      row: 9,
      col: 7,
    }).newState;

    // P1 sinks all remaining cells of P2's current fleet
    const p2CurrentShips = engine.getViewForPlayer(state, "p2").myShips;
    const p1ShotSet = new Set(
      engine.getViewForPlayer(state, "p1").myShots.map((s) => `${s.row},${s.col}`)
    );
    const remainingTargets: GridCoord[] = [];
    for (const s of p2CurrentShips) {
      for (const c of getShipCells(s)) {
        if (!p1ShotSet.has(`${c.row},${c.col}`)) {
          remainingTargets.push(c);
        }
      }
    }

    let matchWinnerId: string | undefined;
    let missRow = 1;
    for (const target of remainingTargets) {
      if (state.currentTurnPlayerId === "p2") {
        // P2 shoots safe empty cell
        while (
          engine
            .getViewForPlayer(state, "p2")
            .myShots.some((s) => s.row === missRow && s.col === 9)
        ) {
          missRow += 1;
        }
        state = engine.handleAction(state, "p2", {
          type: "FIRE_SHOT",
          row: missRow,
          col: 9,
        }).newState;
      }
      const res = engine.handleAction(state, "p1", {
        type: "FIRE_SHOT",
        row: target.row,
        col: target.col,
      });
      state = res.newState;
      matchWinnerId = res.matchWinnerId;
    }

    expect(state.phase).toBe("MATCH_END");
    expect(matchWinnerId).toBe("p1");
    expect(engine.getViewForPlayer(state, "p1").revealedOpponentShips).toHaveLength(5);
    expect(engine.getViewForPlayer(state, "p1").revealedOpponentMines).toHaveLength(2);
  });
});
