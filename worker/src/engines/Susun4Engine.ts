import {
  SUSUN_4_COLS,
  SUSUN_4_ROWS,
  type GameEvent,
  type Susun4Action,
  type Susun4LastDrop,
  type Susun4Phase,
  type Susun4RoundEndReason,
  type Susun4RoundSummary,
  type Susun4TwistInfo,
  type Susun4TwistKind,
  type Susun4View,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const TARGET_WINS = 2;
const MIN_COINS_FOR_TWIST = 5;
const TWIST_COOLDOWN_MOVES = 2;
const TWIST_PROBABILITY = 0.28;

export interface Susun4State {
  playerIds: [string, string];
  phase: Susun4Phase;
  roundNumber: number;
  scores: Record<string, number>;
  board: (string | null)[][];
  currentTurnPlayerId: string;
  moveCount: number;
  turnsSinceLastTwist: number;
  dropNonce: number;
  twistNonce: number;
  lastDrop: Susun4LastDrop | null;
  lastTwist: Susun4TwistInfo | null;
  winningCells: [number, number][];
  readyForNextRound: Record<string, boolean>;
  lastRoundSummary: Susun4RoundSummary | null;
  winnerId: string | null;
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

function createEmptyBoard(): (string | null)[][] {
  return Array.from({ length: SUSUN_4_ROWS }, () =>
    Array.from({ length: SUSUN_4_COLS }, () => null)
  );
}

function cloneBoard(board: (string | null)[][]): (string | null)[][] {
  return board.map((row) => [...row]);
}

function findDropRow(board: (string | null)[][], col: number): number {
  for (let r = SUSUN_4_ROWS - 1; r >= 0; r--) {
    if (board[r]![col] === null) {
      return r;
    }
  }
  return -1;
}

function countCoins(board: (string | null)[][]): number {
  let count = 0;
  for (let r = 0; r < SUSUN_4_ROWS; r++) {
    for (let c = 0; c < SUSUN_4_COLS; c++) {
      if (board[r]![c] !== null) count += 1;
    }
  }
  return count;
}

function isBoardFull(board: (string | null)[][]): boolean {
  for (let c = 0; c < SUSUN_4_COLS; c++) {
    if (board[0]![c] === null) return false;
  }
  return true;
}

const DIRECTIONS: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function findAllConnect4(board: (string | null)[][]): {
  winners: string[];
  cellsByPlayer: Record<string, [number, number][]>;
} {
  const cellSets: Record<string, Set<string>> = {};

  for (let r = 0; r < SUSUN_4_ROWS; r++) {
    for (let c = 0; c < SUSUN_4_COLS; c++) {
      const owner = board[r]![c];
      if (!owner) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const endR = r + dr * 3;
        const endC = c + dc * 3;
        if (
          endR < 0 ||
          endR >= SUSUN_4_ROWS ||
          endC < 0 ||
          endC >= SUSUN_4_COLS
        ) {
          continue;
        }

        let matches = true;
        for (let step = 1; step < 4; step++) {
          if (board[r + dr * step]![c + dc * step] !== owner) {
            matches = false;
            break;
          }
        }
        if (matches) {
          let set = cellSets[owner];
          if (!set) {
            set = new Set<string>();
            cellSets[owner] = set;
          }
          for (let step = 0; step < 4; step++) {
            set.add(`${r + dr * step},${c + dc * step}`);
          }
        }
      }
    }
  }

  const winners = Object.keys(cellSets);
  const cellsByPlayer: Record<string, [number, number][]> = {};
  for (const playerId of winners) {
    cellsByPlayer[playerId] = Array.from(cellSets[playerId]!).map((key) => {
      const [rStr, cStr] = key.split(",");
      return [Number(rStr), Number(cStr)];
    });
  }

  return { winners, cellsByPlayer };
}

function getFlippableColumns(board: (string | null)[][]): number[] {
  const flippable: number[] = [];
  for (let c = 0; c < SUSUN_4_COLS; c++) {
    const coins: string[] = [];
    for (let r = 0; r < SUSUN_4_ROWS; r++) {
      const val = board[r]?.[c];
      if (val) coins.push(val);
    }
    if (coins.length < 2) continue;

    // Only flip columns where reversing order visibly changes the column
    let changesOrder = false;
    for (let i = 0; i < coins.length; i++) {
      if (coins[i] !== coins[coins.length - 1 - i]) {
        changesOrder = true;
        break;
      }
    }
    if (changesOrder) {
      flippable.push(c);
    }
  }
  return flippable;
}

function canShiftColumns(board: (string | null)[][]): boolean {
  const signatures = new Set<string>();
  for (let c = 0; c < SUSUN_4_COLS; c++) {
    let sig = "";
    for (let r = 0; r < SUSUN_4_ROWS; r++) {
      sig += board[r]![c] ?? ".";
      sig += "|";
    }
    signatures.add(sig);
  }
  return signatures.size > 1;
}

function applyFlipColumn(board: (string | null)[][], col: number): void {
  const stack: string[] = [];
  for (let r = SUSUN_4_ROWS - 1; r >= 0; r--) {
    const val = board[r]?.[col];
    if (val) stack.push(val);
  }
  const reversed = [...stack].reverse();
  for (let r = SUSUN_4_ROWS - 1; r >= 0; r--) {
    const idxFromBottom = SUSUN_4_ROWS - 1 - r;
    board[r]![col] = reversed[idxFromBottom] ?? null;
  }
}

function applyShiftColumns(
  board: (string | null)[][],
  direction: "LEFT" | "RIGHT"
): void {
  for (let r = 0; r < SUSUN_4_ROWS; r++) {
    const oldRow = [...board[r]!];
    for (let c = 0; c < SUSUN_4_COLS; c++) {
      const sourceCol =
        direction === "LEFT"
          ? (c + 1) % SUSUN_4_COLS
          : (c - 1 + SUSUN_4_COLS) % SUSUN_4_COLS;
      board[r]![c] = oldRow[sourceCol]!;
    }
  }
}

function pickAndApplyTwist(
  board: (string | null)[][],
  rng: () => number
): { kind: Susun4TwistKind; targetCol: number | null } | null {
  const flippableCols = getFlippableColumns(board);
  const shiftAllowed = canShiftColumns(board);

  if (flippableCols.length === 0 && !shiftAllowed) {
    return null;
  }

  let useFlip = false;
  if (flippableCols.length > 0 && shiftAllowed) {
    useFlip = rng() < 0.5;
  } else if (flippableCols.length > 0) {
    useFlip = true;
  }

  if (useFlip) {
    const colIdx = Math.floor(rng() * flippableCols.length) % flippableCols.length;
    const targetCol = flippableCols[colIdx]!;
    applyFlipColumn(board, targetCol);
    return { kind: "FLIP_COLUMN", targetCol };
  }

  const kind: Susun4TwistKind = rng() < 0.5 ? "SHIFT_LEFT" : "SHIFT_RIGHT";
  applyShiftColumns(board, kind === "SHIFT_LEFT" ? "LEFT" : "RIGHT");
  return { kind, targetCol: null };
}

/**
 * Connect 4 game engine with sudden random column flips and shifts.
 */
export class Susun4Engine
  implements IGameEngine<Susun4State, Susun4Action, Susun4View>
{
  readonly id = "susun-4";
  readonly name = "Susun 4 Putar";
  readonly tagline =
    "Susun 4 koin segaris — hati-hati, kolom bisa tiba-tiba terbalik atau bergeser!";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string]): Susun4State {
    const [p1, p2] = playerIds;
    const starterIndex = this.rng() < 0.5 ? 0 : 1;
    return {
      playerIds,
      phase: "PLAYING",
      roundNumber: 1,
      scores: { [p1]: 0, [p2]: 0 },
      board: createEmptyBoard(),
      currentTurnPlayerId: playerIds[starterIndex]!,
      moveCount: 0,
      turnsSinceLastTwist: 0,
      dropNonce: 0,
      twistNonce: 0,
      lastDrop: null,
      lastTwist: null,
      winningCells: [],
      readyForNextRound: { [p1]: false, [p2]: false },
      lastRoundSummary: null,
      winnerId: null,
    };
  }

  handleAction(
    state: Susun4State,
    playerId: string,
    action: Susun4Action
  ): EngineResult<Susun4State> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }
    getOpponentId(state.playerIds, playerId);

    switch (action.type) {
      case "DROP_COIN":
        return this.handleDropCoin(state, playerId, action.col);
      case "NEXT_ROUND":
        return this.handleNextRound(state, playerId);
      default:
        throw new EngineError("INVALID_ACTION", "Aksi tidak dikenali.");
    }
  }

  private handleDropCoin(
    state: Susun4State,
    playerId: string,
    col: number
  ): EngineResult<Susun4State> {
    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Ronde sedang tidak berjalan.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Sekarang bukan giliranmu.");
    }
    if (!Number.isInteger(col) || col < 0 || col >= SUSUN_4_COLS) {
      throw new EngineError("INVALID_ACTION", "Kolom tidak valid.");
    }

    const dropRow = findDropRow(state.board, col);
    if (dropRow === -1) {
      throw new EngineError("INVALID_ACTION", "Kolom tersebut sudah penuh.");
    }

    const nextBoard = cloneBoard(state.board);
    nextBoard[dropRow]![col] = playerId;

    const nextMoveCount = state.moveCount + 1;
    const nextDropNonce = state.dropNonce + 1;
    const lastDrop: Susun4LastDrop = {
      nonce: nextDropNonce,
      row: dropRow,
      col,
      playerId,
    };

    const events: GameEvent[] = [
      {
        type: "COIN_DROPPED",
        payload: { playerId, row: dropRow, col },
      },
    ];

    const directCheck = findAllConnect4(nextBoard);
    if (directCheck.winners.length === 1) {
      const winnerId = directCheck.winners[0]!;
      return this.finishRound(
        state,
        nextBoard,
        nextMoveCount,
        state.turnsSinceLastTwist + 1,
        nextDropNonce,
        state.twistNonce,
        lastDrop,
        state.lastTwist,
        winnerId,
        "CONNECT_4",
        directCheck.cellsByPlayer[winnerId]!,
        events
      );
    }

    let nextTurnsSinceTwist = state.turnsSinceLastTwist + 1;
    let nextTwistNonce = state.twistNonce;
    let nextLastTwist = state.lastTwist;

    const totalCoins = countCoins(nextBoard);
    if (
      totalCoins >= MIN_COINS_FOR_TWIST &&
      nextTurnsSinceTwist >= TWIST_COOLDOWN_MOVES &&
      this.rng() < TWIST_PROBABILITY
    ) {
      const twistResult = pickAndApplyTwist(nextBoard, this.rng);
      if (twistResult) {
        nextTurnsSinceTwist = 0;
        nextTwistNonce += 1;
        nextLastTwist = {
          nonce: nextTwistNonce,
          moveCount: nextMoveCount,
          kind: twistResult.kind,
          targetCol: twistResult.targetCol,
          triggerPlayerId: playerId,
        };
        events.push({
          type: "BOARD_TWIST",
          payload: {
            kind: twistResult.kind,
            targetCol: twistResult.targetCol,
          },
        });

        const twistCheck = findAllConnect4(nextBoard);
        if (twistCheck.winners.length === 1) {
          const winnerId = twistCheck.winners[0]!;
          return this.finishRound(
            state,
            nextBoard,
            nextMoveCount,
            nextTurnsSinceTwist,
            nextDropNonce,
            nextTwistNonce,
            lastDrop,
            nextLastTwist,
            winnerId,
            "TWIST_CONNECT_4",
            twistCheck.cellsByPlayer[winnerId]!,
            events
          );
        }
        if (twistCheck.winners.length >= 2) {
          const combinedCells = twistCheck.winners.flatMap(
            (id) => twistCheck.cellsByPlayer[id] ?? []
          );
          return this.finishRound(
            state,
            nextBoard,
            nextMoveCount,
            nextTurnsSinceTwist,
            nextDropNonce,
            nextTwistNonce,
            lastDrop,
            nextLastTwist,
            null,
            "DRAW_BOTH_CONNECT_4",
            combinedCells,
            events
          );
        }
      }
    }

    if (isBoardFull(nextBoard)) {
      return this.finishRound(
        state,
        nextBoard,
        nextMoveCount,
        nextTurnsSinceTwist,
        nextDropNonce,
        nextTwistNonce,
        lastDrop,
        nextLastTwist,
        null,
        "DRAW_BOARD_FULL",
        [],
        events
      );
    }

    const opponentId = getOpponentId(state.playerIds, playerId);
    return {
      newState: {
        ...state,
        board: nextBoard,
        currentTurnPlayerId: opponentId,
        moveCount: nextMoveCount,
        turnsSinceLastTwist: nextTurnsSinceTwist,
        dropNonce: nextDropNonce,
        twistNonce: nextTwistNonce,
        lastDrop,
        lastTwist: nextLastTwist,
      },
      events,
    };
  }

  private finishRound(
    state: Susun4State,
    board: (string | null)[][],
    moveCount: number,
    turnsSinceLastTwist: number,
    dropNonce: number,
    twistNonce: number,
    lastDrop: Susun4LastDrop,
    lastTwist: Susun4TwistInfo | null,
    roundWinnerId: string | null,
    reason: Susun4RoundEndReason,
    winningCells: [number, number][],
    events: GameEvent[]
  ): EngineResult<Susun4State> {
    const nextScores = { ...state.scores };
    if (roundWinnerId) {
      nextScores[roundWinnerId] = (nextScores[roundWinnerId] ?? 0) + 1;
    }

    const matchWon =
      roundWinnerId !== null && (nextScores[roundWinnerId] ?? 0) >= TARGET_WINS;
    const [p1, p2] = state.playerIds;

    const summary: Susun4RoundSummary = {
      roundNumber: state.roundNumber,
      winnerId: roundWinnerId,
      reason,
      winningCells,
    };

    events.push({
      type: roundWinnerId ? "ROUND_WON" : "ROUND_DRAW",
      payload: { winnerId: roundWinnerId, reason },
    });

    const newState: Susun4State = {
      ...state,
      phase: matchWon ? "MATCH_END" : "ROUND_END",
      scores: nextScores,
      board,
      moveCount,
      turnsSinceLastTwist,
      dropNonce,
      twistNonce,
      lastDrop,
      lastTwist,
      winningCells,
      readyForNextRound: { [p1]: false, [p2]: false },
      lastRoundSummary: summary,
      winnerId: matchWon ? roundWinnerId : null,
    };

    return {
      newState,
      events,
      roundWinnerId: roundWinnerId ?? undefined,
      matchWinnerId: matchWon ? roundWinnerId : undefined,
    };
  }

  private handleNextRound(
    state: Susun4State,
    playerId: string
  ): EngineResult<Susun4State> {
    if (state.phase !== "ROUND_END") {
      throw new EngineError("INVALID_ACTION", "Belum bisa lanjut ke ronde berikutnya.");
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

    return {
      newState: {
        ...state,
        phase: "PLAYING",
        roundNumber: nextRound,
        board: createEmptyBoard(),
        currentTurnPlayerId: starterId,
        moveCount: 0,
        turnsSinceLastTwist: 0,
        lastDrop: null,
        lastTwist: null,
        winningCells: [],
        readyForNextRound: { [p1]: false, [p2]: false },
      },
      events: [{ type: "ROUND_STARTED", payload: { roundNumber: nextRound } }],
    };
  }

  getViewForPlayer(state: Susun4State, playerId: string): Susun4View {
    getOpponentId(state.playerIds, playerId);
    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      targetWins: TARGET_WINS,
      scores: state.scores,
      board: state.board,
      currentTurnPlayerId: state.currentTurnPlayerId,
      moveCount: state.moveCount,
      lastDrop: state.lastDrop,
      lastTwist: state.lastTwist,
      winningCells: state.winningCells,
      readyForNextRound: state.readyForNextRound,
      lastRoundSummary: state.lastRoundSummary,
      winnerId: state.winnerId,
    };
  }
}

export const susun4Engine = new Susun4Engine();
