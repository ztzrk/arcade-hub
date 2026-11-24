export * from "./tebakKarakterRoster.ts";
export * from "./haikyuuHaruko.ts";
export * from "./ularTangga.ts";
export * from "./unoNoMercy.ts";

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
/*  Game #2: Tebak Kata (1v1 Word Duel)                                       */
/* -------------------------------------------------------------------------- */

export type TebakKataPhase =
  | "SETUP_WORDS"
  | "GUESSING"
  | "ROUND_END"
  | "MATCH_END";

export type TebakKataSlot =
  | { kind: "blank" }
  | { kind: "space" }
  | { kind: "letter"; char: string };

export type TebakKataAction =
  | { type: "SUBMIT_WORD"; word: string; clue?: string }
  | { type: "SUBMIT_GUESS"; guess: string }
  | { type: "REVEAL_LETTER" }
  | { type: "NEXT_ROUND" };

export interface TebakKataRoundSummary {
  roundNumber: number;
  winnerId: string;
  words: Record<string, string>;
  clues: Record<string, string>;
  guessCounts: Record<string, number>;
  hintsUsed: Record<string, number>;
}

export interface TebakKataView {
  phase: TebakKataPhase;
  roundNumber: number;
  targetWins: number;
  scores: Record<string, number>;
  myWord: string | null;
  myClue: string;
  myWordSubmitted: boolean;
  opponentWordSubmitted: boolean;
  opponentClue: string;
  opponentSlots: TebakKataSlot[];
  targetWordCount: number;
  targetLetterCount: number;
  myGuesses: string[];
  hintsUsed: number;
  canRevealLetter: boolean;
  myWordLettersTotal: number;
  myWordLettersRevealed: number;
  opponentProgress: {
    guessCount: number;
    hintsUsed: number;
    revealedIndices: number[];
  };
  readyForNextRound: Record<string, boolean>;
  lastRoundSummary: TebakKataRoundSummary | null;
  winnerId: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Game #3: Tebak Karakter (1v1 Guess Who?)                                  */
/* -------------------------------------------------------------------------- */

export type TebakKarakterPhase =
  | "SELECT_CHARACTER"
  | "PLAYING"
  | "ROUND_END"
  | "MATCH_END";

export type TebakKarakterAction =
  | { type: "SELECT_CHARACTER"; characterId: string }
  | { type: "TOGGLE_ELIMINATE"; characterId: string }
  | { type: "GUESS_CHARACTER"; characterId: string }
  | { type: "NEXT_ROUND" };

export type TebakKarakterRoundOutcome =
  | "WIN"
  | "DRAW_BOTH_CORRECT"
  | "DRAW_BOTH_WRONG";

export interface TebakKarakterRoundSummary {
  roundNumber: number;
  winnerId: string | null;
  outcome: TebakKarakterRoundOutcome;
  guesses: Record<string, string>;
  secretCharacters: Record<string, string>;
}

export interface TebakKarakterView {
  phase: TebakKarakterPhase;
  roundNumber: number;
  targetWins: number;
  scores: Record<string, number>;
  mySecretCharacterId: string | null;
  myCharacterSelected: boolean;
  opponentCharacterSelected: boolean;
  myGuessCharacterId: string | null;
  myGuessSubmitted: boolean;
  opponentGuessSubmitted: boolean;
  myEliminatedIds: string[];
  opponentRemainingCount: number;
  readyForNextRound: Record<string, boolean>;
  lastRoundSummary: TebakKarakterRoundSummary | null;
  winnerId: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Game #4: Susun 4 Putar (Connect 4 with Sudden Column Twist)               */
/* -------------------------------------------------------------------------- */

export const SUSUN_4_ROWS = 6;
export const SUSUN_4_COLS = 7;

export type Susun4Phase = "PLAYING" | "ROUND_END" | "MATCH_END";

export type Susun4Action =
  | { type: "DROP_COIN"; col: number }
  | { type: "NEXT_ROUND" };

export type Susun4TwistKind = "FLIP_COLUMN";

export interface Susun4TwistInfo {
  nonce: number;
  moveCount: number;
  kind: Susun4TwistKind;
  targetCol: number;
  triggerPlayerId: string;
}

export interface Susun4LastDrop {
  nonce: number;
  row: number;
  col: number;
  playerId: string;
}

export type Susun4RoundEndReason =
  | "CONNECT_4"
  | "TWIST_CONNECT_4"
  | "DRAW_BOTH_CONNECT_4"
  | "DRAW_BOARD_FULL";

export interface Susun4RoundSummary {
  roundNumber: number;
  winnerId: string | null;
  reason: Susun4RoundEndReason;
  winningCells: [number, number][];
}

export interface Susun4View {
  phase: Susun4Phase;
  roundNumber: number;
  targetWins: number;
  scores: Record<string, number>;
  board: (string | null)[][];
  currentTurnPlayerId: string;
  moveCount: number;
  lastDrop: Susun4LastDrop | null;
  lastTwist: Susun4TwistInfo | null;
  winningCells: [number, number][];
  readyForNextRound: Record<string, boolean>;
  lastRoundSummary: Susun4RoundSummary | null;
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
