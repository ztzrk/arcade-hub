import {
  TEBAK_KARAKTER_BY_ID,
  TEBAK_KARAKTER_ROSTER,
  type TebakKarakterAction,
  type TebakKarakterPendingQuestion,
  type TebakKarakterPhase,
  type TebakKarakterQA,
  type TebakKarakterRoundSummary,
  type TebakKarakterTurnStage,
  type TebakKarakterView,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const TARGET_WINS = 2;
const MIN_QUESTION_LENGTH = 2;
const MAX_QUESTION_LENGTH = 100;

export interface TebakKarakterState {
  playerIds: [string, string];
  phase: TebakKarakterPhase;
  roundNumber: number;
  startingPlayerIndex: 0 | 1;
  scores: Record<string, number>;
  secretCharacters: Record<string, string | null>;
  eliminatedIds: Record<string, string[]>;
  currentTurnPlayerId: string;
  turnStage: TebakKarakterTurnStage;
  pendingQuestion: TebakKarakterPendingQuestion | null;
  qaHistory: TebakKarakterQA[];
  nextQuestionSeq: number;
  readyForNextRound: Record<string, boolean>;
  lastRoundSummary: TebakKarakterRoundSummary | null;
  winnerId: string | null;
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

function assertValidCharacterId(characterId: string): string {
  if (typeof characterId !== "string" || !TEBAK_KARAKTER_BY_ID.has(characterId)) {
    throw new EngineError("INVALID_ACTION", "Karakter tidak ditemukan di papan.");
  }
  return characterId;
}

function validateQuestion(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new EngineError("INVALID_ACTION", "Pertanyaan harus berupa teks.");
  }
  const clean = raw.trim().replace(/\s+/g, " ");
  if (clean.length < MIN_QUESTION_LENGTH || clean.length > MAX_QUESTION_LENGTH) {
    throw new EngineError(
      "INVALID_ACTION",
      `Pertanyaan harus antara ${MIN_QUESTION_LENGTH} hingga ${MAX_QUESTION_LENGTH} karakter.`
    );
  }
  return clean;
}

function createEmptyRoundFields(playerIds: [string, string], starterId: string) {
  const [p1, p2] = playerIds;
  return {
    secretCharacters: { [p1]: null, [p2]: null } as Record<string, string | null>,
    eliminatedIds: { [p1]: [], [p2]: [] } as Record<string, string[]>,
    currentTurnPlayerId: starterId,
    turnStage: "ASK_OR_GUESS" as TebakKarakterTurnStage,
    pendingQuestion: null as TebakKarakterPendingQuestion | null,
    qaHistory: [] as TebakKarakterQA[],
    nextQuestionSeq: 1,
    readyForNextRound: { [p1]: false, [p2]: false } as Record<string, boolean>,
  };
}

export class TebakKarakterEngine
  implements
    IGameEngine<TebakKarakterState, TebakKarakterAction, TebakKarakterView>
{
  readonly id = "tebak-karakter";
  readonly name = "Tebak Karakter";
  readonly tagline =
    "Pilih karakter rahasia, lempar pertanyaan Ya/Tidak, dan tebak pilihan lawan.";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  constructor(private readonly rng: () => number = Math.random) {}

  initState(playerIds: [string, string]): TebakKarakterState {
    const [p1, p2] = playerIds;
    const startingPlayerIndex: 0 | 1 = this.rng() < 0.5 ? 0 : 1;
    const starterId = playerIds[startingPlayerIndex];

    return {
      playerIds,
      phase: "SELECT_CHARACTER",
      roundNumber: 1,
      startingPlayerIndex,
      scores: { [p1]: 0, [p2]: 0 },
      ...createEmptyRoundFields(playerIds, starterId),
      lastRoundSummary: null,
      winnerId: null,
    };
  }

  handleAction(
    state: TebakKarakterState,
    playerId: string,
    action: TebakKarakterAction
  ): EngineResult<TebakKarakterState> {
    if (!state.playerIds.includes(playerId)) {
      throw new EngineError("INVALID_ACTION", "Pemain tidak berada di meja ini.");
    }

    if (state.phase === "MATCH_END") {
      throw new EngineError("INVALID_ACTION", "Match sudah selesai.");
    }

    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }

    switch (action.type) {
      case "SELECT_CHARACTER":
        return this.handleSelectCharacter(state, playerId, action.characterId);
      case "TOGGLE_ELIMINATE":
        return this.handleToggleEliminate(state, playerId, action.characterId);
      case "ASK_QUESTION":
        return this.handleAskQuestion(state, playerId, action.question);
      case "ANSWER_QUESTION":
        return this.handleAnswerQuestion(state, playerId, action.answer);
      case "GUESS_CHARACTER":
        return this.handleGuessCharacter(state, playerId, action.characterId);
      case "NEXT_ROUND":
        return this.handleNextRound(state, playerId);
      default:
        throw new EngineError("INVALID_ACTION", "Aksi tidak dikenali.");
    }
  }

  private handleSelectCharacter(
    state: TebakKarakterState,
    playerId: string,
    characterId: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "SELECT_CHARACTER") {
      throw new EngineError("INVALID_ACTION", "Fase pilih karakter sudah lewat.");
    }
    if (state.secretCharacters[playerId] !== null) {
      throw new EngineError(
        "INVALID_ACTION",
        "Kamu sudah mengunci karakter rahasia untuk ronde ini."
      );
    }

    const validId = assertValidCharacterId(characterId);
    const nextSecrets: Record<string, string | null> = {
      ...state.secretCharacters,
      [playerId]: validId,
    };

    const [p1, p2] = state.playerIds;
    const bothSelected = nextSecrets[p1] !== null && nextSecrets[p2] !== null;

    if (!bothSelected) {
      return {
        newState: {
          ...state,
          secretCharacters: nextSecrets,
        },
        events: [{ type: "CHARACTER_SELECTED", payload: { playerId } }],
      };
    }

    return {
      newState: {
        ...state,
        phase: "PLAYING",
        secretCharacters: nextSecrets,
      },
      events: [
        {
          type: "BOTH_CHARACTERS_READY",
          payload: { roundNumber: state.roundNumber },
        },
      ],
    };
  }

  private handleToggleEliminate(
    state: TebakKarakterState,
    playerId: string,
    characterId: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError(
        "INVALID_ACTION",
        "Eliminasi kartu hanya bisa dilakukan saat ronde berlangsung."
      );
    }

    const validId = assertValidCharacterId(characterId);
    const current = state.eliminatedIds[playerId] ?? [];
    const exists = current.includes(validId);
    const updated = exists
      ? current.filter((id) => id !== validId)
      : [...current, validId];

    return {
      newState: {
        ...state,
        eliminatedIds: {
          ...state.eliminatedIds,
          [playerId]: updated,
        },
      },
      events: [
        {
          type: "BOARD_UPDATED",
          payload: { playerId },
        },
      ],
    };
  }

  private handleAskQuestion(
    state: TebakKarakterState,
    playerId: string,
    rawQuestion: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Ronde belum dimulai.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Sekarang bukan giliranmu.");
    }
    if (state.turnStage !== "ASK_OR_GUESS") {
      throw new EngineError(
        "INVALID_ACTION",
        "Tunggu jawaban dari pertanyaan sebelumnya."
      );
    }

    const question = validateQuestion(rawQuestion);
    const pendingQuestion: TebakKarakterPendingQuestion = {
      id: state.nextQuestionSeq,
      askerId: playerId,
      question,
    };

    return {
      newState: {
        ...state,
        turnStage: "ANSWER_QUESTION",
        pendingQuestion,
        nextQuestionSeq: state.nextQuestionSeq + 1,
      },
      events: [
        {
          type: "QUESTION_ASKED",
          payload: { askerId: playerId, questionId: pendingQuestion.id },
        },
      ],
    };
  }

  private handleAnswerQuestion(
    state: TebakKarakterState,
    playerId: string,
    answer: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Ronde tidak sedang berlangsung.");
    }
    if (state.turnStage !== "ANSWER_QUESTION" || !state.pendingQuestion) {
      throw new EngineError("INVALID_ACTION", "Tidak ada pertanyaan yang perlu dijawab.");
    }
    if (state.pendingQuestion.askerId === playerId) {
      throw new EngineError(
        "NOT_YOUR_TURN",
        "Menunggu pasanganmu menjawab pertanyaan ini."
      );
    }
    if (answer !== "YES" && answer !== "NO") {
      throw new EngineError("INVALID_ACTION", "Jawaban harus YA atau TIDAK.");
    }

    const qaEntry: TebakKarakterQA = {
      id: state.pendingQuestion.id,
      askerId: state.pendingQuestion.askerId,
      answererId: playerId,
      question: state.pendingQuestion.question,
      answer,
    };

    return {
      newState: {
        ...state,
        currentTurnPlayerId: playerId,
        turnStage: "ASK_OR_GUESS",
        pendingQuestion: null,
        qaHistory: [...state.qaHistory, qaEntry],
      },
      events: [
        {
          type: "QUESTION_ANSWERED",
          payload: {
            questionId: qaEntry.id,
            answererId: playerId,
            answer,
          },
        },
      ],
    };
  }

  private handleGuessCharacter(
    state: TebakKarakterState,
    playerId: string,
    characterId: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Ronde tidak sedang berlangsung.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Sekarang bukan giliranmu.");
    }
    if (state.turnStage !== "ASK_OR_GUESS") {
      throw new EngineError(
        "INVALID_ACTION",
        "Selesaikan sesi tanya-jawab sebelum menebak."
      );
    }

    const guessedId = assertValidCharacterId(characterId);
    const opponentId = getOpponentId(state.playerIds, playerId);
    const opponentSecret = state.secretCharacters[opponentId];
    const mySecret = state.secretCharacters[playerId];
    if (!opponentSecret || !mySecret) {
      throw new EngineError("INVALID_ACTION", "Karakter rahasia belum siap.");
    }

    const isCorrect = guessedId === opponentSecret;
    const roundWinnerId = isCorrect ? playerId : opponentId;
    const reason = isCorrect ? "CORRECT_GUESS" : "WRONG_GUESS";

    const nextScores: Record<string, number> = {
      ...state.scores,
      [roundWinnerId]: (state.scores[roundWinnerId] ?? 0) + 1,
    };

    const summary: TebakKarakterRoundSummary = {
      roundNumber: state.roundNumber,
      winnerId: roundWinnerId,
      guesserId: playerId,
      guessedCharacterId: guessedId,
      reason,
      secretCharacters: {
        [playerId]: mySecret,
        [opponentId]: opponentSecret,
      },
      questionCount: state.qaHistory.length,
    };

    const matchWinnerId =
      (nextScores[roundWinnerId] ?? 0) >= TARGET_WINS ? roundWinnerId : undefined;

    if (matchWinnerId) {
      return {
        newState: {
          ...state,
          phase: "MATCH_END",
          scores: nextScores,
          pendingQuestion: null,
          lastRoundSummary: summary,
          winnerId: matchWinnerId,
        },
        events: [
          {
            type: isCorrect ? "GUESS_CORRECT" : "GUESS_WRONG",
            payload: { guesserId: playerId, guessedCharacterId: guessedId },
          },
          {
            type: "MATCH_WON",
            payload: { winnerId: matchWinnerId, roundNumber: state.roundNumber },
          },
        ],
        roundWinnerId,
        matchWinnerId,
      };
    }

    return {
      newState: {
        ...state,
        phase: "ROUND_END",
        scores: nextScores,
        pendingQuestion: null,
        lastRoundSummary: summary,
      },
      events: [
        {
          type: isCorrect ? "GUESS_CORRECT" : "GUESS_WRONG",
          payload: { guesserId: playerId, guessedCharacterId: guessedId },
        },
        {
          type: "ROUND_WON",
          payload: { winnerId: roundWinnerId, roundNumber: state.roundNumber },
        },
      ],
      roundWinnerId,
    };
  }

  private handleNextRound(
    state: TebakKarakterState,
    playerId: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "ROUND_END") {
      throw new EngineError("INVALID_ACTION", "Ronde belum berakhir.");
    }

    const nextReady: Record<string, boolean> = {
      ...state.readyForNextRound,
      [playerId]: true,
    };
    const [p1, p2] = state.playerIds;
    const bothReady = Boolean(nextReady[p1] && nextReady[p2]);

    if (!bothReady) {
      return {
        newState: {
          ...state,
          readyForNextRound: nextReady,
        },
        events: [{ type: "PLAYER_READY_NEXT_ROUND", payload: { playerId } }],
      };
    }

    const nextStarterIndex: 0 | 1 = state.startingPlayerIndex === 0 ? 1 : 0;
    const nextStarterId = state.playerIds[nextStarterIndex];

    return {
      newState: {
        ...state,
        phase: "SELECT_CHARACTER",
        roundNumber: state.roundNumber + 1,
        startingPlayerIndex: nextStarterIndex,
        ...createEmptyRoundFields(state.playerIds, nextStarterId),
      },
      events: [
        {
          type: "ROUND_STARTED",
          payload: { roundNumber: state.roundNumber + 1 },
        },
      ],
    };
  }

  getViewForPlayer(
    state: TebakKarakterState,
    playerId: string
  ): TebakKarakterView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    const mySecretCharacterId = state.secretCharacters[playerId] ?? null;
    const opponentSecret = state.secretCharacters[opponentId] ?? null;
    const myEliminatedIds = state.eliminatedIds[playerId] ?? [];
    const opponentEliminatedIds = state.eliminatedIds[opponentId] ?? [];

    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      targetWins: TARGET_WINS,
      scores: state.scores,
      mySecretCharacterId,
      myCharacterSelected: mySecretCharacterId !== null,
      opponentCharacterSelected: opponentSecret !== null,
      currentTurnPlayerId: state.currentTurnPlayerId,
      turnStage: state.turnStage,
      pendingQuestion: state.pendingQuestion,
      qaHistory: state.qaHistory,
      myEliminatedIds,
      opponentRemainingCount: Math.max(
        0,
        TEBAK_KARAKTER_ROSTER.length - opponentEliminatedIds.length
      ),
      readyForNextRound: state.readyForNextRound,
      lastRoundSummary: state.lastRoundSummary,
      winnerId: state.winnerId,
    };
  }
}

export const tebakKarakterEngine = new TebakKarakterEngine();
