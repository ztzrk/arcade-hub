import { describe, expect, it } from "vitest";
import { EngineError } from "./IGameEngine.ts";
import { TebakKataEngine } from "./TebakKataEngine.ts";

function makeDeterministicEngine(values: number[]): TebakKataEngine {
  let idx = 0;
  return new TebakKataEngine(() => {
    const val = values[idx % values.length]!;
    idx += 1;
    return val;
  });
}

describe("TebakKataEngine", () => {
  it("starts in SETUP_WORDS and hides opponent word until both submit", () => {
    const engine = makeDeterministicEngine([0]);
    let state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("SETUP_WORDS");
    expect(state.roundNumber).toBe(1);

    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_WORD",
      word: "  kopi   susu ",
      clue: "Minuman",
    }).newState;

    expect(state.phase).toBe("SETUP_WORDS");

    const p2ViewBefore = engine.getViewForPlayer(state, "p2");
    expect(p2ViewBefore.opponentWordSubmitted).toBe(true);
    expect(p2ViewBefore.opponentSlots).toEqual([]);
    expect(JSON.stringify(p2ViewBefore)).not.toContain("KOPI SUSU");

    state = engine.handleAction(state, "p2", {
      type: "SUBMIT_WORD",
      word: "nasi goreng",
    }).newState;

    expect(state.phase).toBe("GUESSING");

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.opponentSlots).toHaveLength("NASI GORENG".length);
    expect(p1View.opponentSlots[4]).toEqual({ kind: "space" });
    expect(p1View.targetWordCount).toBe(2);
    expect(p1View.targetLetterCount).toBe(10);
    expect(p1View.maxHints).toBe(4);
    expect(JSON.stringify(p1View)).not.toContain("NASI GORENG");
  });

  it("rejects invalid words and duplicate guesses", () => {
    const engine = makeDeterministicEngine([0]);
    let state = engine.initState(["p1", "p2"]);

    expect(() =>
      engine.handleAction(state, "p1", { type: "SUBMIT_WORD", word: "1234" })
    ).toThrow(EngineError);

    expect(() =>
      engine.handleAction(state, "p1", { type: "SUBMIT_WORD", word: "a   " })
    ).toThrow(EngineError);

    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_WORD",
      word: "kopi",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SUBMIT_WORD",
      word: "senja",
    }).newState;

    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_GUESS",
      guess: "pagi",
    }).newState;

    expect(() =>
      engine.handleAction(state, "p1", { type: "SUBMIT_GUESS", guess: "PAGI" })
    ).toThrow(EngineError);
  });

  it("reveals one unrevealed non-space letter per hint up to maxHints", () => {
    const engine = makeDeterministicEngine([0.0, 0.5]);
    let state = engine.initState(["p1", "p2"]);

    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_WORD",
      word: "roti",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SUBMIT_WORD",
      word: "teh tarik",
    }).newState;

    // "TEH TARIK" -> 8 letters -> maxHints = 4
    let res = engine.handleAction(state, "p1", { type: "REVEAL_LETTER" });
    state = res.newState;
    expect(res.events).toEqual([
      { type: "LETTER_REVEALED", payload: { playerId: "p1" } },
    ]);

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.hintsUsed).toBe(1);
    expect(p1View.opponentSlots[0]).toEqual({ kind: "letter", char: "T" });

    // Opponent sees that p1 revealed 1 letter
    const p2View = engine.getViewForPlayer(state, "p2");
    expect(p2View.opponentProgress.hintsUsed).toBe(1);
    expect(p2View.opponentProgress.revealedIndices).toEqual([0]);

    // Exhaust remaining hints (p1 can only reveal 4 total on "TEH TARIK")
    state = engine.handleAction(state, "p1", { type: "REVEAL_LETTER" }).newState;
    state = engine.handleAction(state, "p1", { type: "REVEAL_LETTER" }).newState;
    state = engine.handleAction(state, "p1", { type: "REVEAL_LETTER" }).newState;

    expect(() =>
      engine.handleAction(state, "p1", { type: "REVEAL_LETTER" })
    ).toThrow(EngineError);
  });

  it("plays best-of-3 rounds and declares match winner at 2 round wins", () => {
    const engine = makeDeterministicEngine([0]);
    let state = engine.initState(["p1", "p2"]);

    // Round 1
    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_WORD",
      word: "bulan",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SUBMIT_WORD",
      word: "bintang",
    }).newState;

    const r1Win = engine.handleAction(state, "p1", {
      type: "SUBMIT_GUESS",
      guess: "  Bintang ",
    });
    state = r1Win.newState;
    expect(state.phase).toBe("ROUND_END");
    expect(r1Win.roundWinnerId).toBe("p1");
    expect(r1Win.matchWinnerId).toBeUndefined();
    expect(state.scores).toEqual({ p1: 1, p2: 0 });

    // Transition to Round 2 requires both players
    state = engine.handleAction(state, "p1", { type: "NEXT_ROUND" }).newState;
    expect(state.phase).toBe("ROUND_END");
    state = engine.handleAction(state, "p2", { type: "NEXT_ROUND" }).newState;
    expect(state.phase).toBe("SETUP_WORDS");
    expect(state.roundNumber).toBe(2);

    // Round 2
    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_WORD",
      word: "hujan",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SUBMIT_WORD",
      word: "pelangi",
    }).newState;

    const r2Win = engine.handleAction(state, "p1", {
      type: "SUBMIT_GUESS",
      guess: "PELANGI",
    });
    state = r2Win.newState;
    expect(state.phase).toBe("MATCH_END");
    expect(r2Win.matchWinnerId).toBe("p1");
    expect(state.winnerId).toBe("p1");
    expect(state.scores).toEqual({ p1: 2, p2: 0 });
  });
});
