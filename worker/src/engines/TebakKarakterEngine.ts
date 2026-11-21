import {
  TEBAK_KARAKTER_BY_ID,
  TEBAK_KARAKTER_ROSTER,
  type TebakKarakterAction,
  type TebakKarakterPhase,
  type TebakKarakterRoundOutcome,
  type TebakKarakterRoundSummary,
  type TebakKarakterView,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const TARGET_WINS = 2;

export interface TebakKarakterState {
  playerIds: [string, string];
  phase: TebakKarakterPhase;
  roundNumber: number;
  scores: Record<string, number>;
  secretCharacters: Record<string, string | null>;
  guesses: Record<string, string | null>;
  eliminatedIds: Record<string, string[]>;
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

function createEmptyRoundFields(playerIds: [string, string]) {
  const [p1, p2] = playerIds;
  return {
    secretCharacters: { [p1]: null, [p2]: null } as Record<string, string | null>,
    guesses: { [p1]: null, [p2]: null } as Record<string, string | null>,
    eliminatedIds: { [p1]: [], [p2]: [] } as Record<string, string[]>,
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
    "Pilih karakter rahasia, ngobrol bebas untuk eliminasi papan, lalu kunci tebakan bersama.";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  initState(playerIds: [string, string]): TebakKarakterState {
    const [p1, p2] = playerIds;
    return {
      playerIds,
      phase: "SELECT_CHARACTER",
      roundNumber: 1,
      scores: { [p1]: 0, [p2]: 0 },
      ...createEmptyRoundFields(playerIds),
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

  private handleGuessCharacter(
    state: TebakKarakterState,
    playerId: string,
    characterId: string
  ): EngineResult<TebakKarakterState> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Ronde tidak sedang berlangsung.");
    }
    if (state.guesses[playerId] !== null) {
      throw new EngineError(
        "INVALID_ACTION",
        "Kamu sudah mengunci tebakan di ronde ini."
      );
    }

    const guessedId = assertValidCharacterId(characterId);
    const nextGuesses: Record<string, string | null> = {
      ...state.guesses,
      [playerId]: guessedId,
    };

    const [p1, p2] = state.playerIds;
    const g1 = nextGuesses[p1];
    const g2 = nextGuesses[p2];

    if (!g1 || !g2) {
      return {
        newState: {
          ...state,
          guesses: nextGuesses,
        },
        events: [{ type: "GUESS_LOCKED", payload: { playerId } }],
      };
    }

    const s1 = state.secretCharacters[p1];
    const s2 = state.secretCharacters[p2];
    if (!s1 || !s2) {
      throw new EngineError("INVALID_ACTION", "Karakter rahasia belum siap.");
    }

    const p1Correct = g1 === s2;
    const p2Correct = g2 === s1;

    let roundWinnerId: string | undefined;
    let outcome: TebakKarakterRoundOutcome;

    if (p1Correct && !p2Correct) {
      roundWinnerId = p1;
      outcome = "WIN";
    } else if (p2Correct && !p1Correct) {
      roundWinnerId = p2;
      outcome = "WIN";
    } else if (p1Correct && p2Correct) {
      outcome = "DRAW_BOTH_CORRECT";
    } else {
      outcome = "DRAW_BOTH_WRONG";
    }

    const nextScores: Record<string, number> = { ...state.scores };
    if (roundWinnerId) {
      nextScores[roundWinnerId] = (nextScores[roundWinnerId] ?? 0) + 1;
    }

    const summary: TebakKarakterRoundSummary = {
      roundNumber: state.roundNumber,
      winnerId: roundWinnerId ?? null,
      outcome,
      guesses: {
        [p1]: g1,
        [p2]: g2,
      },
      secretCharacters: {
        [p1]: s1,
        [p2]: s2,
      },
    };

    const matchWinnerId =
      roundWinnerId && (nextScores[roundWinnerId] ?? 0) >= TARGET_WINS
        ? roundWinnerId
        : undefined;

    if (matchWinnerId) {
      return {
        newState: {
          ...state,
          phase: "MATCH_END",
          guesses: nextGuesses,
          scores: nextScores,
          lastRoundSummary: summary,
          winnerId: matchWinnerId,
        },
        events: [
          {
            type: "ROUND_RESOLVED",
            payload: { winnerId: matchWinnerId, outcome },
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
        guesses: nextGuesses,
        scores: nextScores,
        lastRoundSummary: summary,
      },
      events: [
        {
          type: "ROUND_RESOLVED",
          payload: {
            winnerId: roundWinnerId ?? null,
            outcome,
            roundNumber: state.roundNumber,
          },
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

    return {
      newState: {
        ...state,
        phase: "SELECT_CHARACTER",
        roundNumber: state.roundNumber + 1,
        ...createEmptyRoundFields(state.playerIds),
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
    const myGuessCharacterId = state.guesses[playerId] ?? null;
    const opponentGuess = state.guesses[opponentId] ?? null;
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
      myGuessCharacterId,
      myGuessSubmitted: myGuessCharacterId !== null,
      opponentGuessSubmitted: opponentGuess !== null,
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
