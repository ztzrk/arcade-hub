import { describe, expect, it } from "vitest";
import { SUSUN_4_COLS, SUSUN_4_ROWS } from "@arcade-hub/shared";
import { EngineError } from "./IGameEngine.ts";
import { Susun4Engine, type Susun4State } from "./Susun4Engine.ts";

function makeDeterministicEngine(values: number[]): Susun4Engine {
  let idx = 0;
  return new Susun4Engine(() => {
    const val = values[Math.min(idx, values.length - 1)]!;
    idx += 1;
    return val;
  });
}

function makeEmptyBoard(): (string | null)[][] {
  return Array.from({ length: SUSUN_4_ROWS }, () =>
    Array.from({ length: SUSUN_4_COLS }, () => null)
  );
}

describe("Susun4Engine", () => {
  it("initializes an empty 6x7 board with zero scores", () => {
    const engine = makeDeterministicEngine([0.1]);
    const state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("PLAYING");
    expect(state.roundNumber).toBe(1);
    expect(state.board).toHaveLength(SUSUN_4_ROWS);
    expect(state.board[0]).toHaveLength(SUSUN_4_COLS);
    expect(state.scores).toEqual({ p1: 0, p2: 0 });
    expect(state.currentTurnPlayerId).toBe("p1");
  });

  it("stacks coins from the bottom row upwards and rejects full columns or wrong turn", () => {
    // 0.9 disables random twist (< 0.28)
    const engine = makeDeterministicEngine([0.1, 0.9]);
    let state = engine.initState(["p1", "p2"]);

    expect(() =>
      engine.handleAction(state, "p2", { type: "DROP_COIN", col: 0 })
    ).toThrow(EngineError);

    for (let i = 0; i < SUSUN_4_ROWS; i++) {
      const actor = state.currentTurnPlayerId;
      state = engine.handleAction(state, actor, {
        type: "DROP_COIN",
        col: 2,
      }).newState;
    }

    expect(state.board[5]![2]).toBe("p1");
    expect(state.board[0]![2]).toBe("p2");

    const nextActor = state.currentTurnPlayerId;
    expect(() =>
      engine.handleAction(state, nextActor, { type: "DROP_COIN", col: 2 })
    ).toThrow("Kolom tersebut sudah penuh.");
  });

  it("detects horizontal 4-in-a-row and progresses best-of-3 rounds to match win", () => {
    const engine = makeDeterministicEngine([0.1, 0.9]);
    let state = engine.initState(["p1", "p2"]);

    // Round 1: p1 drops cols 0,1,2,3 while p2 drops col 6
    for (let step = 0; step < 3; step++) {
      state = engine.handleAction(state, "p1", { type: "DROP_COIN", col: step }).newState;
      state = engine.handleAction(state, "p2", { type: "DROP_COIN", col: 6 }).newState;
    }
    const winRound1 = engine.handleAction(state, "p1", { type: "DROP_COIN", col: 3 });
    expect(winRound1.roundWinnerId).toBe("p1");
    expect(winRound1.matchWinnerId).toBeUndefined();
    expect(winRound1.newState.phase).toBe("ROUND_END");
    expect(winRound1.newState.scores["p1"]).toBe(1);
    expect(winRound1.newState.winningCells).toHaveLength(4);

    // Advance to round 2
    state = engine.handleAction(winRound1.newState, "p1", { type: "NEXT_ROUND" }).newState;
    expect(state.phase).toBe("ROUND_END");
    state = engine.handleAction(state, "p2", { type: "NEXT_ROUND" }).newState;
    expect(state.phase).toBe("PLAYING");
    expect(state.roundNumber).toBe(2);
    expect(state.currentTurnPlayerId).toBe("p2");

    // Round 2: p1 builds vertical 4 in col 0 while p2 drops in cols 5, 6
    state = engine.handleAction(state, "p2", { type: "DROP_COIN", col: 5 }).newState;
    for (let step = 0; step < 3; step++) {
      state = engine.handleAction(state, "p1", { type: "DROP_COIN", col: 0 }).newState;
      state = engine.handleAction(state, "p2", { type: "DROP_COIN", col: 6 }).newState;
    }
    const winRound2 = engine.handleAction(state, "p1", { type: "DROP_COIN", col: 0 });
    expect(winRound2.matchWinnerId).toBe("p1");
    expect(winRound2.newState.phase).toBe("MATCH_END");
    expect(winRound2.newState.winnerId).toBe("p1");
    expect(winRound2.newState.scores["p1"]).toBe(2);
  });

  it("triggers sudden FLIP_COLUMN twist as soon as 4 coins exist and respects 2-turn cooldown", () => {
    // 0.45 (< 0.55 trigger), 0.0 (first flippable col)
    const engine = makeDeterministicEngine([0.45, 0.0]);
    const board = makeEmptyBoard();
    // Col 1 has [bottom: p1, mid: p2, top: p2] -> 3 coins total before drop
    board[5]![1] = "p1";
    board[4]![1] = "p2";
    board[3]![1] = "p2";

    const state: Susun4State = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 1,
      scores: { p1: 0, p2: 0 },
      board,
      currentTurnPlayerId: "p2",
      moveCount: 3,
      turnsSinceLastTwist: 3,
      dropNonce: 3,
      twistNonce: 0,
      lastDrop: null,
      lastTwist: null,
      winningCells: [],
      readyForNextRound: { p1: false, p2: false },
      lastRoundSummary: null,
      winnerId: null,
    };

    // p2 drops in col 4 (4th coin total) -> triggers FLIP_COLUMN on col 1
    const res = engine.handleAction(state, "p2", { type: "DROP_COIN", col: 4 });
    expect(res.newState.lastTwist?.kind).toBe("FLIP_COLUMN");
    expect(res.newState.lastTwist?.targetCol).toBe(1);
    expect(res.newState.turnsSinceLastTwist).toBe(0);
    expect(res.events.some((e) => e.type === "BOARD_TWIST")).toBe(true);

    // Verify reversed stack in col 1 with no floating coins
    expect(res.newState.board[5]![1]).toBe("p2");
    expect(res.newState.board[4]![1]).toBe("p2");
    expect(res.newState.board[3]![1]).toBe("p1");
    expect(res.newState.board[2]![1]).toBeNull();

    // Immediate next move is within 2-turn cooldown -> must not flip again
    const nextRes = engine.handleAction(res.newState, "p1", {
      type: "DROP_COIN",
      col: 5,
    });
    expect(nextRes.newState.lastTwist?.nonce).toBe(1);
    expect(nextRes.newState.turnsSinceLastTwist).toBe(1);
  });

  it("skips flip when no column has mixed coin colors", () => {
    const engine = makeDeterministicEngine([0.1, 0.0]);
    const board = makeEmptyBoard();
    board[5]![0] = "p1";
    board[4]![0] = "p1";
    board[5]![2] = "p2";

    const state: Susun4State = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 1,
      scores: { p1: 0, p2: 0 },
      board,
      currentTurnPlayerId: "p2",
      moveCount: 3,
      turnsSinceLastTwist: 3,
      dropNonce: 3,
      twistNonce: 0,
      lastDrop: null,
      lastTwist: null,
      winningCells: [],
      readyForNextRound: { p1: false, p2: false },
      lastRoundSummary: null,
      winnerId: null,
    };

    const res = engine.handleAction(state, "p2", { type: "DROP_COIN", col: 2 });
    expect(res.newState.lastTwist).toBeNull();
    expect(res.events.some((e) => e.type === "BOARD_TWIST")).toBe(false);
  });

  it("awards win if a sudden twist forms 4-in-a-row for one player", () => {
    // 0.45 (< 0.55 trigger), 0.0 (picks first flippable col 3)
    const flipEngine = makeDeterministicEngine([0.45, 0.0]);
    const board = makeEmptyBoard();
    board[5]![0] = "p1";
    board[5]![1] = "p1";
    board[5]![2] = "p1";
    // Col 3 has bottom=p2, top=p1 -> flipping puts p1 at row 5 col 3!
    board[5]![3] = "p2";
    board[4]![3] = "p1";

    const state: Susun4State = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 1,
      scores: { p1: 0, p2: 0 },
      board,
      currentTurnPlayerId: "p2",
      moveCount: 5,
      turnsSinceLastTwist: 3,
      dropNonce: 5,
      twistNonce: 0,
      lastDrop: null,
      lastTwist: null,
      winningCells: [],
      readyForNextRound: { p1: false, p2: false },
      lastRoundSummary: null,
      winnerId: null,
    };

    const res = flipEngine.handleAction(state, "p2", { type: "DROP_COIN", col: 6 });
    expect(res.roundWinnerId).toBe("p1");
    expect(res.newState.phase).toBe("ROUND_END");
    expect(res.newState.lastRoundSummary?.reason).toBe("TWIST_CONNECT_4");
    expect(res.newState.scores["p1"]).toBe(1);
  });

  it("declares a round draw when a twist creates 4-in-a-row for both players simultaneously", () => {
    // 0.45 (< 0.55 trigger), 0.8 (picks col 3 out of [0,1,2,3])
    const engine = makeDeterministicEngine([0.45, 0.8]);
    const board = makeEmptyBoard();
    // p1 needs row 5 col 3; p2 needs row 4 col 3
    board[5]![0] = "p1";
    board[5]![1] = "p1";
    board[5]![2] = "p1";

    board[4]![0] = "p2";
    board[4]![1] = "p2";
    board[4]![2] = "p2";

    // Col 3 currently has row5=p2, row4=p1 -> flip reverses to row5=p1, row4=p2!
    board[5]![3] = "p2";
    board[4]![3] = "p1";

    const state: Susun4State = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 1,
      scores: { p1: 0, p2: 0 },
      board,
      currentTurnPlayerId: "p2",
      moveCount: 8,
      turnsSinceLastTwist: 3,
      dropNonce: 8,
      twistNonce: 0,
      lastDrop: null,
      lastTwist: null,
      winningCells: [],
      readyForNextRound: { p1: false, p2: false },
      lastRoundSummary: null,
      winnerId: null,
    };

    const res = engine.handleAction(state, "p2", { type: "DROP_COIN", col: 6 });
    expect(res.roundWinnerId).toBeUndefined();
    expect(res.newState.phase).toBe("ROUND_END");
    expect(res.newState.lastRoundSummary?.reason).toBe("DRAW_BOTH_CONNECT_4");
    expect(res.newState.scores).toEqual({ p1: 0, p2: 0 });
    expect(res.newState.winningCells).toHaveLength(8);
  });
});
