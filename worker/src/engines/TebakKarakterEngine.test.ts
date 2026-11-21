import { describe, expect, it } from "vitest";
import { EngineError } from "./IGameEngine.ts";
import { TebakKarakterEngine } from "./TebakKarakterEngine.ts";

function makeDeterministicEngine(values: number[]): TebakKarakterEngine {
  let idx = 0;
  return new TebakKarakterEngine(() => {
    const val = values[idx % values.length]!;
    idx += 1;
    return val;
  });
}

describe("TebakKarakterEngine", () => {
  it("starts in SELECT_CHARACTER and hides opponent secret character", () => {
    const engine = makeDeterministicEngine([0.1]); // p1 starts
    let state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("SELECT_CHARACTER");
    expect(state.roundNumber).toBe(1);
    expect(state.currentTurnPlayerId).toBe("p1");

    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "adit",
    }).newState;

    expect(state.phase).toBe("SELECT_CHARACTER");

    const p2ViewBefore = engine.getViewForPlayer(state, "p2");
    expect(p2ViewBefore.opponentCharacterSelected).toBe(true);
    expect(p2ViewBefore.myCharacterSelected).toBe(false);
    expect(JSON.stringify(p2ViewBefore)).not.toContain("adit");

    expect(() =>
      engine.handleAction(state, "p1", {
        type: "SELECT_CHARACTER",
        characterId: "bela",
      })
    ).toThrow(EngineError);

    expect(() =>
      engine.handleAction(state, "p2", {
        type: "SELECT_CHARACTER",
        characterId: "unknown-char",
      })
    ).toThrow(EngineError);

    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "dina",
    }).newState;

    expect(state.phase).toBe("PLAYING");
    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.mySecretCharacterId).toBe("adit");
    expect(JSON.stringify(p1View)).not.toContain("dina");
  });

  it("handles free-text Q&A flow and alternates turns cleanly", () => {
    const engine = makeDeterministicEngine([0.1]); // p1 starts
    let state = engine.initState(["p1", "p2"]);
    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "adit",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "bela",
    }).newState;

    // p2 cannot ask out of turn
    expect(() =>
      engine.handleAction(state, "p2", {
        type: "ASK_QUESTION",
        question: "Pakai kacamata?",
      })
    ).toThrow(EngineError);

    // Invalid empty/too-short question rejected
    expect(() =>
      engine.handleAction(state, "p1", {
        type: "ASK_QUESTION",
        question: "a",
      })
    ).toThrow(EngineError);

    // p1 asks question
    state = engine.handleAction(state, "p1", {
      type: "ASK_QUESTION",
      question: "  Apakah   dia pakai kacamata? ",
    }).newState;

    expect(state.turnStage).toBe("ANSWER_QUESTION");
    expect(state.pendingQuestion?.question).toBe("Apakah dia pakai kacamata?");

    // p1 cannot answer their own question
    expect(() =>
      engine.handleAction(state, "p1", {
        type: "ANSWER_QUESTION",
        answer: "YES",
      })
    ).toThrow(EngineError);

    // p2 answers YES -> turn passes to p2
    state = engine.handleAction(state, "p2", {
      type: "ANSWER_QUESTION",
      answer: "YES",
    }).newState;

    expect(state.turnStage).toBe("ASK_OR_GUESS");
    expect(state.pendingQuestion).toBeNull();
    expect(state.currentTurnPlayerId).toBe("p2");
    expect(state.qaHistory).toHaveLength(1);
    expect(state.qaHistory[0]).toMatchObject({
      askerId: "p1",
      answererId: "p2",
      question: "Apakah dia pakai kacamata?",
      answer: "YES",
    });
  });

  it("allows private manual card elimination without leaking IDs to opponent", () => {
    const engine = makeDeterministicEngine([0.1]);
    let state = engine.initState(["p1", "p2"]);
    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "adit",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "bela",
    }).newState;

    state = engine.handleAction(state, "p1", {
      type: "TOGGLE_ELIMINATE",
      characterId: "candra",
    }).newState;
    state = engine.handleAction(state, "p1", {
      type: "TOGGLE_ELIMINATE",
      characterId: "eko",
    }).newState;

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.myEliminatedIds).toEqual(["candra", "eko"]);

    const p2View = engine.getViewForPlayer(state, "p2");
    expect(p2View.opponentRemainingCount).toBe(18);
    expect(p2View.myEliminatedIds).toEqual([]);
    expect(JSON.stringify(p2View)).not.toContain("candra");

    // Toggle again restores card
    state = engine.handleAction(state, "p1", {
      type: "TOGGLE_ELIMINATE",
      characterId: "candra",
    }).newState;
    expect(engine.getViewForPlayer(state, "p1").myEliminatedIds).toEqual(["eko"]);
  });

  it("awards round to opponent on wrong guess and handles Best-of-3 to MATCH_END", () => {
    const engine = makeDeterministicEngine([0.1]); // Round 1 starter: p1
    let state = engine.initState(["p1", "p2"]);
    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "adit",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "bela",
    }).newState;

    // p1 guesses wrong -> p2 wins round 1!
    const wrongRes = engine.handleAction(state, "p1", {
      type: "GUESS_CHARACTER",
      characterId: "fira",
    });
    state = wrongRes.newState;
    expect(wrongRes.roundWinnerId).toBe("p2");
    expect(wrongRes.matchWinnerId).toBeUndefined();
    expect(state.phase).toBe("ROUND_END");
    expect(state.scores).toEqual({ p1: 0, p2: 1 });
    expect(state.lastRoundSummary).toMatchObject({
      roundNumber: 1,
      winnerId: "p2",
      guesserId: "p1",
      guessedCharacterId: "fira",
      reason: "WRONG_GUESS",
      secretCharacters: { p1: "adit", p2: "bela" },
    });

    // Both ready for round 2 -> starter alternates to p2
    state = engine.handleAction(state, "p1", { type: "NEXT_ROUND" }).newState;
    expect(state.phase).toBe("ROUND_END");
    state = engine.handleAction(state, "p2", { type: "NEXT_ROUND" }).newState;
    expect(state.phase).toBe("SELECT_CHARACTER");
    expect(state.roundNumber).toBe(2);
    expect(state.currentTurnPlayerId).toBe("p2");

    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "raka",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "sari",
    }).newState;

    // p2 guesses correctly -> p2 wins match 2-0!
    const winRes = engine.handleAction(state, "p2", {
      type: "GUESS_CHARACTER",
      characterId: "raka",
    });
    state = winRes.newState;
    expect(winRes.roundWinnerId).toBe("p2");
    expect(winRes.matchWinnerId).toBe("p2");
    expect(state.phase).toBe("MATCH_END");
    expect(state.winnerId).toBe("p2");
    expect(state.scores).toEqual({ p1: 0, p2: 2 });
    expect(state.lastRoundSummary?.reason).toBe("CORRECT_GUESS");
  });
});
