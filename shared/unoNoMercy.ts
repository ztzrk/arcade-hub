export const UNO_STARTING_HAND_SIZE = 7;
export const UNO_MERCY_KO_LIMIT = 20;
export const UNO_TARGET_WINS = 2;

export type UnoColor = "RED" | "YELLOW" | "GREEN" | "BLUE";
export type UnoCardColor = UnoColor | "WILD";

export type UnoCardKind =
  | "NUMBER"
  | "SKIP"
  | "REVERSE"
  | "DRAW_2"
  | "DISCARD_ALL"
  | "WILD"
  | "WILD_DRAW_4"
  | "WILD_DRAW_6"
  | "WILD_DRAW_10";

export interface UnoCard {
  id: string;
  color: UnoCardColor;
  kind: UnoCardKind;
  /** Present when kind === "NUMBER" (0..9) */
  value?: number;
}

export type UnoPhase = "PLAYING" | "ROUND_END" | "MATCH_END";

export type UnoAction =
  | { type: "PLAY_CARD"; cardId: string; chosenColor?: UnoColor }
  | { type: "DRAW_CARD" }
  | { type: "ACCEPT_DRAW" }
  | { type: "CALL_UNO" }
  | { type: "CATCH_UNO" }
  | { type: "NEXT_ROUND" };

export type UnoRoundEndReason = "EMPTY_HAND" | "MERCY_KO";

export interface UnoRoundSummary {
  roundNumber: number;
  winnerId: string;
  loserId: string;
  reason: UnoRoundEndReason;
  loserCardCount: number;
}

export interface UnoLastAction {
  nonce: number;
  playerId: string;
  kind:
    | "PLAY"
    | "DRAW"
    | "PASS"
    | "ACCEPT_DRAW"
    | "SWAP_HANDS"
    | "CALL_UNO"
    | "CATCH_UNO";
  card?: UnoCard;
  discardedCount?: number;
  drawCount?: number;
  chosenColor?: UnoColor;
  detail: string;
}

export interface UnoView {
  phase: UnoPhase;
  roundNumber: number;
  targetWins: number;
  mercyLimit: number;
  scores: Record<string, number>;
  currentTurnPlayerId: string;
  myHand: UnoCard[];
  opponentCardCount: number;
  deckCount: number;
  topCard: UnoCard;
  previousCard: UnoCard | null;
  activeColor: UnoColor;
  pendingDraw: number;
  pendingDrawMinValue: number;
  unoCalled: Record<string, boolean>;
  canCallUno: boolean;
  canCatchOpponent: boolean;
  playableCardIds: string[];
  readyForNextRound: Record<string, boolean>;
  lastAction: UnoLastAction | null;
  lastRoundSummary: UnoRoundSummary | null;
  winnerId: string | null;
}

export const UNO_COLORS: readonly UnoColor[] = [
  "RED",
  "YELLOW",
  "GREEN",
  "BLUE",
] as const;

export const UNO_COLOR_META: Record<
  UnoColor,
  { label: string; hex: string; softBg: string; border: string }
> = {
  RED: {
    label: "Merah",
    hex: "#dc3c32",
    softBg: "bg-[#dc3c32]/15",
    border: "border-[#dc3c32]/65",
  },
  YELLOW: {
    label: "Kuning",
    hex: "#eab308",
    softBg: "bg-[#eab308]/15",
    border: "border-[#eab308]/65",
  },
  GREEN: {
    label: "Hijau",
    hex: "#16a34a",
    softBg: "bg-[#16a34a]/15",
    border: "border-[#16a34a]/65",
  },
  BLUE: {
    label: "Biru",
    hex: "#2563eb",
    softBg: "bg-[#2563eb]/15",
    border: "border-[#2563eb]/65",
  },
};

export function getUnoDrawValue(kind: UnoCardKind): number {
  switch (kind) {
    case "DRAW_2":
      return 2;
    case "WILD_DRAW_4":
      return 4;
    case "WILD_DRAW_6":
      return 6;
    case "WILD_DRAW_10":
      return 10;
    default:
      return 0;
  }
}

export function isUnoCardPlayable(
  card: UnoCard,
  topCard: UnoCard,
  activeColor: UnoColor,
  pendingDraw: number,
  pendingDrawMinValue: number
): boolean {
  const drawVal = getUnoDrawValue(card.kind);
  if (pendingDraw > 0) {
    return drawVal > 0 && drawVal >= pendingDrawMinValue;
  }

  if (card.color === "WILD") {
    return true;
  }
  if (card.color === activeColor) {
    return true;
  }
  if (card.kind === "NUMBER" && topCard.kind === "NUMBER") {
    return card.value !== undefined && card.value === topCard.value;
  }
  if (card.kind !== "NUMBER" && card.kind === topCard.kind) {
    return true;
  }
  return false;
}

export function formatUnoCardLabel(card: UnoCard): string {
  const colorLabel =
    card.color === "WILD" ? "Wild" : UNO_COLOR_META[card.color].label;
  switch (card.kind) {
    case "NUMBER":
      return card.value === 0
        ? `0 (Tukar Tangan) ${colorLabel}`
        : `${card.value ?? 0} ${colorLabel}`;
    case "SKIP":
      return `Skip ${colorLabel}`;
    case "REVERSE":
      return `Reverse ${colorLabel}`;
    case "DRAW_2":
      return `+2 ${colorLabel}`;
    case "DISCARD_ALL":
      return `Buang Semua ${colorLabel}`;
    case "WILD":
      return "Wild Pilih Warna";
    case "WILD_DRAW_4":
      return "Wild +4";
    case "WILD_DRAW_6":
      return "Wild +6";
    case "WILD_DRAW_10":
      return "Wild +10";
  }
}
