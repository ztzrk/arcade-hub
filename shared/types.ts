export type PlayerSeat = 0 | 1;

export type RoomPhase = "LOBBY" | "IN_GAME" | "MATCH_OVER";

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  seat: PlayerSeat;
  ready: boolean;
  connected: boolean;
  score: number;
}

export interface PublicRoomState {
  roomId: string;
  phase: RoomPhase;
  players: PublicPlayer[];
  customStake: string;
  selectedGameId: string;
  lastWinnerId: string | null;
}

export interface GameEvent {
  type: string;
  payload?: Record<string, unknown>;
}

export const TAUNT_EMOTES = [
  { id: "sus", label: "Sus", emoji: "👀" },
  { id: "honest", label: "Jujurly...", emoji: "😇" },
  { id: "bluff", label: "Bluffing nih", emoji: "🎭" },
  { id: "nervous", label: "Deg-degan?", emoji: "💓" },
  { id: "lucky", label: "Hoki doang", emoji: "🍀" },
  { id: "mercy", label: "Ampun!", emoji: "🏳️" },
] as const;

export type TauntEmoteId = (typeof TAUNT_EMOTES)[number]["id"];

export type ErrorCode =
  | "ROOM_FULL"
  | "INVALID_ACTION"
  | "NOT_YOUR_TURN"
  | "RATE_LIMITED"
  | "BAD_MESSAGE"
  | "GAME_NOT_FOUND";

/* -------------------------------------------------------------------------- */
/*  Game #1: Liar's Deck (1v1 Couple Edition)                                 */
/* -------------------------------------------------------------------------- */

export type TableCardRank = "KING" | "QUEEN" | "ACE";
export type CardRank = TableCardRank | "JOKER";

export type LiarsDeckPhase = "PLAYING" | "ROULETTE" | "MATCH_END";

export type LiarsDeckAction =
  | { type: "PLAY_CARDS"; cardIndices: number[] }
  | { type: "CALL_LIAR" }
  | { type: "ACCEPT_ROUND" }
  | { type: "PULL_TRIGGER" };

export interface LiarsDeckReveal {
  playedCards: CardRank[];
  claimedRank: TableCardRank;
  wasLie: boolean;
  accusedPlayerId: string;
  challengerPlayerId: string;
  autoCalled: boolean;
}

export interface LiarsDeckOutcome {
  nonce: number;
  targetId: string;
  hit: boolean;
  chamberNumber: number;
  reveal: LiarsDeckReveal;
}

export interface LiarsDeckView {
  phase: LiarsDeckPhase;
  roundNumber: number;
  tableCard: TableCardRank;
  myHand: CardRank[];
  opponentCardCount: number;
  currentTurnPlayerId: string;
  lastPlay: {
    playerId: string;
    count: number;
  } | null;
  canPlayCards: boolean;
  canCallLiar: boolean;
  canAcceptRound: boolean;
  rouletteTargetId: string | null;
  pendingReveal: LiarsDeckReveal | null;
  lastOutcome: LiarsDeckOutcome | null;
  revolver: {
    myShotsFired: number;
    opponentShotsFired: number;
    maxChambers: number;
  };
  winnerId: string | null;
}

/* -------------------------------------------------------------------------- */
/*  WebSocket Messages                                                        */
/* -------------------------------------------------------------------------- */

export type ClientMessage =
  | {
      type: "JOIN_ROOM";
      roomId: string;
      playerName: string;
      playerToken?: string;
    }
  | { type: "SET_STAKE"; stakeText: string }
  | { type: "SELECT_GAME"; gameId: string }
  | { type: "SET_READY"; ready: boolean }
  | { type: "START_MATCH" }
  | { type: "RETURN_TO_LOBBY" }
  | { type: "GAME_ACTION"; action: unknown }
  | { type: "SEND_TAUNT"; emoteId: TauntEmoteId }
  | { type: "REQUEST_SYNC" }
  | { type: "PING"; ts: number };

export type ServerMessage =
  | {
      type: "SESSION_ASSIGNED";
      playerId: string;
      playerToken: string;
      seat: PlayerSeat;
    }
  | { type: "ROOM_STATE"; room: PublicRoomState }
  | { type: "GAME_STATE"; view: unknown; events: GameEvent[] }
  | {
      type: "TAUNT_RECEIVED";
      fromPlayerId: string;
      fromName: string;
      emoteId: TauntEmoteId;
    }
  | { type: "ERROR"; code: ErrorCode; message: string }
  | { type: "PONG"; ts: number };
