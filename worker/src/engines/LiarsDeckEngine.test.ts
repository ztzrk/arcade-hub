import { describe, expect, it } from "vitest";
import { EngineError } from "./IGameEngine.ts";
import { LiarsDeckEngine, type LiarsDeckState } from "./LiarsDeckEngine.ts";

function makeDeterministicEngine(values: number[]): LiarsDeckEngine {
  let idx = 0;
  return new LiarsDeckEngine(() => {
    const val = values[idx % values.length]!;
    idx += 1;
    return val;
  });
}

describe("LiarsDeckEngine", () => {
  it("initializes 5 cards per player, valid table card, and hidden revolvers", () => {
    const engine = makeDeterministicEngine([0.1, 0.4, 0.7, 0.2, 0.8]);
    const state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("PLAYING");
    expect(state.roundNumber).toBe(1);
    expect(state.hands["p1"]).toHaveLength(5);
    expect(state.hands["p2"]).toHaveLength(5);
    expect(["KING", "QUEEN", "ACE"]).toContain(state.tableCard);
    expect(state.revolvers["p1"]!.shotsFired).toBe(0);
    expect(state.revolvers["p2"]!.shotsFired).toBe(0);
    expect(state.revolvers["p1"]!.bulletPosition).toBeGreaterThanOrEqual(0);
    expect(state.revolvers["p1"]!.bulletPosition).toBeLessThan(6);
  });

  it("never leaks opponent cards, lastPlay ranks, or bulletPosition in getViewForPlayer", () => {
    const engine = makeDeterministicEngine([0.3, 0.6, 0.1]);
    let state = engine.initState(["p1", "p2"]);
    const starter = state.currentTurnPlayerId;
    const other = starter === "p1" ? "p2" : "p1";

    const playResult = engine.handleAction(state, starter, {
      type: "PLAY_CARDS",
      cardIndices: [0, 1],
    });
    state = playResult.newState;

    const otherView = engine.getViewForPlayer(state, other);
    expect(otherView.myHand).toEqual(state.hands[other]);
    expect(otherView.opponentCardCount).toBe(3);
    expect(otherView.lastPlay).toEqual({ playerId: starter, count: 2 });
    expect(otherView.canCallLiar).toBe(true);
    expect(otherView.pendingReveal).toBeNull();

    const serialized = JSON.stringify(otherView);
    expect(serialized).not.toContain("bulletPosition");
  });

  it("treats JOKER as a wild card when evaluating honest plays", () => {
    const engine = makeDeterministicEngine([0.5]);
    const state: LiarsDeckState = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 1,
      tableCard: "KING",
      hands: {
        p1: ["KING", "JOKER", "ACE", "QUEEN", "KING"],
        p2: ["ACE", "ACE", "QUEEN", "KING", "KING"],
      },
      currentTurnPlayerId: "p1",
      lastPlay: null,
      rouletteTargetId: null,
      pendingReveal: null,
      lastOutcome: null,
      outcomeCounter: 0,
      revolvers: {
        p1: { bulletPosition: 4, shotsFired: 0 },
        p2: { bulletPosition: 2, shotsFired: 0 },
      },
      winnerId: null,
    };

    const s1 = engine.handleAction(state, "p1", {
      type: "PLAY_CARDS",
      cardIndices: [0, 1], // KING + JOKER -> honest!
    }).newState;

    const s2 = engine.handleAction(s1, "p2", { type: "CALL_LIAR" }).newState;
    expect(s2.phase).toBe("ROULETTE");
    expect(s2.pendingReveal?.wasLie).toBe(false);
    expect(s2.rouletteTargetId).toBe("p2"); // Challenger lied-called on honest play
  });

  it("targets accused player when a lie is caught", () => {
    const engine = makeDeterministicEngine([0.5]);
    const state: LiarsDeckState = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 1,
      tableCard: "ACE",
      hands: {
        p1: ["KING", "ACE", "QUEEN", "ACE", "ACE"],
        p2: ["ACE", "QUEEN", "KING", "QUEEN", "KING"],
      },
      currentTurnPlayerId: "p1",
      lastPlay: null,
      rouletteTargetId: null,
      pendingReveal: null,
      lastOutcome: null,
      outcomeCounter: 0,
      revolvers: {
        p1: { bulletPosition: 0, shotsFired: 0 },
        p2: { bulletPosition: 5, shotsFired: 0 },
      },
      winnerId: null,
    };

    const s1 = engine.handleAction(state, "p1", {
      type: "PLAY_CARDS",
      cardIndices: [0, 1], // KING + ACE -> lie!
    }).newState;

    const s2 = engine.handleAction(s1, "p2", { type: "CALL_LIAR" }).newState;
    expect(s2.phase).toBe("ROULETTE");
    expect(s2.pendingReveal?.wasLie).toBe(true);
    expect(s2.rouletteTargetId).toBe("p1");

    // p1 pulls trigger and hits chamber 0 (bulletPosition = 0)
    const s3 = engine.handleAction(s2, "p1", { type: "PULL_TRIGGER" });
    expect(s3.matchWinnerId).toBe("p2");
    expect(s3.newState.phase).toBe("MATCH_END");
    expect(s3.newState.winnerId).toBe("p2");
    expect(s3.newState.lastOutcome?.hit).toBe(true);
  });

  it("lets opponent choose CALL_LIAR or ACCEPT_ROUND when a player empties their hand", () => {
    const engine = makeDeterministicEngine([0.2, 0.8]);
    const state: LiarsDeckState = {
      playerIds: ["p1", "p2"],
      phase: "PLAYING",
      roundNumber: 2,
      tableCard: "QUEEN",
      hands: {
        p1: ["QUEEN", "JOKER"],
        p2: ["ACE", "KING"],
      },
      currentTurnPlayerId: "p1",
      lastPlay: null,
      rouletteTargetId: null,
      pendingReveal: null,
      lastOutcome: null,
      outcomeCounter: 1,
      revolvers: {
        p1: { bulletPosition: 5, shotsFired: 1 },
        p2: { bulletPosition: 3, shotsFired: 0 },
      },
      winnerId: null,
    };

    // p1 plays their remaining 2 cards; stays in PLAYING so p2 can choose
    const res = engine.handleAction(state, "p1", {
      type: "PLAY_CARDS",
      cardIndices: [0, 1],
    });

    expect(res.newState.phase).toBe("PLAYING");
    expect(res.newState.currentTurnPlayerId).toBe("p2");

    const p2View = engine.getViewForPlayer(res.newState, "p2");
    expect(p2View.canPlayCards).toBe(false);
    expect(p2View.canCallLiar).toBe(true);
    expect(p2View.canAcceptRound).toBe(true);

    // p2 cannot play cards when p1 has 0 cards
    expect(() =>
      engine.handleAction(res.newState, "p2", { type: "PLAY_CARDS", cardIndices: [0] })
    ).toThrowError(EngineError);

    // Option A: p2 accepts and starts a new round with no revolver pull
    const acceptRes = engine.handleAction(res.newState, "p2", { type: "ACCEPT_ROUND" });
    expect(acceptRes.newState.phase).toBe("PLAYING");
    expect(acceptRes.newState.roundNumber).toBe(3);
    expect(acceptRes.newState.currentTurnPlayerId).toBe("p2");
    expect(acceptRes.newState.revolvers["p1"]?.shotsFired).toBe(1);
    expect(acceptRes.newState.revolvers["p2"]?.shotsFired).toBe(0);
    expect(acceptRes.newState.hands["p1"]).toHaveLength(5);
    expect(acceptRes.newState.hands["p2"]).toHaveLength(5);

    // Option B: p2 calls liar on the empty hand play
    const callRes = engine.handleAction(res.newState, "p2", { type: "CALL_LIAR" });
    expect(callRes.newState.phase).toBe("ROULETTE");
    expect(callRes.newState.rouletteTargetId).toBe("p2");

    const pullRes = engine.handleAction(callRes.newState, "p2", { type: "PULL_TRIGGER" });
    expect(pullRes.matchWinnerId).toBeUndefined();
    expect(pullRes.newState.phase).toBe("PLAYING");
    expect(pullRes.newState.roundNumber).toBe(3);
    expect(pullRes.newState.revolvers["p2"]?.shotsFired).toBe(1);
    expect(pullRes.newState.lastOutcome?.hit).toBe(false);
  });

  it("rejects invalid turns, duplicate indices, >3 cards, and premature CALL_LIAR", () => {
    const engine = makeDeterministicEngine([0.1]);
    const state = engine.initState(["p1", "p2"]);
    const starter = state.currentTurnPlayerId;
    const other = starter === "p1" ? "p2" : "p1";

    expect(() =>
      engine.handleAction(state, other, { type: "PLAY_CARDS", cardIndices: [0] })
    ).toThrowError(EngineError);

    expect(() =>
      engine.handleAction(state, starter, { type: "CALL_LIAR" })
    ).toThrowError(EngineError);

    expect(() =>
      engine.handleAction(state, starter, {
        type: "PLAY_CARDS",
        cardIndices: [0, 0],
      })
    ).toThrowError(EngineError);

    expect(() =>
      engine.handleAction(state, starter, {
        type: "PLAY_CARDS",
        cardIndices: [0, 1, 2, 3],
      })
    ).toThrowError(EngineError);
  });
});
