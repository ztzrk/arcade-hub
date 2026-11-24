export const ULAR_TANGGA_BOARD_SIZE = 10;
export const ULAR_TANGGA_MAX_TILE = 100;
export const ULAR_TANGGA_MAX_HAND = 3;
export const ULAR_TANGGA_TRAP_PENALTY = 5;

export interface BoardLink {
  from: number;
  to: number;
}

export const ULAR_TANGGA_LADDERS: readonly BoardLink[] = [
  { from: 4, to: 25 },
  { from: 13, to: 46 },
  { from: 33, to: 49 },
  { from: 42, to: 63 },
  { from: 50, to: 69 },
  { from: 62, to: 81 },
  { from: 74, to: 92 },
] as const;

export const ULAR_TANGGA_SNAKES: readonly BoardLink[] = [
  { from: 27, to: 5 },
  { from: 40, to: 3 },
  { from: 43, to: 18 },
  { from: 54, to: 31 },
  { from: 66, to: 45 },
  { from: 76, to: 58 },
  { from: 89, to: 53 },
  { from: 97, to: 78 },
] as const;

export const ULAR_TANGGA_POWER_TILES: readonly number[] = [
  9, 15, 22, 29, 36, 47, 56, 60, 71, 80, 86, 94,
] as const;

export type UlarTanggaCardId =
  | "SHIELD"
  | "TURBO_DICE"
  | "SNIPER_DICE"
  | "TRAP_BOMB"
  | "SWAP_POS"
  | "MINI_CURSE";

export interface UlarTanggaCardMeta {
  id: UlarTanggaCardId;
  name: string;
  shortDesc: string;
  emoji: string;
  accent: string;
  weight: number;
}

export const ULAR_TANGGA_CARDS: Record<UlarTanggaCardId, UlarTanggaCardMeta> = {
  SHIELD: {
    id: "SHIELD",
    name: "Perisai",
    shortDesc: "Tangkal 1x gigitan ular, bom, atau sabotase lawan.",
    emoji: "🛡️",
    accent: "#38bdf8",
    weight: 22,
  },
  TURBO_DICE: {
    id: "TURBO_DICE",
    name: "Dadu Turbo",
    shortDesc: "Lempar 2 dadu sekaligus (2–12 langkah) di giliran ini.",
    emoji: "⚡",
    accent: "#f59e0b",
    weight: 22,
  },
  SNIPER_DICE: {
    id: "SNIPER_DICE",
    name: "Dadu Presisi",
    shortDesc: "Pilih sendiri angka dadu 1–6 di giliran ini.",
    emoji: "🎯",
    accent: "#34d399",
    weight: 16,
  },
  TRAP_BOMB: {
    id: "TRAP_BOMB",
    name: "Bom Jebakan",
    shortDesc: "Taruh bom di petak 5–98; lawan mundur 5 petak jika menginjaknya.",
    emoji: "💣",
    accent: "#f87171",
    weight: 18,
  },
  SWAP_POS: {
    id: "SWAP_POS",
    name: "Tukar Posisi",
    shortDesc: "Tukar posisimu langsung dengan posisi lawan di papan.",
    emoji: "🔄",
    accent: "#c084fc",
    weight: 10,
  },
  MINI_CURSE: {
    id: "MINI_CURSE",
    name: "Dadu Beku",
    shortDesc: "Kutuk giliran depan lawan agar dadunya hanya keluar 1–3.",
    emoji: "❄️",
    accent: "#60a5fa",
    weight: 12,
  },
};

export type UlarTanggaDiceBuff = "TURBO" | "SNIPER";

export interface UlarTanggaTrap {
  tile: number;
  ownerId: string;
}

export interface UlarTanggaLastMove {
  nonce: number;
  playerId: string;
  dice: number[];
  totalRoll: number;
  fromTile: number;
  landedTile: number;
  bounced: boolean;
  trapTile: number | null;
  trapBlockedByShield: boolean;
  portalKind: "LADDER" | "SNAKE" | "SNAKE_BLOCKED" | null;
  portalFrom: number | null;
  portalTo: number | null;
  toTile: number;
  drawnCard: UlarTanggaCardId | null;
  bonusRollGranted: boolean;
}

export interface UlarTanggaCardEffect {
  nonce: number;
  playerId: string;
  cardId: UlarTanggaCardId;
  blockedByShield: boolean;
  detail: string;
}

export type UlarTanggaPhase = "PLAYING" | "MATCH_END";

export type UlarTanggaAction =
  | { type: "ROLL_DICE"; chosenRoll?: number }
  | { type: "PLAY_CARD"; cardIndex: number; targetTile?: number };

export interface UlarTanggaView {
  phase: UlarTanggaPhase;
  turnNumber: number;
  currentTurnPlayerId: string;
  positions: Record<string, number>;
  shielded: Record<string, boolean>;
  miniCursed: Record<string, boolean>;
  myHand: UlarTanggaCardId[];
  opponentCardCount: number;
  activeDiceBuff: UlarTanggaDiceBuff | null;
  cardPlayedThisTurn: boolean;
  usedBonusRollThisTurn: boolean;
  traps: UlarTanggaTrap[];
  lastMove: UlarTanggaLastMove | null;
  lastCardEffect: UlarTanggaCardEffect | null;
  winnerId: string | null;
}

/**
 * Converts a 1..100 board tile number into 0-based (row, col) coordinates
 * where row 0 is the top row (91..100) and row 9 is the bottom row (1..10).
 */
export function tileToGridCoord(tile: number): { row: number; col: number } {
  const clamped = Math.max(1, Math.min(ULAR_TANGGA_MAX_TILE, Math.floor(tile)));
  const zeroBased = clamped - 1;
  const rowFromBottom = Math.floor(zeroBased / ULAR_TANGGA_BOARD_SIZE);
  const row = ULAR_TANGGA_BOARD_SIZE - 1 - rowFromBottom;
  const offsetInRow = zeroBased % ULAR_TANGGA_BOARD_SIZE;
  const col =
    rowFromBottom % 2 === 0
      ? offsetInRow
      : ULAR_TANGGA_BOARD_SIZE - 1 - offsetInRow;
  return { row, col };
}

/**
 * Converts 0-based (row, col) grid coordinates into the 1..100 tile number.
 */
export function gridCoordToTile(row: number, col: number): number {
  const rowFromBottom = ULAR_TANGGA_BOARD_SIZE - 1 - row;
  const offsetInRow =
    rowFromBottom % 2 === 0 ? col : ULAR_TANGGA_BOARD_SIZE - 1 - col;
  return rowFromBottom * ULAR_TANGGA_BOARD_SIZE + offsetInRow + 1;
}

const SPECIAL_TILES = new Set<number>([
  ...ULAR_TANGGA_LADDERS.flatMap((l) => [l.from, l.to]),
  ...ULAR_TANGGA_SNAKES.flatMap((s) => [s.from, s.to]),
  ...ULAR_TANGGA_POWER_TILES,
]);

/**
 * Checks whether a tile is valid for placing a trap bomb.
 */
export function isTrapTileEligible(
  tile: number,
  occupiedPositions: number[],
  existingTraps: readonly UlarTanggaTrap[]
): boolean {
  if (!Number.isInteger(tile) || tile < 5 || tile > 98) {
    return false;
  }
  if (SPECIAL_TILES.has(tile)) {
    return false;
  }
  if (occupiedPositions.includes(tile)) {
    return false;
  }
  if (existingTraps.some((t) => t.tile === tile)) {
    return false;
  }
  return true;
}
