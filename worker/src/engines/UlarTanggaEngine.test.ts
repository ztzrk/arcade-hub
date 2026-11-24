import { describe, expect, it } from "vitest";
import {
  ULAR_TANGGA_MAX_HAND,
  ULAR_TANGGA_MAX_TILE,
  gridCoordToTile,
  tileToGridCoord,
} from "@arcade-hub/shared";
import { EngineError } from "./IGameEngine.ts";
import { UlarTanggaEngine, type UlarTanggaState } from "./UlarTanggaEngine.ts";

function makeDeterministicEngine(values: number[]): UlarTanggaEngine {
  let idx = 0;
  return new UlarTanggaEngine(() => {
    const val = values[Math.min(idx, values.length - 1)]!;
    idx += 1;
    return val;
  });
}

function makeTestState(overrides: Partial<UlarTanggaState> = {}): UlarTanggaState {
  return {
    playerIds: ["p1", "p2"],
    phase: "PLAYING",
    turnNumber: 1,
    currentTurnPlayerId: "p1",
    positions: { p1: 0, p2: 0 },
    shielded: { p1: false, p2: false },
    miniCursed: { p1: false, p2: false },
    hands: { p1: [], p2: [] },
    activeDiceBuff: null,
    cardPlayedThisTurn: false,
    usedBonusRollThisTurn: false,
    traps: [],
    moveNonce: 0,
    effectNonce: 0,
    lastMove: null,
    lastCardEffect: null,
    winnerId: null,
    ...overrides,
  };
}

describe("UlarTangga board coordinates", () => {
  it("maps 1..100 tiles in boustrophedon zig-zag order", () => {
    expect(tileToGridCoord(1)).toEqual({ row: 9, col: 0 });
    expect(tileToGridCoord(10)).toEqual({ row: 9, col: 9 });
    expect(tileToGridCoord(11)).toEqual({ row: 8, col: 9 });
    expect(tileToGridCoord(20)).toEqual({ row: 8, col: 0 });
    expect(tileToGridCoord(91)).toEqual({ row: 0, col: 9 });
    expect(tileToGridCoord(100)).toEqual({ row: 0, col: 0 });

    for (let tile = 1; tile <= 100; tile++) {
      const { row, col } = tileToGridCoord(tile);
      expect(gridCoordToTile(row, col)).toBe(tile);
    }
  });
});

describe("UlarTanggaEngine", () => {
  it("initializes both players at tile 0 with 1 starting power-up card each", () => {
    const engine = makeDeterministicEngine([0.1, 0.0, 0.5]);
    const state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("PLAYING");
    expect(state.positions).toEqual({ p1: 0, p2: 0 });
    expect(state.hands["p1"]).toHaveLength(1);
    expect(state.hands["p2"]).toHaveLength(1);
    expect(state.currentTurnPlayerId).toBe("p1");

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.myHand).toHaveLength(1);
    expect(p1View.opponentCardCount).toBe(1);
  });

  it("rejects actions on opponent turn and handles ladder climb + power tile draw", () => {
    // 0.51 -> die = 4 (0 + 4 = 4 -> ladder 4->25)
    const engine = makeDeterministicEngine([0.55]);
    const state = makeTestState({ hands: { p1: [], p2: [] } });

    expect(() =>
      engine.handleAction(state, "p2", { type: "ROLL_DICE" })
    ).toThrow(EngineError);

    const res = engine.handleAction(state, "p1", { type: "ROLL_DICE" });
    expect(res.newState.positions["p1"]).toBe(25);
    expect(res.newState.lastMove?.portalKind).toBe("LADDER");
    expect(res.newState.lastMove?.portalFrom).toBe(4);
    expect(res.newState.lastMove?.portalTo).toBe(25);
    expect(res.newState.currentTurnPlayerId).toBe("p2");

    // Power-up tile 9 draw from position 6 with roll 3 (0.35 -> 3)
    const powerEngine = makeDeterministicEngine([0.35, 0.1]);
    const resPower = powerEngine.handleAction(
      makeTestState({ positions: { p1: 6, p2: 1 } }),
      "p1",
      { type: "ROLL_DICE" }
    );
    expect(resPower.newState.positions["p1"]).toBe(9);
    expect(resPower.newState.hands["p1"]).toHaveLength(1);
    expect(resPower.newState.lastMove?.drawnCard).not.toBeNull();
  });

  it("grants 1 bonus roll on rolling 6 without allowing infinite consecutive 6s", () => {
    // Roll 6 (0.9), then roll 6 again (0.9) -> second 6 passes turn
    const engine = makeDeterministicEngine([0.9, 0.9]);
    const state = makeTestState({ positions: { p1: 1, p2: 1 } });

    const first = engine.handleAction(state, "p1", { type: "ROLL_DICE" });
    expect(first.newState.positions["p1"]).toBe(7);
    expect(first.newState.currentTurnPlayerId).toBe("p1");
    expect(first.newState.usedBonusRollThisTurn).toBe(true);
    expect(first.newState.lastMove?.bonusRollGranted).toBe(true);

    const second = engine.handleAction(first.newState, "p1", { type: "ROLL_DICE" });
    expect(second.newState.positions["p1"]).toBe(46); // 7 + 6 = 13 -> ladder to 46!
    expect(second.newState.currentTurnPlayerId).toBe("p2");
    expect(second.newState.usedBonusRollThisTurn).toBe(false);
  });

  it("protects from snake bite with SHIELD and grants comeback card if unshielded", () => {
    // Roll 2 (0.2) from 25 -> lands on 27 (snake 27 -> 5)
    const engine = makeDeterministicEngine([0.2, 0.0]);
    const shieldedState = makeTestState({
      positions: { p1: 25, p2: 1 },
      hands: { p1: ["SHIELD"], p2: [] },
    });

    const playShield = engine.handleAction(shieldedState, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
    });
    expect(playShield.newState.shielded["p1"]).toBe(true);
    expect(playShield.newState.hands["p1"]).toHaveLength(0);

    const rollOnSnake = engine.handleAction(playShield.newState, "p1", {
      type: "ROLL_DICE",
    });
    expect(rollOnSnake.newState.positions["p1"]).toBe(27);
    expect(rollOnSnake.newState.shielded["p1"]).toBe(false);
    expect(rollOnSnake.newState.lastMove?.portalKind).toBe("SNAKE_BLOCKED");

    // Unshielded bite drops to 5 and draws comeback card
    const biteEngine = makeDeterministicEngine([0.2, 0.0]);
    const unshielded = makeTestState({
      positions: { p1: 25, p2: 1 },
      hands: { p1: [], p2: [] },
    });
    const bitten = biteEngine.handleAction(unshielded, "p1", { type: "ROLL_DICE" });
    expect(bitten.newState.positions["p1"]).toBe(5);
    expect(bitten.newState.lastMove?.portalKind).toBe("SNAKE");
    expect(bitten.newState.hands["p1"]).toHaveLength(1);
  });

  it("supports TRAP_BOMB placement, detonation, and SHIELD counterplay", () => {
    const engine = makeDeterministicEngine([0.55]); // die 4
    const state = makeTestState({
      positions: { p1: 10, p2: 10 },
      hands: { p1: ["TRAP_BOMB"], p2: [] },
    });

    // Reject placing bomb on ladder start tile 4 or power tile 9
    expect(() =>
      engine.handleAction(state, "p1", {
        type: "PLAY_CARD",
        cardIndex: 0,
        targetTile: 9,
      })
    ).toThrow(EngineError);

    // Place bomb on safe tile 14
    const withTrap = engine.handleAction(state, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
      targetTile: 14,
    });
    expect(withTrap.newState.traps).toEqual([{ tile: 14, ownerId: "p1" }]);

    // p1 rolling onto their own bomb at 14 does NOT trigger it
    const p1Roll = engine.handleAction(withTrap.newState, "p1", {
      type: "ROLL_DICE",
    });
    expect(p1Roll.newState.positions["p1"]).toBe(14);
    expect(p1Roll.newState.traps).toHaveLength(1);

    // p2 rolling 4 from 10 lands on 14 -> pushed back 5 to tile 9 (power-up tile!)
    const p2Roll = engine.handleAction(p1Roll.newState, "p2", {
      type: "ROLL_DICE",
    });
    expect(p2Roll.newState.traps).toHaveLength(0);
    expect(p2Roll.newState.lastMove?.trapTile).toBe(14);
    expect(p2Roll.newState.positions["p2"]).toBe(9);
  });

  it("supports SWAP_POS, MINI_CURSE, TURBO_DICE, and SNIPER_DICE", () => {
    const engine = makeDeterministicEngine([0.9, 0.9, 0.9]); // dice would roll max (6, 6, 3)

    // SWAP_POS swaps positions unless shielded
    const swapState = makeTestState({
      positions: { p1: 12, p2: 75 },
      hands: { p1: ["SWAP_POS"], p2: [] },
    });
    const swapped = engine.handleAction(swapState, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
    });
    expect(swapped.newState.positions).toEqual({ p1: 75, p2: 12 });

    // SWAP_POS blocked by opponent shield
    const swapShielded = makeTestState({
      positions: { p1: 12, p2: 75 },
      shielded: { p1: false, p2: true },
      hands: { p1: ["SWAP_POS"], p2: [] },
    });
    const blockedSwap = engine.handleAction(swapShielded, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
    });
    expect(blockedSwap.newState.positions).toEqual({ p1: 12, p2: 75 });
    expect(blockedSwap.newState.shielded["p2"]).toBe(false);
    expect(blockedSwap.newState.lastCardEffect?.blockedByShield).toBe(true);

    // TURBO_DICE rolls 2 dice (6 + 6 = 12)
    const turboState = makeTestState({
      positions: { p1: 1, p2: 1 },
      hands: { p1: ["TURBO_DICE"], p2: [] },
    });
    const turboPlayed = engine.handleAction(turboState, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
    });
    const turboRolled = engine.handleAction(turboPlayed.newState, "p1", {
      type: "ROLL_DICE",
    });
    // 1 + 12 = 13 -> climbs ladder 13 -> 46!
    expect(turboRolled.newState.lastMove?.dice).toEqual([6, 6]);
    expect(turboRolled.newState.positions["p1"]).toBe(46);

    // MINI_CURSE limits opponent roll to 1..3
    const curseEngine = makeDeterministicEngine([0.4, 0.9]);
    const curseState = makeTestState({
      positions: { p1: 1, p2: 10 },
      hands: { p1: ["MINI_CURSE"], p2: [] },
    });
    const cursed = curseEngine.handleAction(curseState, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
    });
    expect(cursed.newState.miniCursed["p2"]).toBe(true);
    const p1Done = curseEngine.handleAction(cursed.newState, "p1", {
      type: "ROLL_DICE",
    });
    const p2CursedRoll = curseEngine.handleAction(p1Done.newState, "p2", {
      type: "ROLL_DICE",
    });
    expect(p2CursedRoll.newState.lastMove?.totalRoll).toBeLessThanOrEqual(3);
    expect(p2CursedRoll.newState.miniCursed["p2"]).toBe(false);
  });

  it("handles SNIPER_DICE exact finish at 100 and bounce-back when overshooting 100", () => {
    const engine = makeDeterministicEngine([0.9]); // roll 6
    const nearFinish = makeTestState({
      positions: { p1: 98, p2: 50 },
      hands: { p1: ["SNIPER_DICE"], p2: [] },
    });

    // Overshoot bounce-back: 98 + 6 = 104 -> bounces to 96
    const bounced = engine.handleAction(nearFinish, "p1", { type: "ROLL_DICE" });
    expect(bounced.newState.positions["p1"]).toBe(96);
    expect(bounced.newState.lastMove?.bounced).toBe(true);
    expect(bounced.newState.phase).toBe("PLAYING");

    // SNIPER_DICE exact 4 from 96 -> lands on 100 and wins!
    const p1TurnAgain = {
      ...bounced.newState,
      currentTurnPlayerId: "p1",
    };
    const sniper = engine.handleAction(p1TurnAgain, "p1", {
      type: "PLAY_CARD",
      cardIndex: 0,
    });
    const winRes = engine.handleAction(sniper.newState, "p1", {
      type: "ROLL_DICE",
      chosenRoll: 4,
    });
    expect(winRes.newState.positions["p1"]).toBe(ULAR_TANGGA_MAX_TILE);
    expect(winRes.newState.phase).toBe("MATCH_END");
    expect(winRes.matchWinnerId).toBe("p1");
    expect(winRes.newState.winnerId).toBe("p1");
  });

  it("never exceeds MAX_HAND cards", () => {
    const engine = makeDeterministicEngine([0.0, 0.1]); // roll 1 -> tile 9 (power tile)
    const fullHand = makeTestState({
      positions: { p1: 8, p2: 1 },
      hands: { p1: ["SHIELD", "TURBO_DICE", "SWAP_POS"], p2: [] },
    });
    const res = engine.handleAction(fullHand, "p1", { type: "ROLL_DICE" });
    expect(res.newState.hands["p1"]).toHaveLength(ULAR_TANGGA_MAX_HAND);
    expect(res.newState.lastMove?.drawnCard).toBeNull();
  });
});
