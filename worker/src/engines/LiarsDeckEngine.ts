import type {
  CardRank,
  GameEvent,
  LiarsDeckAction,
  LiarsDeckOutcome,
  LiarsDeckPhase,
  LiarsDeckReveal,
  LiarsDeckView,
  TableCardRank,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const TABLE_RANKS: readonly TableCardRank[] = ["KING", "QUEEN", "ACE"];
const CARDS_PER_HAND = 5;
const MAX_CHAMBERS = 6;
const MAX_CARDS_PER_PLAY = 3;

export interface RevolverState {
  bulletPosition: number; // 0..5 (server secret)
  shotsFired: number;
}

export interface LiarsDeckState {
  playerIds: [string, string];
  phase: LiarsDeckPhase;
  roundNumber: number;
  tableCard: TableCardRank;
  hands: Record<string, CardRank[]>;
  currentTurnPlayerId: string;
  lastPlay: {
    playerId: string;
    cards: CardRank[];
  } | null;
  rouletteTargetId: string | null;
  pendingReveal: LiarsDeckReveal | null;
  lastOutcome: LiarsDeckOutcome | null;
  outcomeCounter: number;
  revolvers: Record<string, RevolverState>;
  winnerId: string | null;
}

function createFullDeck(): CardRank[] {
  const deck: CardRank[] = [];
  for (const rank of TABLE_RANKS) {
    for (let i = 0; i < 6; i++) {
      deck.push(rank);
    }
  }
  deck.push("JOKER", "JOKER");
  return deck;
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function randomInt(maxExclusive: number, rng: () => number): number {
  const value = Math.floor(rng() * maxExclusive);
  return Math.max(0, Math.min(maxExclusive - 1, value));
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Player is not part of this match.");
}

function isPlayHonest(cards: CardRank[], tableCard: TableCardRank): boolean {
  return cards.every((card) => card === tableCard || card === "JOKER");
}

function dealHands(
  playerIds: [string, string],
  rng: () => number
): { tableCard: TableCardRank; hands: Record<string, CardRank[]> } {
  const shuffled = shuffleWithRng(createFullDeck(), rng);
  const tableCard = TABLE_RANKS[randomInt(TABLE_RANKS.length, rng)]!;
  return {
    tableCard,
    hands: {
      [playerIds[0]]: shuffled.slice(0, CARDS_PER_HAND),
      [playerIds[1]]: shuffled.slice(CARDS_PER_HAND, CARDS_PER_HAND * 2),
    },
  };
}

export class LiarsDeckEngine
  implements IGameEngine<LiarsDeckState, LiarsDeckAction, LiarsDeckView>
{
  readonly id = "liars-deck";
  readonly name = "Liar's Deck";
  readonly tagline = "Adu gertakan kartu & keberanian di meja Russian Roulette 1v1.";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string]): LiarsDeckState {
    const { tableCard, hands } = dealHands(playerIds, this.rng);
    const starterIndex = randomInt(2, this.rng);

    return {
      playerIds,
      phase: "PLAYING",
      roundNumber: 1,
      tableCard,
      hands,
      currentTurnPlayerId: playerIds[starterIndex]!,
      lastPlay: null,
      rouletteTargetId: null,
      pendingReveal: null,
      lastOutcome: null,
      outcomeCounter: 0,
      revolvers: {
        [playerIds[0]]: {
          bulletPosition: randomInt(MAX_CHAMBERS, this.rng),
          shotsFired: 0,
        },
        [playerIds[1]]: {
          bulletPosition: randomInt(MAX_CHAMBERS, this.rng),
          shotsFired: 0,
        },
      },
      winnerId: null,
    };
  }

  handleAction(
    state: LiarsDeckState,
    playerId: string,
    action: LiarsDeckAction
  ): EngineResult<LiarsDeckState> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Malformed game action.");
    }

    const opponentId = getOpponentId(state.playerIds, playerId);

    switch (action.type) {
      case "PLAY_CARDS":
        return this.handlePlayCards(state, playerId, opponentId, action.cardIndices);
      case "CALL_LIAR":
        return this.handleCallLiar(state, playerId, opponentId);
      case "ACCEPT_ROUND":
        return this.handleAcceptRound(state, playerId, opponentId);
      case "PULL_TRIGGER":
        return this.handlePullTrigger(state, playerId, opponentId);
      default:
        throw new EngineError("INVALID_ACTION", "Unknown action type.");
    }
  }

  private handlePlayCards(
    state: LiarsDeckState,
    playerId: string,
    opponentId: string,
    cardIndices: unknown
  ): EngineResult<LiarsDeckState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Tidak bisa meletakkan kartu di fase ini.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Bukan giliranmu.");
    }
    if ((state.hands[opponentId] ?? []).length === 0) {
      throw new EngineError(
        "INVALID_ACTION",
        "Kartu lawan habis; pilih Tuduh Bohong atau Lanjut Ronde Baru."
      );
    }
    if (!Array.isArray(cardIndices)) {
      throw new EngineError("INVALID_ACTION", "Pilihan kartu tidak valid.");
    }
    if (cardIndices.length < 1 || cardIndices.length > MAX_CARDS_PER_PLAY) {
      throw new EngineError("INVALID_ACTION", "Pilih 1 hingga 3 kartu untuk dimainkan.");
    }

    const hand = state.hands[playerId] ?? [];
    const seen = new Set<number>();
    for (const rawIdx of cardIndices) {
      if (typeof rawIdx !== "number" || !Number.isInteger(rawIdx)) {
        throw new EngineError("INVALID_ACTION", "Indeks kartu tidak valid.");
      }
      if (rawIdx < 0 || rawIdx >= hand.length || seen.has(rawIdx)) {
        throw new EngineError("INVALID_ACTION", "Kartu yang dipilih tidak tersedia.");
      }
      seen.add(rawIdx);
    }

    const playedCards = cardIndices.map((idx) => hand[idx]!);
    const remainingHand = hand.filter((_, idx) => !seen.has(idx));
    const nextHands = {
      ...state.hands,
      [playerId]: remainingHand,
    };

    const events: GameEvent[] = [
      {
        type: "CARDS_PLAYED",
        payload: {
          playerId,
          count: playedCards.length,
          handEmptied: remainingHand.length === 0,
        },
      },
    ];

    return {
      newState: {
        ...state,
        hands: nextHands,
        currentTurnPlayerId: opponentId,
        lastPlay: {
          playerId,
          cards: playedCards,
        },
      },
      events,
    };
  }

  private handleAcceptRound(
    state: LiarsDeckState,
    playerId: string,
    opponentId: string
  ): EngineResult<LiarsDeckState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Tidak bisa lanjut ronde di fase ini.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Bukan giliranmu.");
    }
    if (
      !state.lastPlay ||
      state.lastPlay.playerId !== opponentId ||
      (state.hands[opponentId] ?? []).length > 0
    ) {
      throw new EngineError(
        "INVALID_ACTION",
        "Lanjut ronde baru hanya tersedia jika kartu lawan habis."
      );
    }

    const { tableCard, hands } = dealHands(state.playerIds, this.rng);

    return {
      newState: {
        ...state,
        roundNumber: state.roundNumber + 1,
        tableCard,
        hands,
        currentTurnPlayerId: playerId,
        lastPlay: null,
      },
      events: [
        {
          type: "ROUND_ACCEPTED",
          payload: { acceptedBy: playerId, nextRound: state.roundNumber + 1 },
        },
      ],
    };
  }

  private handleCallLiar(
    state: LiarsDeckState,
    playerId: string,
    opponentId: string
  ): EngineResult<LiarsDeckState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Tidak bisa menuduh di fase ini.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Bukan giliranmu.");
    }
    if (!state.lastPlay || state.lastPlay.playerId !== opponentId) {
      throw new EngineError("INVALID_ACTION", "Belum ada kartu lawan untuk dituduh.");
    }

    const honest = isPlayHonest(state.lastPlay.cards, state.tableCard);
    const wasLie = !honest;
    const accusedPlayerId = state.lastPlay.playerId;
    const rouletteTargetId = wasLie ? accusedPlayerId : playerId;

    const pendingReveal: LiarsDeckReveal = {
      playedCards: [...state.lastPlay.cards],
      claimedRank: state.tableCard,
      wasLie,
      accusedPlayerId,
      challengerPlayerId: playerId,
      autoCalled: false,
    };

    return {
      newState: {
        ...state,
        phase: "ROULETTE",
        lastPlay: null,
        rouletteTargetId,
        pendingReveal,
      },
      events: [
        {
          type: "LIAR_CALLED",
          payload: {
            challengerPlayerId: playerId,
            accusedPlayerId,
            wasLie,
            rouletteTargetId,
          },
        },
      ],
    };
  }

  private handlePullTrigger(
    state: LiarsDeckState,
    playerId: string,
    opponentId: string
  ): EngineResult<LiarsDeckState> {
    if (state.phase !== "ROULETTE" || !state.pendingReveal) {
      throw new EngineError("INVALID_ACTION", "Revolver belum aktif.");
    }
    if (state.rouletteTargetId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Bukan giliranmu menarik pelatuk.");
    }

    const revolver = state.revolvers[playerId];
    if (!revolver) {
      throw new EngineError("INVALID_ACTION", "State revolver tidak ditemukan.");
    }

    const shotIndex = revolver.shotsFired;
    const hit = shotIndex === revolver.bulletPosition;
    const nextShotsFired = shotIndex + 1;
    const nextOutcomeCounter = state.outcomeCounter + 1;

    const outcome: LiarsDeckOutcome = {
      nonce: nextOutcomeCounter,
      targetId: playerId,
      hit,
      chamberNumber: nextShotsFired,
      reveal: state.pendingReveal,
    };

    const nextRevolvers = {
      ...state.revolvers,
      [playerId]: {
        ...revolver,
        shotsFired: nextShotsFired,
      },
    };

    if (hit) {
      return {
        newState: {
          ...state,
          phase: "MATCH_END",
          rouletteTargetId: null,
          pendingReveal: null,
          lastOutcome: outcome,
          outcomeCounter: nextOutcomeCounter,
          revolvers: nextRevolvers,
          winnerId: opponentId,
        },
        events: [
          {
            type: "REVOLVER_BANG",
            payload: { targetId: playerId, winnerId: opponentId, chamberNumber: nextShotsFired },
          },
        ],
        roundWinnerId: opponentId,
        matchWinnerId: opponentId,
      };
    }

    // Survivor starts the next round with fresh hands and table card.
    const { tableCard, hands } = dealHands(state.playerIds, this.rng);

    return {
      newState: {
        ...state,
        phase: "PLAYING",
        roundNumber: state.roundNumber + 1,
        tableCard,
        hands,
        currentTurnPlayerId: playerId,
        lastPlay: null,
        rouletteTargetId: null,
        pendingReveal: null,
        lastOutcome: outcome,
        outcomeCounter: nextOutcomeCounter,
        revolvers: nextRevolvers,
      },
      events: [
        {
          type: "REVOLVER_CLICK",
          payload: { targetId: playerId, chamberNumber: nextShotsFired },
        },
      ],
      roundWinnerId: playerId,
    };
  }

  getViewForPlayer(state: LiarsDeckState, playerId: string): LiarsDeckView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    const myHand = [...(state.hands[playerId] ?? [])];
    const opponentCardCount = (state.hands[opponentId] ?? []).length;
    const myShotsFired = state.revolvers[playerId]?.shotsFired ?? 0;
    const opponentShotsFired = state.revolvers[opponentId]?.shotsFired ?? 0;

    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      tableCard: state.tableCard,
      myHand,
      opponentCardCount,
      currentTurnPlayerId: state.currentTurnPlayerId,
      lastPlay: state.lastPlay
        ? {
            playerId: state.lastPlay.playerId,
            count: state.lastPlay.cards.length,
          }
        : null,
      canPlayCards:
        state.phase === "PLAYING" &&
        state.currentTurnPlayerId === playerId &&
        opponentCardCount > 0,
      canCallLiar:
        state.phase === "PLAYING" &&
        state.currentTurnPlayerId === playerId &&
        state.lastPlay !== null &&
        state.lastPlay.playerId !== playerId,
      canAcceptRound:
        state.phase === "PLAYING" &&
        state.currentTurnPlayerId === playerId &&
        state.lastPlay !== null &&
        state.lastPlay.playerId !== playerId &&
        opponentCardCount === 0,
      rouletteTargetId: state.rouletteTargetId,
      pendingReveal: state.phase === "ROULETTE" ? state.pendingReveal : null,
      lastOutcome: state.lastOutcome,
      revolver: {
        myShotsFired,
        opponentShotsFired,
        maxChambers: MAX_CHAMBERS,
      },
      winnerId: state.winnerId,
    };
  }
}

export const liarsDeckEngine = new LiarsDeckEngine();
