import { describe, expect, it } from "vitest";
import { EngineError } from "./IGameEngine.ts";
import { TebakKarakterEngine } from "./TebakKarakterEngine.ts";

describe("TebakKarakterEngine", () => {
  it("starts in SELECT_CHARACTER and hides opponent secret character", () => {
    const engine = new TebakKarakterEngine();
    let state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("SELECT_CHARACTER");
    expect(state.roundNumber).toBe(1);

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

    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "dina",
    }).newState;

    expect(state.phase).toBe("PLAYING");
    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.mySecretCharacterId).toBe("adit");
    expect(JSON.stringify(p1View)).not.toContain("dina");
  });

  it("allows free private board elimination by either player at any time", () => {
    const engine = new TebakKarakterEngine();
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
    state = engine.handleAction(state, "p2", {
      type: "TOGGLE_ELIMINATE",
      characterId: "eko",
    }).newState;

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.myEliminatedIds).toEqual(["candra"]);
    expect(p1View.opponentRemainingCount).toBe(19);
    expect(JSON.stringify(p1View)).not.toContain("eko");

    // Toggle again restores card
    state = engine.handleAction(state, "p1", {
      type: "TOGGLE_ELIMINATE",
      characterId: "candra",
    }).newState;
    expect(engine.getViewForPlayer(state, "p1").myEliminatedIds).toEqual([]);
  });

  it("waits for both players to submit their guesses and hides first guess until reveal", () => {
    const engine = new TebakKarakterEngine();
    let state = engine.initState(["p1", "p2"]);
    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "adit",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "bela",
    }).newState;

    // p1 locks guess first (candra) -> stays in PLAYING, hidden from p2
    const lockRes = engine.handleAction(state, "p1", {
      type: "GUESS_CHARACTER",
      characterId: "candra",
    });
    state = lockRes.newState;
    expect(state.phase).toBe("PLAYING");
    expect(lockRes.roundWinnerId).toBeUndefined();
    expect(lockRes.events).toEqual([
      { type: "GUESS_LOCKED", payload: { playerId: "p1" } },
    ]);

    const p1View = engine.getViewForPlayer(state, "p1");
    expect(p1View.myGuessSubmitted).toBe(true);
    expect(p1View.myGuessCharacterId).toBe("candra");
    expect(p1View.opponentGuessSubmitted).toBe(false);

    const p2View = engine.getViewForPlayer(state, "p2");
    expect(p2View.opponentGuessSubmitted).toBe(true);
    expect(p2View.myGuessSubmitted).toBe(false);
    expect(JSON.stringify(p2View)).not.toContain("candra");

    // p1 cannot overwrite their locked guess
    expect(() =>
      engine.handleAction(state, "p1", {
        type: "GUESS_CHARACTER",
        characterId: "bela",
      })
    ).toThrow(EngineError);

    // p2 guesses correctly (adit) -> p2 wins round 1!
    const resolveRes = engine.handleAction(state, "p2", {
      type: "GUESS_CHARACTER",
      characterId: "adit",
    });
    state = resolveRes.newState;
    expect(state.phase).toBe("ROUND_END");
    expect(resolveRes.roundWinnerId).toBe("p2");
    expect(resolveRes.matchWinnerId).toBeUndefined();
    expect(state.scores).toEqual({ p1: 0, p2: 1 });
    expect(state.lastRoundSummary).toMatchObject({
      roundNumber: 1,
      winnerId: "p2",
      outcome: "WIN",
      guesses: { p1: "candra", p2: "adit" },
      secretCharacters: { p1: "adit", p2: "bela" },
    });
  });

  it("handles draw rounds (both correct or both wrong) without awarding points and resolves Best-of-3", () => {
    const engine = new TebakKarakterEngine();
    let state = engine.initState(["p1", "p2"]);

    // Round 1: both correct -> DRAW_BOTH_CORRECT, 0-0
    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "adit",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "bela",
    }).newState;
    state = engine.handleAction(state, "p1", {
      type: "GUESS_CHARACTER",
      characterId: "bela",
    }).newState;
    const drawCorrectRes = engine.handleAction(state, "p2", {
      type: "GUESS_CHARACTER",
      characterId: "adit",
    });
    state = drawCorrectRes.newState;
    expect(state.phase).toBe("ROUND_END");
    expect(drawCorrectRes.roundWinnerId).toBeUndefined();
    expect(state.scores).toEqual({ p1: 0, p2: 0 });
    expect(state.lastRoundSummary?.outcome).toBe("DRAW_BOTH_CORRECT");

    // Next round -> Round 2: both wrong -> DRAW_BOTH_WRONG, still 0-0
    state = engine.handleAction(state, "p1", { type: "NEXT_ROUND" }).newState;
    state = engine.handleAction(state, "p2", { type: "NEXT_ROUND" }).newState;
    expect(state.roundNumber).toBe(2);
    state = engine.handleAction(state, "p1", {
      type: "SELECT_CHARACTER",
      characterId: "candra",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "SELECT_CHARACTER",
      characterId: "dina",
    }).newState;
    state = engine.handleAction(state, "p1", {
      type: "GUESS_CHARACTER",
      characterId: "eko",
    }).newState;
    state = engine.handleAction(state, "p2", {
      type: "GUESS_CHARACTER",
      characterId: "fira",
    }).newState;
    expect(state.lastRoundSummary?.outcome).toBe("DRAW_BOTH_WRONG");
    expect(state.scores).toEqual({ p1: 0, p2: 0 });

    // Round 3 & Round 4: p2 wins twice -> MATCH_END
    for (let r = 0; r < 2; r++) {
      state = engine.handleAction(state, "p1", { type: "NEXT_ROUND" }).newState;
      state = engine.handleAction(state, "p2", { type: "NEXT_ROUND" }).newState;
      state = engine.handleAction(state, "p1", {
        type: "SELECT_CHARACTER",
        characterId: "raka",
      }).newState;
      state = engine.handleAction(state, "p2", {
        type: "SELECT_CHARACTER",
        characterId: "sari",
      }).newState;
      state = engine.handleAction(state, "p1", {
        type: "GUESS_CHARACTER",
        characterId: "adit", // wrong
      }).newState;
      const res = engine.handleAction(state, "p2", {
        type: "GUESS_CHARACTER",
        characterId: "raka", // correct
      });
      state = res.newState;
      if (r === 1) {
        expect(res.matchWinnerId).toBe("p2");
        expect(state.phase).toBe("MATCH_END");
        expect(state.winnerId).toBe("p2");
        expect(state.scores).toEqual({ p1: 0, p2: 2 });
      }
    }
  });
});
