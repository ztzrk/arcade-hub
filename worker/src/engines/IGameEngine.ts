import type { ErrorCode, GameEvent } from "@arcade-hub/shared";

export interface EngineResult<TState> {
  newState: TState;
  events: GameEvent[];
  roundWinnerId?: string;
  matchWinnerId?: string;
}

export class EngineError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}

export interface IGameEngine<TState = unknown, TAction = unknown, TView = unknown> {
  readonly id: string;
  readonly name: string;
  readonly tagline: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;

  initState(playerIds: [string, string], now?: number): TState;
  handleAction(
    state: TState,
    playerId: string,
    action: TAction,
    now?: number
  ): EngineResult<TState>;
  getViewForPlayer(state: TState, playerId: string): TView;
  getNextTimeoutAt?(state: TState): number | null;
  handleTimeout?(state: TState, now: number): EngineResult<TState> | null;
}
