import type {
  TebakKataAction,
  TebakKataPhase,
  TebakKataRoundSummary,
  TebakKataSlot,
  TebakKataView,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const TARGET_WINS = 2;
const MIN_LETTERS = 2;
const MAX_WORD_LENGTH = 24;
const MAX_CLUE_LENGTH = 40;
const MAX_HINTS_CAP = 4;

export interface TebakKataState {
  playerIds: [string, string];
  phase: TebakKataPhase;
  roundNumber: number;
  scores: Record<string, number>;
  words: Record<string, string | null>;
  clues: Record<string, string>;
  guesses: Record<string, string[]>;
  revealedIndices: Record<string, number[]>;
  readyForNextRound: Record<string, boolean>;
  lastRoundSummary: TebakKataRoundSummary | null;
  winnerId: string | null;
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

export function normalizePhrase(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

function countLetters(phrase: string): number {
  let count = 0;
  for (const ch of phrase) {
    if (ch !== " ") count += 1;
  }
  return count;
}

function computeMaxHints(secretWord: string | null): number {
  if (!secretWord) return 0;
  const letters = countLetters(secretWord);
  if (letters < MIN_LETTERS) return 0;
  return Math.max(1, Math.min(MAX_HINTS_CAP, Math.floor(letters / 2)));
}

function validateSecretWord(raw: string): string {
  const normalized = normalizePhrase(raw);
  if (!normalized || normalized.length > MAX_WORD_LENGTH) {
    throw new EngineError(
      "INVALID_ACTION",
      `Kata harus antara ${MIN_LETTERS} hingga ${MAX_WORD_LENGTH} karakter.`
    );
  }
  if (!/^[A-Z ]+$/.test(normalized)) {
    throw new EngineError(
      "INVALID_ACTION",
      "Kata rahasia hanya boleh berisi huruf A–Z dan spasi."
    );
  }
  if (countLetters(normalized) < MIN_LETTERS) {
    throw new EngineError(
      "INVALID_ACTION",
      `Kata rahasia minimal memiliki ${MIN_LETTERS} huruf.`
    );
  }
  return normalized;
}

function validateGuess(raw: string): string {
  const normalized = normalizePhrase(raw);
  if (!normalized) {
    throw new EngineError("INVALID_ACTION", "Masukkan tebakan terlebih dahulu.");
  }
  if (normalized.length > 40 || !/^[A-Z ]+$/.test(normalized)) {
    throw new EngineError(
      "INVALID_ACTION",
      "Tebakan hanya boleh berisi huruf A–Z dan spasi."
    );
  }
  return normalized;
}

function buildMaskedSlots(
  secretWord: string,
  revealed: number[]
): TebakKataSlot[] {
  const revealedSet = new Set(revealed);
  const slots: TebakKataSlot[] = [];
  for (let i = 0; i < secretWord.length; i++) {
    const ch = secretWord[i]!;
    if (ch === " ") {
      slots.push({ kind: "space" });
    } else if (revealedSet.has(i)) {
      slots.push({ kind: "letter", char: ch });
    } else {
      slots.push({ kind: "blank" });
    }
  }
  return slots;
}

function createEmptyRoundFields(playerIds: [string, string]) {
  const [p1, p2] = playerIds;
  return {
    words: { [p1]: null, [p2]: null } as Record<string, string | null>,
    clues: { [p1]: "", [p2]: "" } as Record<string, string>,
    guesses: { [p1]: [], [p2]: [] } as Record<string, string[]>,
    revealedIndices: { [p1]: [], [p2]: [] } as Record<string, number[]>,
    readyForNextRound: { [p1]: false, [p2]: false } as Record<string, boolean>,
  };
}

export class TebakKataEngine
  implements IGameEngine<TebakKataState, TebakKataAction, TebakKataView>
{
  readonly id = "tebak-kata";
  readonly name = "Tebak Kata";
  readonly tagline =
    "Isi kata rahasia & adu cepat menebak frasa lawan sebelum mereka menebak milikmu.";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string]): TebakKataState {
    const [p1, p2] = playerIds;
    return {
      playerIds,
      phase: "SETUP_WORDS",
      roundNumber: 1,
      scores: { [p1]: 0, [p2]: 0 },
      ...createEmptyRoundFields(playerIds),
      lastRoundSummary: null,
      winnerId: null,
    };
  }

  handleAction(
    state: TebakKataState,
    playerId: string,
    action: TebakKataAction
  ): EngineResult<TebakKataState> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }

    const opponentId = getOpponentId(state.playerIds, playerId);

    switch (action.type) {
      case "SUBMIT_WORD":
        return this.handleSubmitWord(
          state,
          playerId,
          opponentId,
          action.word,
          action.clue
        );
      case "SUBMIT_GUESS":
        return this.handleSubmitGuess(state, playerId, opponentId, action.guess);
      case "REVEAL_LETTER":
        return this.handleRevealLetter(state, playerId, opponentId);
      case "NEXT_ROUND":
        return this.handleNextRound(state, playerId);
      default:
        throw new EngineError("INVALID_ACTION", "Tipe aksi tidak dikenal.");
    }
  }

  getViewForPlayer(state: TebakKataState, playerId: string): TebakKataView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    const myWord = state.words[playerId] ?? null;
    const opponentWord = state.words[opponentId] ?? null;
    const myRevealed = state.revealedIndices[playerId] ?? [];
    const opponentRevealed = state.revealedIndices[opponentId] ?? [];
    const canShowSlots = state.phase !== "SETUP_WORDS" && opponentWord !== null;

    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      targetWins: TARGET_WINS,
      scores: { ...state.scores },
      myWord,
      myClue: state.clues[playerId] ?? "",
      myWordSubmitted: myWord !== null,
      opponentWordSubmitted: opponentWord !== null,
      opponentClue: canShowSlots ? state.clues[opponentId] ?? "" : "",
      opponentSlots: canShowSlots
        ? buildMaskedSlots(opponentWord, myRevealed)
        : [],
      targetWordCount: canShowSlots ? opponentWord.split(" ").length : 0,
      targetLetterCount: canShowSlots ? countLetters(opponentWord) : 0,
      myGuesses: [...(state.guesses[playerId] ?? [])],
      hintsUsed: myRevealed.length,
      maxHints: canShowSlots ? computeMaxHints(opponentWord) : 0,
      opponentProgress: {
        guessCount: (state.guesses[opponentId] ?? []).length,
        hintsUsed: opponentRevealed.length,
        revealedIndices: [...opponentRevealed],
      },
      readyForNextRound: { ...state.readyForNextRound },
      lastRoundSummary: state.lastRoundSummary
        ? {
            ...state.lastRoundSummary,
            words: { ...state.lastRoundSummary.words },
            clues: { ...state.lastRoundSummary.clues },
            guessCounts: { ...state.lastRoundSummary.guessCounts },
            hintsUsed: { ...state.lastRoundSummary.hintsUsed },
          }
        : null,
      winnerId: state.winnerId,
    };
  }

  private handleSubmitWord(
    state: TebakKataState,
    playerId: string,
    opponentId: string,
    rawWord: string,
    rawClue?: string
  ): EngineResult<TebakKataState> {
    if (state.phase !== "SETUP_WORDS") {
      throw new EngineError("INVALID_ACTION", "Fase pengisian kata sudah selesai.");
    }
    if (state.words[playerId] !== null) {
      throw new EngineError("INVALID_ACTION", "Kata rahasiamu sudah dikunci.");
    }
    if (typeof rawWord !== "string") {
      throw new EngineError("INVALID_ACTION", "Kata rahasia tidak valid.");
    }

    const cleanWord = validateSecretWord(rawWord);
    const cleanClue =
      typeof rawClue === "string"
        ? rawClue.trim().replace(/\s+/g, " ").slice(0, MAX_CLUE_LENGTH)
        : "";

    const nextWords = { ...state.words, [playerId]: cleanWord };
    const nextClues = { ...state.clues, [playerId]: cleanClue };
    const bothSubmitted =
      nextWords[playerId] !== null && nextWords[opponentId] !== null;

    const newState: TebakKataState = {
      ...state,
      phase: bothSubmitted ? "GUESSING" : "SETUP_WORDS",
      words: nextWords,
      clues: nextClues,
    };

    return {
      newState,
      events: bothSubmitted
        ? [{ type: "WORDS_LOCKED", payload: { roundNumber: state.roundNumber } }]
        : [{ type: "WORD_SUBMITTED", payload: { playerId } }],
    };
  }

  private handleSubmitGuess(
    state: TebakKataState,
    playerId: string,
    opponentId: string,
    rawGuess: string
  ): EngineResult<TebakKataState> {
    if (state.phase !== "GUESSING") {
      throw new EngineError("INVALID_ACTION", "Belum waktunya menebak.");
    }
    if (typeof rawGuess !== "string") {
      throw new EngineError("INVALID_ACTION", "Tebakan tidak valid.");
    }

    const targetWord = state.words[opponentId];
    if (!targetWord) {
      throw new EngineError("INVALID_ACTION", "Kata lawan belum siap.");
    }

    const cleanGuess = validateGuess(rawGuess);
    const prevGuesses = state.guesses[playerId] ?? [];

    if (cleanGuess === targetWord) {
      const nextGuesses = {
        ...state.guesses,
        [playerId]: [...prevGuesses, cleanGuess],
      };
      const nextScores = {
        ...state.scores,
        [playerId]: (state.scores[playerId] ?? 0) + 1,
      };
      const isMatchOver = nextScores[playerId]! >= TARGET_WINS;
      const summary: TebakKataRoundSummary = {
        roundNumber: state.roundNumber,
        winnerId: playerId,
        words: {
          [playerId]: state.words[playerId] ?? "",
          [opponentId]: targetWord,
        },
        clues: { ...state.clues },
        guessCounts: {
          [playerId]: nextGuesses[playerId]!.length,
          [opponentId]: (state.guesses[opponentId] ?? []).length,
        },
        hintsUsed: {
          [playerId]: (state.revealedIndices[playerId] ?? []).length,
          [opponentId]: (state.revealedIndices[opponentId] ?? []).length,
        },
      };

      const newState: TebakKataState = {
        ...state,
        phase: isMatchOver ? "MATCH_END" : "ROUND_END",
        scores: nextScores,
        guesses: nextGuesses,
        lastRoundSummary: summary,
        winnerId: isMatchOver ? playerId : null,
      };

      return {
        newState,
        events: [
          {
            type: isMatchOver ? "MATCH_WON" : "ROUND_WON",
            payload: { winnerId: playerId, roundNumber: state.roundNumber },
          },
        ],
        roundWinnerId: playerId,
        matchWinnerId: isMatchOver ? playerId : undefined,
      };
    }

    if (prevGuesses.includes(cleanGuess)) {
      throw new EngineError("INVALID_ACTION", "Kata tersebut sudah kamu coba.");
    }

    const newState: TebakKataState = {
      ...state,
      guesses: {
        ...state.guesses,
        [playerId]: [...prevGuesses, cleanGuess],
      },
    };

    return {
      newState,
      events: [{ type: "WRONG_GUESS", payload: { playerId } }],
    };
  }

  private handleRevealLetter(
    state: TebakKataState,
    playerId: string,
    opponentId: string
  ): EngineResult<TebakKataState> {
    if (state.phase !== "GUESSING") {
      throw new EngineError("INVALID_ACTION", "Bantuan huruf hanya bisa dibuka saat menebak.");
    }

    const targetWord = state.words[opponentId];
    if (!targetWord) {
      throw new EngineError("INVALID_ACTION", "Kata lawan belum tersedia.");
    }

    const revealed = state.revealedIndices[playerId] ?? [];
    const maxHints = computeMaxHints(targetWord);
    if (revealed.length >= maxHints) {
      throw new EngineError("INVALID_ACTION", "Batas bantuan huruf sudah habis.");
    }

    const revealedSet = new Set(revealed);
    const availableIndices: number[] = [];
    for (let i = 0; i < targetWord.length; i++) {
      if (targetWord[i] !== " " && !revealedSet.has(i)) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      throw new EngineError("INVALID_ACTION", "Semua huruf sudah terbuka.");
    }

    const pick = Math.min(
      availableIndices.length - 1,
      Math.max(0, Math.floor(this.rng() * availableIndices.length))
    );
    const chosenIndex = availableIndices[pick]!;

    const newState: TebakKataState = {
      ...state,
      revealedIndices: {
        ...state.revealedIndices,
        [playerId]: [...revealed, chosenIndex],
      },
    };

    return {
      newState,
      events: [{ type: "LETTER_REVEALED", payload: { playerId } }],
    };
  }

  private handleNextRound(
    state: TebakKataState,
    playerId: string
  ): EngineResult<TebakKataState> {
    if (state.phase !== "ROUND_END") {
      throw new EngineError("INVALID_ACTION", "Ronde belum selesai.");
    }

    const nextReady = { ...state.readyForNextRound, [playerId]: true };
    const bothReady = state.playerIds.every((id) => nextReady[id]);

    if (!bothReady) {
      return {
        newState: {
          ...state,
          readyForNextRound: nextReady,
        },
        events: [],
      };
    }

    return {
      newState: {
        ...state,
        phase: "SETUP_WORDS",
        roundNumber: state.roundNumber + 1,
        ...createEmptyRoundFields(state.playerIds),
      },
      events: [
        { type: "ROUND_STARTED", payload: { roundNumber: state.roundNumber + 1 } },
      ],
    };
  }
}

export const tebakKataEngine = new TebakKataEngine();
