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
    expect(p1View.canRevealLetter).toBe(true);
    expect(p1View.myWordLettersTotal).toBe(8);
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

  it("allows word owner to reveal unlimited random letters of their own word to opponent until all are open", () => {
    const engine = makeDeterministicEngine([0.0, 0.5]);
    let state = engine.initState(["p1", "p2"]);

    state = engine.handleAction(state, "p1", {
      type: "SUBMIT_WORD",
      word: "roti",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SUBMIT_WORD",
      word: "kapal api",
    }).newState;

    // p2 (word owner of "KAPAL API", 8 letters) reveals 1 random letter to p1
    let res = engine.handleAction(state, "p2", { type: "REVEAL_LETTER" });
    state = res.newState;
    expect(res.events).toEqual([
      {
        type: "LETTER_REVEALED",
        payload: { ownerId: "p2", guesserId: "p1" },
      },
    ]);

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.hintsUsed).toBe(1);
    expect(p1View.opponentSlots[0]).toEqual({ kind: "letter", char: "K" });

    // p2 sees that 1/8 letters of p2's word is revealed to p1
    const p2View = engine.getViewForPlayer(state, "p2");
    expect(p2View.myWordLettersRevealed).toBe(1);
    expect(p2View.myWordLettersTotal).toBe(8);
    expect(p2View.canRevealLetter).toBe(true);
    expect(p2View.opponentProgress.hintsUsed).toBe(1);
    expect(p2View.opponentProgress.revealedIndices).toEqual([0]);

    // p2 can continue revealing all remaining 7 letters with no limit
    for (let i = 0; i < 7; i++) {
      state = engine.handleAction(state, "p2", { type: "REVEAL_LETTER" }).newState;
    }

    const p2ViewAfterAll = engine.getViewForPlayer(state, "p2");
    expect(p2ViewAfterAll.canRevealLetter).toBe(false);
    expect(p2ViewAfterAll.myWordLettersRevealed).toBe(8);

    const p1ViewAfterAll = engine.getViewForPlayer(state, "p1");
    expect(
      p1ViewAfterAll.opponentSlots.filter((s) => s.kind === "blank")
    ).toHaveLength(0);

    // Once all letters are revealed, another REVEAL_LETTER throws
    expect(() =>
      engine.handleAction(state, "p2", { type: "REVEAL_LETTER" })
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
