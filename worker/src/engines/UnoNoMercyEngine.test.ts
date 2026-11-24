import { describe, expect, it } from "vitest";
import {
  UNO_MERCY_KO_LIMIT,
  UNO_STARTING_HAND_SIZE,
  type UnoCard,
} from "@arcade-hub/shared";
import { EngineError } from "./IGameEngine.ts";
import { UnoNoMercyEngine, type UnoState } from "./UnoNoMercyEngine.ts";

function makeDeterministicEngine(seed = 0.2): UnoNoMercyEngine {
  return new UnoNoMercyEngine(() => seed);
}

function card(
  id: string,
  color: UnoCard["color"],
  kind: UnoCard["kind"],
  value?: number
): UnoCard {
  return value !== undefined ? { id, color, kind, value } : { id, color, kind };
}

function makeTestState(overrides: Partial<UnoState> = {}): UnoState {
  return {
    playerIds: ["p1", "p2"],
    phase: "PLAYING",
    roundNumber: 1,
    scores: { p1: 0, p2: 0 },
    currentTurnPlayerId: "p1",
    hands: {
      p1: [card("c1", "RED", "NUMBER", 5), card("c2", "BLUE", "NUMBER", 3)],
      p2: [card("c3", "GREEN", "NUMBER", 5), card("c4", "YELLOW", "NUMBER", 8)],
    },
    drawPile: Array.from({ length: 20 }, (_, i) =>
      card(`d${i}`, "RED", "NUMBER", (i % 9) + 1)
    ),
    discardPile: [card("top", "RED", "NUMBER", 7)],
    activeColor: "RED",
    pendingDraw: 0,
    pendingDrawMinValue: 0,
    unoCalled: { p1: false, p2: false },
    readyForNextRound: { p1: false, p2: false },
    actionNonce: 0,
    lastAction: null,
    lastRoundSummary: null,
    winnerId: null,
    ...overrides,
  };
}

describe("UnoNoMercyEngine", () => {
  it("deals 7 cards each and starts with a plain number top card", () => {
    const engine = makeDeterministicEngine(0.1);
    const state = engine.initState(["p1", "p2"]);

    expect(state.phase).toBe("PLAYING");
    expect(state.hands["p1"]).toHaveLength(UNO_STARTING_HAND_SIZE);
    expect(state.hands["p2"]).toHaveLength(UNO_STARTING_HAND_SIZE);
    const top = state.discardPile[state.discardPile.length - 1]!;
    expect(top.kind).toBe("NUMBER");
    expect(top.value).toBeGreaterThanOrEqual(1);

    const view = engine.getViewForPlayer(state, "p1");
    expect(view.myHand).toHaveLength(UNO_STARTING_HAND_SIZE);
    expect(view.opponentCardCount).toBe(UNO_STARTING_HAND_SIZE);
  });

  it("handles SKIP and REVERSE in 1v1 as play-again turns", () => {
    const engine = makeDeterministicEngine();
    const state = makeTestState({
      hands: {
        p1: [
          card("s1", "RED", "SKIP"),
          card("r1", "RED", "REVERSE"),
          card("n1", "RED", "NUMBER", 2),
        ],
        p2: [card("o1", "BLUE", "NUMBER", 9)],
      },
    });

    const afterSkip = engine.handleAction(state, "p1", {
      type: "PLAY_CARD",
      cardId: "s1",
    });
    expect(afterSkip.newState.currentTurnPlayerId).toBe("p1");

    const afterRev = engine.handleAction(afterSkip.newState, "p1", {
      type: "PLAY_CARD",
      cardId: "r1",
    });
    expect(afterRev.newState.currentTurnPlayerId).toBe("p1");
  });

  it("supports No Mercy draw stacking (+2 -> +4 -> +6) and triggers Mercy KO at 20 cards", () => {
    const engine = makeDeterministicEngine();
    const bigHand = Array.from({ length: 10 }, (_, i) =>
      card(`x${i}`, "YELLOW", "NUMBER", (i % 9) + 1)
    );
    const state = makeTestState({
      hands: {
        p1: [
          card("p2a", "RED", "DRAW_2"),
          card("p6a", "WILD", "WILD_DRAW_6"),
          card("keep", "BLUE", "NUMBER", 1),
        ],
        p2: [card("p4a", "WILD", "WILD_DRAW_4"), ...bigHand],
      },
    });

    // p1 plays +2
    const r1 = engine.handleAction(state, "p1", {
      type: "PLAY_CARD",
      cardId: "p2a",
    });
    expect(r1.newState.pendingDraw).toBe(2);
    expect(r1.newState.pendingDrawMinValue).toBe(2);
    expect(r1.newState.currentTurnPlayerId).toBe("p2");

    // p2 cannot play regular yellow number on pendingDraw
    expect(() =>
      engine.handleAction(r1.newState, "p2", {
        type: "PLAY_CARD",
        cardId: "x0",
      })
    ).toThrow(EngineError);

    // p2 stacks Wild +4 -> total +6
    const r2 = engine.handleAction(r1.newState, "p2", {
      type: "PLAY_CARD",
      cardId: "p4a",
      chosenColor: "BLUE",
    });
    expect(r2.newState.pendingDraw).toBe(6);
    expect(r2.newState.pendingDrawMinValue).toBe(4);
    expect(r2.newState.activeColor).toBe("BLUE");

    // p1 stacks Wild +6 -> total +12!
    const r3 = engine.handleAction(r2.newState, "p1", {
      type: "PLAY_CARD",
      cardId: "p6a",
      chosenColor: "GREEN",
    });
    expect(r3.newState.pendingDraw).toBe(12);
    expect(r3.newState.pendingDrawMinValue).toBe(6);

    // p2 accepts draw: 10 + 12 = 22 >= 20 -> Mercy KO! p1 wins round!
    const ko = engine.handleAction(r3.newState, "p2", {
      type: "ACCEPT_DRAW",
    });
    expect(ko.roundWinnerId).toBe("p1");
    expect(ko.newState.phase).toBe("ROUND_END");
    expect(ko.newState.lastRoundSummary?.reason).toBe("MERCY_KO");
    expect(ko.newState.hands["p2"]!.length).toBeGreaterThanOrEqual(
      UNO_MERCY_KO_LIMIT
    );
  });

  it("swaps hands on 0 unless 0 is the winning last card", () => {
    const engine = makeDeterministicEngine();
    const state = makeTestState({
      hands: {
        p1: [card("z1", "RED", "NUMBER", 0), card("k1", "BLUE", "NUMBER", 9)],
        p2: [
          card("o1", "GREEN", "NUMBER", 1),
          card("o2", "GREEN", "NUMBER", 2),
          card("o3", "GREEN", "NUMBER", 3),
        ],
      },
    });

    const swapped = engine.handleAction(state, "p1", {
      type: "PLAY_CARD",
      cardId: "z1",
    });
    expect(swapped.newState.hands["p1"]).toHaveLength(3);
    expect(swapped.newState.hands["p2"]).toHaveLength(1);
    expect(swapped.newState.hands["p2"]![0]!.id).toBe("k1");

    // Playing 0 as last card wins immediately without swapping
    const winState = makeTestState({
      hands: {
        p1: [card("z_last", "RED", "NUMBER", 0)],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
    });
    const won = engine.handleAction(winState, "p1", {
      type: "PLAY_CARD",
      cardId: "z_last",
    });
    expect(won.roundWinnerId).toBe("p1");
    expect(won.newState.phase).toBe("ROUND_END");
    expect(won.newState.lastRoundSummary?.reason).toBe("EMPTY_HAND");
  });

  it("discards all cards of the matching color on DISCARD_ALL", () => {
    const engine = makeDeterministicEngine();
    const state = makeTestState({
      hands: {
        p1: [
          card("da", "RED", "DISCARD_ALL"),
          card("r1", "RED", "NUMBER", 2),
          card("r2", "RED", "NUMBER", 9),
          card("b1", "BLUE", "NUMBER", 4),
        ],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
    });

    const res = engine.handleAction(state, "p1", {
      type: "PLAY_CARD",
      cardId: "da",
    });
    expect(res.newState.hands["p1"]).toHaveLength(1);
    expect(res.newState.hands["p1"]![0]!.id).toBe("b1");
    expect(res.newState.lastAction?.discardedCount).toBe(3);
  });

  it("enforces UNO call and allows opponent to catch forgotten UNO for +2 penalty", () => {
    const engine = makeDeterministicEngine();
    const state = makeTestState({
      hands: {
        p1: [card("r1", "RED", "NUMBER", 2), card("b1", "BLUE", "NUMBER", 8)],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
    });

    // p1 plays down to 1 card without calling UNO
    const played = engine.handleAction(state, "p1", {
      type: "PLAY_CARD",
      cardId: "r1",
    });
    expect(played.newState.hands["p1"]).toHaveLength(1);
    const p2View = engine.getViewForPlayer(played.newState, "p2");
    expect(p2View.canCatchOpponent).toBe(true);

    // p2 catches p1 -> p1 draws 2 penalty cards
    const caught = engine.handleAction(played.newState, "p2", {
      type: "CATCH_UNO",
    });
    expect(caught.newState.hands["p1"]).toHaveLength(3);

    // Pre-calling UNO when at 2 cards protects p1 after playing down to 1 card
    const preCallState = makeTestState({
      hands: {
        p1: [card("r1", "RED", "NUMBER", 2), card("b1", "BLUE", "NUMBER", 8)],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
    });
    const called = engine.handleAction(preCallState, "p1", {
      type: "CALL_UNO",
    });
    const safePlay = engine.handleAction(called.newState, "p1", {
      type: "PLAY_CARD",
      cardId: "r1",
    });
    expect(() =>
      engine.handleAction(safePlay.newState, "p2", { type: "CATCH_UNO" })
    ).toThrow(EngineError);
  });

  it("allows drawing freely on turn, requires playing a card to finish turn, and progresses Best-of-3 to match win", () => {
    const engine = makeDeterministicEngine();
    // p1 already has a playable RED card, and can still draw freely if desired
    const hasPlayableState = makeTestState({
      hands: {
        p1: [card("r1", "RED", "NUMBER", 2)],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
      drawPile: [card("d0", "YELLOW", "NUMBER", 3)],
    });
    const extraDraw = engine.handleAction(hasPlayableState, "p1", {
      type: "DRAW_CARD",
    });
    expect(extraDraw.newState.currentTurnPlayerId).toBe("p1");
    expect(extraDraw.newState.hands["p1"]).toHaveLength(2);

    const state = makeTestState({
      scores: { p1: 1, p2: 0 },
      hands: {
        p1: [card("b1", "BLUE", "NUMBER", 9)],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
      // Popped from end: first d2 (YELLOW 3 - unplayable), then d1 (RED 4 - playable!)
      drawPile: [
        card("d0", "GREEN", "NUMBER", 2),
        card("d1", "RED", "NUMBER", 4),
        card("d2", "YELLOW", "NUMBER", 3),
      ],
    });

    const firstDraw = engine.handleAction(state, "p1", { type: "DRAW_CARD" });
    expect(firstDraw.newState.currentTurnPlayerId).toBe("p1");
    expect(firstDraw.newState.hands["p1"]).toHaveLength(2);
    expect(engine.getViewForPlayer(firstDraw.newState, "p1").playableCardIds).toEqual([]);

    // Still no playable card -> must draw again
    const secondDraw = engine.handleAction(firstDraw.newState, "p1", {
      type: "DRAW_CARD",
    });
    expect(secondDraw.newState.currentTurnPlayerId).toBe("p1");
    expect(secondDraw.newState.hands["p1"]).toHaveLength(3);
    expect(engine.getViewForPlayer(secondDraw.newState, "p1").playableCardIds).toEqual([
      "d1",
    ]);

    // Now p1 plays the drawn RED 4 and passes turn
    const playedDrawn = engine.handleAction(secondDraw.newState, "p1", {
      type: "PLAY_CARD",
      cardId: "d1",
    });
    expect(playedDrawn.newState.currentTurnPlayerId).toBe("p2");

    // p1 wins final round to reach 2/2 match win
    const matchPoint = makeTestState({
      scores: { p1: 1, p2: 0 },
      hands: {
        p1: [card("win", "RED", "NUMBER", 7)],
        p2: [card("o1", "GREEN", "NUMBER", 1)],
      },
    });
    const matchWon = engine.handleAction(matchPoint, "p1", {
      type: "PLAY_CARD",
      cardId: "win",
    });
    expect(matchWon.matchWinnerId).toBe("p1");
    expect(matchWon.newState.phase).toBe("MATCH_END");
    expect(matchWon.newState.winnerId).toBe("p1");
  });
});
