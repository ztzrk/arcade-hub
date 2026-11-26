import type {
  CourtSlotId,
  FormationId,
  HaikyuuPlayer,
  LineupMap,
  SchoolPack,
  TeamEvaluation,
} from "./haikyuuHaruko.ts";

export type HaikyuuDraftPhase = "DRAFT" | "TACTICS" | "MATCH" | "MATCH_END";

export interface HaikyuuDraftCandidate {
  player: HaikyuuPlayer;
  claimedByPlayerId: string | null;
}

export interface PvpSetScore {
  setNumber: number;
  scores: Record<string, number>;
  winnerId: string;
  highlight: string;
}

export type HaikyuuDraftAction =
  | { type: "CLAIM_PLAYER"; playerId: string; slotId?: CourtSlotId }
  | { type: "PLACE_PLAYER"; slotId: CourtSlotId }
  | { type: "SWAP_SLOTS"; slotA: CourtSlotId; slotB: CourtSlotId }
  | { type: "SET_FORMATION"; formationId: FormationId }
  | { type: "LOCK_TACTICS" }
  | { type: "READY_NEXT_SET" };

export interface HaikyuuDraftPlayerView {
  lineup: LineupMap;
  pendingPlayer: HaikyuuPlayer | null;
  formationId: FormationId | null;
  tacticsLocked: boolean;
  evaluation: TeamEvaluation;
}

export interface HaikyuuDraftView {
  phase: HaikyuuDraftPhase;
  roundNumber: number;
  totalRounds: number;
  phaseDeadlineAt: number | null;
  phaseDurationMs: number;
  currentPack: SchoolPack | null;
  candidates: HaikyuuDraftCandidate[];
  me: HaikyuuDraftPlayerView;
  opponent: HaikyuuDraftPlayerView;
  setsWon: Record<string, number>;
  setScores: PvpSetScore[];
  bestOf: 3;
  readyForNextSet: Record<string, boolean>;
  tacticalEdgeSummary: string | null;
  winnerId: string | null;
}
