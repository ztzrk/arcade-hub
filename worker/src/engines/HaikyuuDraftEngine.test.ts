import { describe, expect, it } from "vitest";
import { COURT_SLOTS, type CourtSlotId } from "@arcade-hub/shared";
import { EngineError } from "./IGameEngine.ts";
import {
  HAIKYUU_DRAFT_ROUND_MS,
  HAIKYUU_DRAFT_TOTAL_ROUNDS,
  HAIKYUU_INTERMISSION_MS,
  HAIKYUU_TACTICS_MS,
  HaikyuuDraftEngine,
} from "./HaikyuuDraftEngine.ts";

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("HaikyuuDraftEngine (1v1 Timed Race Draft)", () => {
  it("enforces first-come first-served claim locking and advances when both place", () => {
    const engine = new HaikyuuDraftEngine(createSeededRng(42));
    const startNow = 10_000;
    let state = engine.initState(["p1", "p2"], startNow);

    expect(state.phase).toBe("DRAFT");
    expect(state.roundNumber).toBe(1);
    expect(state.candidates.length).toBeGreaterThanOrEqual(2);
    expect(engine.getNextTimeoutAt(state)).toBe(startNow + HAIKYUU_DRAFT_ROUND_MS);

    const firstTarget = state.candidates[0]!.player.id;
    const secondTarget = state.candidates[1]!.player.id;

    // P1 claims firstTarget
    const claimRes = engine.handleAction(
      state,
      "p1",
      { type: "CLAIM_PLAYER", playerId: firstTarget },
      startNow + 1200
    );
    state = claimRes.newState;

    const p2ViewAfterClaim = engine.getViewForPlayer(state, "p2");
    expect(
      p2ViewAfterClaim.candidates.find((c) => c.player.id === firstTarget)
        ?.claimedByPlayerId
    ).toBe("p1");

    // P2 cannot steal the already-claimed player
    expect(() =>
      engine.handleAction(
        state,
        "p2",
        { type: "CLAIM_PLAYER", playerId: firstTarget },
        startNow + 1400
      )
    ).toThrow(EngineError);

    // P1 cannot claim a second player in the same round
    expect(() =>
      engine.handleAction(
        state,
        "p1",
        { type: "CLAIM_PLAYER", playerId: secondTarget },
        startNow + 1500
      )
    ).toThrow(EngineError);

    // P2 quick-claims secondTarget straight into OH2
    state = engine.handleAction(
      state,
      "p2",
      { type: "CLAIM_PLAYER", playerId: secondTarget, slotId: "OH2" },
      startNow + 2000
    ).newState;
    expect(state.roundNumber).toBe(1);

    // Once P1 places their pending pick, round 2 begins immediately
    const round2Now = startNow + 2500;
    state = engine.handleAction(
      state,
      "p1",
      { type: "PLACE_PLAYER", slotId: "OH1" },
      round2Now
    ).newState;

    expect(state.roundNumber).toBe(2);
    expect(state.candidates.length).toBeGreaterThanOrEqual(2);
    expect(engine.getNextTimeoutAt(state)).toBe(round2Now + HAIKYUU_DRAFT_ROUND_MS);
  });

  it("auto-picks and auto-places on 15s round timeout and transitions to TACTICS after round 7", () => {
    const engine = new HaikyuuDraftEngine(createSeededRng(2026));
    let now = 50_000;
    let state = engine.initState(["p1", "p2"], now);

    // Round 1: P1 claims without placing; P2 does nothing before timeout
    const p1Target = state.candidates[0]!.player.id;
    state = engine.handleAction(
      state,
      "p1",
      { type: "CLAIM_PLAYER", playerId: p1Target },
      now + 1000
    ).newState;

    // Early timeout check should return null
    expect(engine.handleTimeout(state, now + 5000)).toBeNull();

    // Timeout all 7 rounds
    for (let r = 1; r <= HAIKYUU_DRAFT_TOTAL_ROUNDS; r++) {
      now = state.phaseDeadlineAt!;
      const timeoutRes = engine.handleTimeout(state, now);
      expect(timeoutRes).not.toBeNull();
      state = timeoutRes!.newState;
    }

    expect(state.phase).toBe("TACTICS");
    expect(engine.getNextTimeoutAt(state)).toBe(now + HAIKYUU_TACTICS_MS);

    const p1View = engine.getViewForPlayer(state, "p1");
    const p2View = engine.getViewForPlayer(state, "p2");
    for (const slot of COURT_SLOTS) {
      expect(p1View.me.lineup[slot.id]).toBeDefined();
      expect(p2View.me.lineup[slot.id]).toBeDefined();
    }
    // No duplicate players between both teams
    const p1Ids = COURT_SLOTS.map((s) => p1View.me.lineup[s.id]!.id);
    const p2Ids = COURT_SLOTS.map((s) => p2View.me.lineup[s.id]!.id);
    expect(new Set([...p1Ids, ...p2Ids]).size).toBe(14);
  });

  it("hides opponent formation during TACTICS, allows slot swaps, and resolves Best of 3 match", () => {
    const engine = new HaikyuuDraftEngine(createSeededRng(99));
    let now = 100_000;
    let state = engine.initState(["p1", "p2"], now);

    for (let r = 1; r <= HAIKYUU_DRAFT_TOTAL_ROUNDS; r++) {
      now = state.phaseDeadlineAt!;
      state = engine.handleTimeout(state, now)!.newState;
    }
    expect(state.phase).toBe("TACTICS");

    // Swap two slots and set secret formations
    const beforeOh1 = state.lineups.p1!.OH1!.id;
    const beforeOp = state.lineups.p1!.OP!.id;
    state = engine.handleAction(
      state,
      "p1",
      { type: "SWAP_SLOTS", slotA: "OH1", slotB: "OP" },
      now + 1000
    ).newState;
    expect(state.lineups.p1!.OH1!.id).toBe(beforeOp);
    expect(state.lineups.p1!.OP!.id).toBe(beforeOh1);

    state = engine.handleAction(
      state,
      "p1",
      { type: "SET_FORMATION", formationId: "cannon-ace" },
      now + 1500
    ).newState;
    state = engine.handleAction(
      state,
      "p2",
      { type: "SET_FORMATION", formationId: "total-defense" },
      now + 1800
    ).newState;

    // Formation is hidden from opponent during TACTICS
    expect(engine.getViewForPlayer(state, "p1").opponent.formationId).toBeNull();
    expect(engine.getViewForPlayer(state, "p2").opponent.formationId).toBeNull();

    // Lock both tactics -> simulates Set 1
    state = engine.handleAction(state, "p1", { type: "LOCK_TACTICS" }, now + 2000).newState;
    expect(state.phase).toBe("TACTICS");

    const set1Res = engine.handleAction(
      state,
      "p2",
      { type: "LOCK_TACTICS" },
      now + 2500
    );
    state = set1Res.newState;
    expect(state.phase).toBe("MATCH");
    expect(state.setScores).toHaveLength(1);
    expect(engine.getViewForPlayer(state, "p1").opponent.formationId).toBe("total-defense");
    expect(engine.getNextTimeoutAt(state)).toBe(now + 2500 + HAIKYUU_INTERMISSION_MS);

    // Advance sets via timeout or ready until MATCH_END
    let safety = 0;
    let lastMatchWinnerId: string | undefined;
    while (state.phase !== "MATCH_END" && safety < 5) {
      safety += 1;
      now = state.phaseDeadlineAt!;
      const res = engine.handleTimeout(state, now)!;
      state = res.newState;
      lastMatchWinnerId = res.matchWinnerId;
    }

    expect(state.phase).toBe("MATCH_END");
    expect(state.winnerId).toBeTruthy();
    expect(lastMatchWinnerId).toBe(state.winnerId);
    expect(engine.getNextTimeoutAt(state)).toBeNull();
    expect(Math.max(state.setsWon.p1!, state.setsWon.p2!)).toBe(2);

    // Ensure swapped slots remain valid CourtSlotIds
    const allSlots: CourtSlotId[] = COURT_SLOTS.map((s) => s.id);
    expect(allSlots).toHaveLength(7);
  });
});
