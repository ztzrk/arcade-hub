import {
  UNO_COLORS,
  UNO_MERCY_KO_LIMIT,
  UNO_STARTING_HAND_SIZE,
  UNO_TARGET_WINS,
  formatUnoCardLabel,
  getUnoDrawValue,
  isUnoCardPlayable,
  type GameEvent,
  type UnoAction,
  type UnoCard,
  type UnoCardColor,
  type UnoColor,
  type UnoLastAction,
  type UnoPhase,
  type UnoRoundEndReason,
  type UnoRoundSummary,
  type UnoView,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

export interface UnoState {
  playerIds: [string, string];
  phase: UnoPhase;
  roundNumber: number;
  scores: Record<string, number>;
  currentTurnPlayerId: string;
  hands: Record<string, UnoCard[]>;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  activeColor: UnoColor;
  pendingDraw: number;
  pendingDrawMinValue: number;
  unoCalled: Record<string, boolean>;
  readyForNextRound: Record<string, boolean>;
  actionNonce: number;
  lastAction: UnoLastAction | null;
  lastRoundSummary: UnoRoundSummary | null;
  winnerId: string | null;
}

const COLOR_SORT_ORDER: Record<UnoCardColor, number> = {
  RED: 0,
  YELLOW: 1,
  GREEN: 2,
  BLUE: 3,
  WILD: 4,
};

const KIND_SORT_ORDER: Record<UnoCard["kind"], number> = {
  NUMBER: 0,
  SKIP: 1,
  REVERSE: 2,
  DRAW_2: 3,
  DISCARD_ALL: 4,
  WILD: 5,
  WILD_DRAW_4: 6,
  WILD_DRAW_6: 7,
  WILD_DRAW_10: 8,
};

function sortHand(hand: readonly UnoCard[]): UnoCard[] {
  return [...hand].sort((a, b) => {
    const colorDiff = COLOR_SORT_ORDER[a.color] - COLOR_SORT_ORDER[b.color];
    if (colorDiff !== 0) return colorDiff;
    const kindDiff = KIND_SORT_ORDER[a.kind] - KIND_SORT_ORDER[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return (a.value ?? 0) - (b.value ?? 0);
  });
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function buildUnoNoMercyDeck(rng: () => number): UnoCard[] {
  const cards: UnoCard[] = [];
  let seq = 1;
  const pushCard = (
    color: UnoCardColor,
    kind: UnoCard["kind"],
    value?: number
  ) => {
    cards.push({
      id: `u${seq++}`,
      color,
      kind,
      ...(value !== undefined ? { value } : {}),
    });
  };

  for (const color of UNO_COLORS) {
    // One 0 (Swap Hands) per color
    pushCard(color, "NUMBER", 0);
    // Two 1..9 per color
    for (let n = 1; n <= 9; n++) {
      pushCard(color, "NUMBER", n);
      pushCard(color, "NUMBER", n);
    }
    // Action cards
    for (let i = 0; i < 2; i++) {
      pushCard(color, "SKIP");
      pushCard(color, "REVERSE");
      pushCard(color, "DRAW_2");
    }
    pushCard(color, "DISCARD_ALL");
  }

  for (let i = 0; i < 4; i++) {
    pushCard("WILD", "WILD");
    pushCard("WILD", "WILD_DRAW_4");
  }
  for (let i = 0; i < 2; i++) {
    pushCard("WILD", "WILD_DRAW_6");
    pushCard("WILD", "WILD_DRAW_10");
  }

  return shuffle(cards, rng);
}

function drawFromPiles(
  drawPile: UnoCard[],
  discardPile: UnoCard[],
  count: number,
  rng: () => number
): { drawn: UnoCard[]; nextDrawPile: UnoCard[]; nextDiscardPile: UnoCard[] } {
  let currentDraw = [...drawPile];
  let currentDiscard = [...discardPile];
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (currentDraw.length === 0) {
      if (currentDiscard.length <= 1) {
        break;
      }
      const top = currentDiscard[currentDiscard.length - 1]!;
      const recyclable = currentDiscard.slice(0, -1);
      currentDraw = shuffle(recyclable, rng);
      currentDiscard = [top];
    }
    const card = currentDraw.pop();
    if (!card) break;
    drawn.push(card);
  }

  return {
    drawn,
    nextDrawPile: currentDraw,
    nextDiscardPile: currentDiscard,
  };
}

function setupRoundPiles(
  playerIds: [string, string],
  rng: () => number
): {
  hands: Record<string, UnoCard[]>;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  activeColor: UnoColor;
} {
  const deck = buildUnoNoMercyDeck(rng);
  const [p1, p2] = playerIds;
  const p1Hand = deck.splice(0, UNO_STARTING_HAND_SIZE);
  const p2Hand = deck.splice(0, UNO_STARTING_HAND_SIZE);

  // Pick a plain number (1..9) card to open the discard pile cleanly
  const starterIdx = deck.findIndex(
    (c) => c.kind === "NUMBER" && c.value !== undefined && c.value >= 1
  );
  const topCard =
    starterIdx >= 0 ? deck.splice(starterIdx, 1)[0]! : deck.pop()!;
  const activeColor: UnoColor =
    topCard.color === "WILD" ? "RED" : topCard.color;

  return {
    hands: { [p1]: p1Hand, [p2]: p2Hand },
    drawPile: deck,
    discardPile: [topCard],
    activeColor,
  };
}

/**
 * 1v1 UNO: No Mercy game engine featuring draw stacking (+2/+4/+6/+10),
 * 20-card Mercy KO rule, 0 Swap Hands, Discard All, and real-time UNO/Catch.
 */
export class UnoNoMercyEngine
  implements IGameEngine<UnoState, UnoAction, UnoView>
{
  readonly id = "uno-no-mercy";
  readonly name = "UNO: No Mercy";
  readonly tagline =
    "Stacking +2/+4/+6/+10, tukar tangan kartu 0, aturan KO 20 kartu, & tantangan UNO!";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string]): UnoState {
    const [p1, p2] = playerIds;
    const starterIndex = this.rng() < 0.5 ? 0 : 1;
    const setup = setupRoundPiles(playerIds, this.rng);

    return {
      playerIds,
      phase: "PLAYING",
      roundNumber: 1,
      scores: { [p1]: 0, [p2]: 0 },
      currentTurnPlayerId: playerIds[starterIndex]!,
      hands: setup.hands,
      drawPile: setup.drawPile,
      discardPile: setup.discardPile,
      activeColor: setup.activeColor,
      pendingDraw: 0,
      pendingDrawMinValue: 0,
      unoCalled: { [p1]: false, [p2]: false },
      readyForNextRound: { [p1]: false, [p2]: false },
      actionNonce: 0,
      lastAction: null,
      lastRoundSummary: null,
      winnerId: null,
    };
  }

  handleAction(
    state: UnoState,
    playerId: string,
    action: UnoAction
  ): EngineResult<UnoState> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }
    const opponentId = getOpponentId(state.playerIds, playerId);

    if (action.type === "NEXT_ROUND") {
      return this.handleNextRound(state, playerId);
    }

    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Ronde sedang tidak berjalan.");
    }

    // Real-time UNO call and Catch can happen on any turn
    if (action.type === "CALL_UNO") {
      return this.handleCallUno(state, playerId);
    }
    if (action.type === "CATCH_UNO") {
      return this.handleCatchUno(state, playerId, opponentId);
    }

    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Sekarang bukan giliranmu.");
    }

    switch (action.type) {
      case "PLAY_CARD":
        return this.handlePlayCard(
          state,
          playerId,
          opponentId,
          action.cardId,
          action.chosenColor
        );
      case "DRAW_CARD":
        return this.handleDrawCard(state, playerId, opponentId);
      case "ACCEPT_DRAW":
        return this.handleAcceptDraw(state, playerId, opponentId);
      default:
        throw new EngineError("INVALID_ACTION", "Aksi tidak dikenali.");
    }
  }

  private handlePlayCard(
    state: UnoState,
    playerId: string,
    opponentId: string,
    cardId: string,
    chosenColor?: UnoColor
  ): EngineResult<UnoState> {
    const myHand = [...(state.hands[playerId] ?? [])];
    const oppHand = [...(state.hands[opponentId] ?? [])];
    const cardIdx = myHand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) {
      throw new EngineError("INVALID_ACTION", "Kartu tidak ada di tanganmu.");
    }

    const card = myHand[cardIdx]!;
    const topCard = state.discardPile[state.discardPile.length - 1]!;

    if (
      !isUnoCardPlayable(
        card,
        topCard,
        state.activeColor,
        state.pendingDraw,
        state.pendingDrawMinValue
      )
    ) {
      throw new EngineError(
        "INVALID_ACTION",
        state.pendingDraw > 0
          ? `Sedang ada tumpukan +${state.pendingDraw}! Balas dengan kartu +${state.pendingDrawMinValue} atau lebih tinggi, atau ambil kartu.`
          : "Kartu tidak cocok dengan warna atau simbol di meja."
      );
    }

    let nextColor: UnoColor;
    if (card.color === "WILD") {
      if (!chosenColor || !UNO_COLORS.includes(chosenColor)) {
        throw new EngineError(
          "INVALID_ACTION",
          "Pilih warna untuk kartu Wild terlebih dahulu."
        );
      }
      nextColor = chosenColor;
    } else {
      nextColor = card.color;
    }

    // Remove played card
    myHand.splice(cardIdx, 1);
    const nextDiscardPile = [...state.discardPile];
    let discardedCount = 1;

    // DISCARD_ALL removes all other cards of the same color too
    let finalMyHand = myHand;
    if (card.kind === "DISCARD_ALL" && card.color !== "WILD") {
      const sameColorCards = myHand.filter((c) => c.color === card.color);
      finalMyHand = myHand.filter((c) => c.color !== card.color);
      nextDiscardPile.push(...sameColorCards);
      discardedCount += sameColorCards.length;
    }
    nextDiscardPile.push(card);

    const nextHands: Record<string, UnoCard[]> = {
      [playerId]: finalMyHand,
      [opponentId]: oppHand,
    };

    const nextUnoCalled = { ...state.unoCalled };
    if (finalMyHand.length >= 2) {
      nextUnoCalled[playerId] = false;
    }

    const nextNonce = state.actionNonce + 1;
    const events: GameEvent[] = [
      {
        type: "CARD_PLAYED",
        payload: {
          playerId,
          cardKind: card.kind,
          cardColor: card.color,
          chosenColor: nextColor,
          discardedCount,
        },
      },
    ];

    // Check immediate win (empty hand) BEFORE swap hands
    if (finalMyHand.length === 0) {
      const lastAction: UnoLastAction = {
        nonce: nextNonce,
        playerId,
        kind: "PLAY",
        card,
        discardedCount,
        chosenColor: card.color === "WILD" ? nextColor : undefined,
        detail: `Menutup ronde dengan ${formatUnoCardLabel(card)}!`,
      };
      return this.finishRound(
        {
          ...state,
          hands: nextHands,
          discardPile: nextDiscardPile,
          activeColor: nextColor,
          pendingDraw: 0,
          pendingDrawMinValue: 0,
          unoCalled: nextUnoCalled,
          actionNonce: nextNonce,
          lastAction,
        },
        playerId,
        opponentId,
        "EMPTY_HAND",
        events
      );
    }

    // Card 0 = Swap Hands
    if (card.kind === "NUMBER" && card.value === 0) {
      nextHands[playerId] = oppHand;
      nextHands[opponentId] = finalMyHand;
      nextUnoCalled[playerId] = false;
      nextUnoCalled[opponentId] = false;
      events.push({ type: "SWAP_HANDS", payload: { playerId } });

      const lastAction: UnoLastAction = {
        nonce: nextNonce,
        playerId,
        kind: "SWAP_HANDS",
        card,
        detail: `Memainkan ${formatUnoCardLabel(card)} — seluruh kartu di tangan bertukar! 🔄`,
      };

      return {
        newState: {
          ...state,
          currentTurnPlayerId: opponentId,
          hands: nextHands,
          discardPile: nextDiscardPile,
          activeColor: nextColor,
          pendingDraw: 0,
          pendingDrawMinValue: 0,
          unoCalled: nextUnoCalled,
          actionNonce: nextNonce,
          lastAction,
        },
        events,
      };
    }

    // Draw stacking cards (+2, +4, +6, +10)
    const drawVal = getUnoDrawValue(card.kind);
    if (drawVal > 0) {
      const nextPending = state.pendingDraw + drawVal;
      if (drawVal >= 4) {
        events.push({
          type: "HEAVY_STACK",
          payload: { playerId, pendingDraw: nextPending },
        });
      }
      const lastAction: UnoLastAction = {
        nonce: nextNonce,
        playerId,
        kind: "PLAY",
        card,
        chosenColor: card.color === "WILD" ? nextColor : undefined,
        detail:
          state.pendingDraw > 0
            ? `Menumpuk ${formatUnoCardLabel(card)}! Total hukuman menjadi +${nextPending}!`
            : `Memainkan ${formatUnoCardLabel(card)} (+${nextPending})!`,
      };
      return {
        newState: {
          ...state,
          currentTurnPlayerId: opponentId,
          hands: nextHands,
          discardPile: nextDiscardPile,
          activeColor: nextColor,
          pendingDraw: nextPending,
          pendingDrawMinValue: drawVal,
          unoCalled: nextUnoCalled,
          actionNonce: nextNonce,
          lastAction,
        },
        events,
      };
    }

    // Skip & Reverse in 1v1 both grant another turn to the player
    const keepsTurn = card.kind === "SKIP" || card.kind === "REVERSE";
    const nextTurnPlayer = keepsTurn ? playerId : opponentId;

    const detail =
      card.kind === "DISCARD_ALL"
        ? `Membuang ${discardedCount} kartu ${nextColor === "RED" ? "Merah" : nextColor === "YELLOW" ? "Kuning" : nextColor === "GREEN" ? "Hijau" : "Biru"} sekaligus! 💥`
        : keepsTurn
          ? `Memainkan ${formatUnoCardLabel(card)} — giliran lanjut lagi!`
          : `Memainkan ${formatUnoCardLabel(card)}.`;

    const lastAction: UnoLastAction = {
      nonce: nextNonce,
      playerId,
      kind: "PLAY",
      card,
      discardedCount,
      chosenColor: card.color === "WILD" ? nextColor : undefined,
      detail,
    };

    return {
      newState: {
        ...state,
        currentTurnPlayerId: nextTurnPlayer,
        hands: nextHands,
        discardPile: nextDiscardPile,
        activeColor: nextColor,
        pendingDraw: 0,
        pendingDrawMinValue: 0,
        unoCalled: nextUnoCalled,
        actionNonce: nextNonce,
        lastAction,
      },
      events,
    };
  }

  private handleDrawCard(
    state: UnoState,
    playerId: string,
    opponentId: string
  ): EngineResult<UnoState> {
    if (state.pendingDraw > 0) {
      throw new EngineError(
        "INVALID_ACTION",
        `Ambil tumpukan +${state.pendingDraw} atau balas dengan kartu tambah.`
      );
    }

    const currentHand = state.hands[playerId] ?? [];
    const currentTopCard = state.discardPile[state.discardPile.length - 1]!;

    const { drawn, nextDrawPile, nextDiscardPile } = drawFromPiles(
      state.drawPile,
      state.discardPile,
      1,
      this.rng
    );

    const nextNonce = state.actionNonce + 1;

    // Safeguard: if both draw and discard piles are completely exhausted
    if (drawn.length === 0) {
      const hasPlayable = currentHand.some((c) =>
        isUnoCardPlayable(c, currentTopCard, state.activeColor, 0, 0)
      );
      if (hasPlayable) {
        throw new EngineError(
          "INVALID_ACTION",
          "Deck sudah habis — mainkan kartu yang cocok di tanganmu!"
        );
      }
      const lastAction: UnoLastAction = {
        nonce: nextNonce,
        playerId,
        kind: "PASS",
        detail: "Deck kosong — giliran berpindah ke lawan.",
      };
      return {
        newState: {
          ...state,
          currentTurnPlayerId: opponentId,
          actionNonce: nextNonce,
          lastAction,
        },
        events: [{ type: "TURN_PASSED", payload: { playerId } }],
      };
    }

    const nextMyHand = [...currentHand, ...drawn];
    const nextHands = {
      ...state.hands,
      [playerId]: nextMyHand,
    };
    const nextUnoCalled = {
      ...state.unoCalled,
      [playerId]: false,
    };
    const events: GameEvent[] = [
      { type: "CARD_DRAWN", payload: { playerId, count: drawn.length } },
    ];

    if (nextMyHand.length >= UNO_MERCY_KO_LIMIT) {
      const lastAction: UnoLastAction = {
        nonce: nextNonce,
        playerId,
        kind: "DRAW",
        drawCount: drawn.length,
        detail: `Terus mengambil kartu dan terkena Mercy KO (${nextMyHand.length}/${UNO_MERCY_KO_LIMIT})! 💀`,
      };
      return this.finishRound(
        {
          ...state,
          hands: nextHands,
          drawPile: nextDrawPile,
          discardPile: nextDiscardPile,
          unoCalled: nextUnoCalled,
          actionNonce: nextNonce,
          lastAction,
        },
        opponentId,
        playerId,
        "MERCY_KO",
        events
      );
    }

    const topCard = nextDiscardPile[nextDiscardPile.length - 1]!;
    const drawnCard = drawn[0];
    const drawnPlayable =
      drawnCard !== undefined &&
      isUnoCardPlayable(drawnCard, topCard, state.activeColor, 0, 0);

    const lastAction: UnoLastAction = {
      nonce: nextNonce,
      playerId,
      kind: "DRAW",
      drawCount: drawn.length,
      detail: drawnPlayable
        ? "Mengambil 1 kartu — dapat kartu yang cocok! Silakan mainkan."
        : "Mengambil 1 kartu (belum cocok — terus ambil sampai dapat!).",
    };

    return {
      newState: {
        ...state,
        currentTurnPlayerId: playerId,
        hands: nextHands,
        drawPile: nextDrawPile,
        discardPile: nextDiscardPile,
        unoCalled: nextUnoCalled,
        actionNonce: nextNonce,
        lastAction,
      },
      events,
    };
  }

  private handleAcceptDraw(
    state: UnoState,
    playerId: string,
    opponentId: string
  ): EngineResult<UnoState> {
    if (state.pendingDraw <= 0) {
      throw new EngineError(
        "INVALID_ACTION",
        "Tidak ada hukuman tumpukan kartu yang harus diambil."
      );
    }

    const amount = state.pendingDraw;
    const { drawn, nextDrawPile, nextDiscardPile } = drawFromPiles(
      state.drawPile,
      state.discardPile,
      amount,
      this.rng
    );

    const nextMyHand = [...(state.hands[playerId] ?? []), ...drawn];
    const nextHands = {
      ...state.hands,
      [playerId]: nextMyHand,
    };
    const nextUnoCalled = {
      ...state.unoCalled,
      [playerId]: false,
    };
    const nextNonce = state.actionNonce + 1;
    const events: GameEvent[] = [
      { type: "PENALTY_DRAWN", payload: { playerId, count: drawn.length } },
    ];

    if (nextMyHand.length >= UNO_MERCY_KO_LIMIT) {
      const lastAction: UnoLastAction = {
        nonce: nextNonce,
        playerId,
        kind: "ACCEPT_DRAW",
        drawCount: drawn.length,
        detail: `Menarik +${drawn.length} kartu dan langsung Mercy KO (${nextMyHand.length}/${UNO_MERCY_KO_LIMIT})! 💀`,
      };
      return this.finishRound(
        {
          ...state,
          hands: nextHands,
          drawPile: nextDrawPile,
          discardPile: nextDiscardPile,
          pendingDraw: 0,
          pendingDrawMinValue: 0,
          unoCalled: nextUnoCalled,
          actionNonce: nextNonce,
          lastAction,
        },
        opponentId,
        playerId,
        "MERCY_KO",
        events
      );
    }

    const lastAction: UnoLastAction = {
      nonce: nextNonce,
      playerId,
      kind: "ACCEPT_DRAW",
      drawCount: drawn.length,
      detail: `Menarik hukuman +${drawn.length} kartu!`,
    };

    return {
      newState: {
        ...state,
        currentTurnPlayerId: opponentId,
        hands: nextHands,
        drawPile: nextDrawPile,
        discardPile: nextDiscardPile,
        pendingDraw: 0,
        pendingDrawMinValue: 0,
        unoCalled: nextUnoCalled,
        actionNonce: nextNonce,
        lastAction,
      },
      events,
    };
  }

  private handleCallUno(
    state: UnoState,
    playerId: string
  ): EngineResult<UnoState> {
    const myHand = state.hands[playerId] ?? [];
    if (myHand.length > 2) {
      throw new EngineError(
        "INVALID_ACTION",
        "Tombol UNO! hanya bisa ditekan saat tersisa 1–2 kartu."
      );
    }
    if (state.unoCalled[playerId]) {
      throw new EngineError("INVALID_ACTION", "Kamu sudah berteriak UNO!");
    }

    const nextNonce = state.actionNonce + 1;
    const lastAction: UnoLastAction = {
      nonce: nextNonce,
      playerId,
      kind: "CALL_UNO",
      detail: "Berteriak UNO! 🔥",
    };

    return {
      newState: {
        ...state,
        unoCalled: {
          ...state.unoCalled,
          [playerId]: true,
        },
        actionNonce: nextNonce,
        lastAction,
      },
      events: [{ type: "UNO_CALLED", payload: { playerId } }],
    };
  }

  private handleCatchUno(
    state: UnoState,
    catcherId: string,
    opponentId: string
  ): EngineResult<UnoState> {
    const oppHand = state.hands[opponentId] ?? [];
    if (oppHand.length !== 1 || state.unoCalled[opponentId]) {
      throw new EngineError(
        "INVALID_ACTION",
        "Lawan tidak sedang lengah dari teriakan UNO!"
      );
    }

    const { drawn, nextDrawPile, nextDiscardPile } = drawFromPiles(
      state.drawPile,
      state.discardPile,
      2,
      this.rng
    );

    const nextOppHand = [...oppHand, ...drawn];
    const nextHands = {
      ...state.hands,
      [opponentId]: nextOppHand,
    };
    const nextUnoCalled = {
      ...state.unoCalled,
      [opponentId]: false,
    };
    const nextNonce = state.actionNonce + 1;

    const lastAction: UnoLastAction = {
      nonce: nextNonce,
      playerId: catcherId,
      kind: "CATCH_UNO",
      drawCount: drawn.length,
      detail: "Menangkap lawan yang lupa teriak UNO! Penalti +2 kartu! 🚨",
    };

    return {
      newState: {
        ...state,
        hands: nextHands,
        drawPile: nextDrawPile,
        discardPile: nextDiscardPile,
        unoCalled: nextUnoCalled,
        actionNonce: nextNonce,
        lastAction,
      },
      events: [{ type: "UNO_CAUGHT", payload: { catcherId, targetId: opponentId } }],
    };
  }

  private finishRound(
    state: UnoState,
    winnerId: string,
    loserId: string,
    reason: UnoRoundEndReason,
    events: GameEvent[]
  ): EngineResult<UnoState> {
    const nextScores = {
      ...state.scores,
      [winnerId]: (state.scores[winnerId] ?? 0) + 1,
    };
    const matchWon = (nextScores[winnerId] ?? 0) >= UNO_TARGET_WINS;
    const [p1, p2] = state.playerIds;
    const loserCardCount = state.hands[loserId]?.length ?? 0;

    const summary: UnoRoundSummary = {
      roundNumber: state.roundNumber,
      winnerId,
      loserId,
      reason,
      loserCardCount,
    };

    events.push({
      type: reason === "MERCY_KO" ? "ROUND_KO" : "ROUND_WON",
      payload: { winnerId, loserId, reason },
    });

    const newState: UnoState = {
      ...state,
      phase: matchWon ? "MATCH_END" : "ROUND_END",
      scores: nextScores,
      readyForNextRound: { [p1]: false, [p2]: false },
      lastRoundSummary: summary,
      winnerId: matchWon ? winnerId : null,
    };

    return {
      newState,
      events,
      roundWinnerId: winnerId,
      matchWinnerId: matchWon ? winnerId : undefined,
    };
  }

  private handleNextRound(
    state: UnoState,
    playerId: string
  ): EngineResult<UnoState> {
    if (state.phase !== "ROUND_END") {
      throw new EngineError(
        "INVALID_ACTION",
        "Belum bisa lanjut ke ronde berikutnya."
      );
    }

    const nextReady = {
      ...state.readyForNextRound,
      [playerId]: true,
    };

    const bothReady = state.playerIds.every((id) => nextReady[id]);
    if (!bothReady) {
      return {
        newState: {
          ...state,
          readyForNextRound: nextReady,
        },
        events: [{ type: "NEXT_ROUND_READY", payload: { playerId } }],
      };
    }

    const [p1, p2] = state.playerIds;
    const nextRound = state.roundNumber + 1;
    const starterId = state.playerIds[(nextRound - 1) % 2]!;
    const setup = setupRoundPiles(state.playerIds, this.rng);

    return {
      newState: {
        ...state,
        phase: "PLAYING",
        roundNumber: nextRound,
        currentTurnPlayerId: starterId,
        hands: setup.hands,
        drawPile: setup.drawPile,
        discardPile: setup.discardPile,
        activeColor: setup.activeColor,
        pendingDraw: 0,
        pendingDrawMinValue: 0,
        unoCalled: { [p1]: false, [p2]: false },
        readyForNextRound: { [p1]: false, [p2]: false },
        lastAction: null,
      },
      events: [{ type: "ROUND_STARTED", payload: { roundNumber: nextRound } }],
    };
  }

  getViewForPlayer(state: UnoState, playerId: string): UnoView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    const rawMyHand = state.hands[playerId] ?? [];
    const sortedMyHand = sortHand(rawMyHand);
    const oppHand = state.hands[opponentId] ?? [];
    const topCard = state.discardPile[state.discardPile.length - 1]!;
    const previousCard =
      state.discardPile.length >= 2
        ? (state.discardPile[state.discardPile.length - 2] ?? null)
        : null;

    const isMyTurn =
      state.phase === "PLAYING" && state.currentTurnPlayerId === playerId;
    const playableCardIds = isMyTurn
      ? sortedMyHand
          .filter((c) =>
            isUnoCardPlayable(
              c,
              topCard,
              state.activeColor,
              state.pendingDraw,
              state.pendingDrawMinValue
            )
          )
          .map((c) => c.id)
      : [];

    const canCallUno =
      state.phase === "PLAYING" &&
      rawMyHand.length <= 2 &&
      rawMyHand.length >= 1 &&
      !state.unoCalled[playerId];

    const canCatchOpponent =
      state.phase === "PLAYING" &&
      oppHand.length === 1 &&
      !state.unoCalled[opponentId];

    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      targetWins: UNO_TARGET_WINS,
      mercyLimit: UNO_MERCY_KO_LIMIT,
      scores: state.scores,
      currentTurnPlayerId: state.currentTurnPlayerId,
      myHand: sortedMyHand,
      opponentCardCount: oppHand.length,
      deckCount: state.drawPile.length,
      topCard,
      previousCard,
      activeColor: state.activeColor,
      pendingDraw: state.pendingDraw,
      pendingDrawMinValue: state.pendingDrawMinValue,
      unoCalled: state.unoCalled,
      canCallUno,
      canCatchOpponent,
      playableCardIds,
      readyForNextRound: state.readyForNextRound,
      lastAction: state.lastAction,
      lastRoundSummary: state.lastRoundSummary,
      winnerId: state.winnerId,
    };
  }
}

export const unoNoMercyEngine = new UnoNoMercyEngine();
