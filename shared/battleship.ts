export const BATTLESHIP_GRID_SIZE = 10;
export const BATTLESHIP_MINE_COUNT = 2;
export const BATTLESHIP_MAX_SHOTS_PER_TURN = 2;

export type ShipId =
  | "carrier"
  | "battleship"
  | "cruiser"
  | "submarine"
  | "destroyer";

export type ShipOrientation = "H" | "V";
export type ShiftDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type SkillId = "SONAR_PING" | "CROSS_STRIKE" | "SHIFT_SHIP";
export type BattleshipPhase = "SETUP_FLEET" | "BATTLE" | "MATCH_END";
export type ShotOutcome = "MISS" | "HIT" | "SUNK" | "MINE_HIT";

export interface ShipSpec {
  id: ShipId;
  name: string;
  shortName: string;
  size: number;
  skillId?: SkillId;
  skillName?: string;
}

export const BATTLESHIP_FLEET: readonly ShipSpec[] = [
  {
    id: "carrier",
    name: "Kapal Induk",
    shortName: "IND",
    size: 5,
    skillId: "CROSS_STRIKE",
    skillName: "Cross Strike (+)",
  },
  {
    id: "battleship",
    name: "Kapal Perang",
    shortName: "PRG",
    size: 4,
  },
  {
    id: "cruiser",
    name: "Penjelajah",
    shortName: "PNJ",
    size: 3,
  },
  {
    id: "submarine",
    name: "Kapal Selam",
    shortName: "SLM",
    size: 3,
    skillId: "SONAR_PING",
    skillName: "Sonar 3×3",
  },
  {
    id: "destroyer",
    name: "Perusak",
    shortName: "PRS",
    size: 2,
    skillId: "SHIFT_SHIP",
    skillName: "Geser Kapal",
  },
] as const;

export const TOTAL_FLEET_CELLS = BATTLESHIP_FLEET.reduce(
  (sum, s) => sum + s.size,
  0
);

export interface GridCoord {
  row: number;
  col: number;
}

export interface PlacedShip {
  id: ShipId;
  row: number;
  col: number;
  orientation: ShipOrientation;
}

export interface ShotRecord {
  nonce: number;
  row: number;
  col: number;
  outcome: ShotOutcome;
  sunkShipId?: ShipId;
  isRicochet?: boolean;
}

export interface SonarPingResult {
  centerRow: number;
  centerCol: number;
  detectedShipCells: number;
  detectedMines: number;
}

export interface SkillStatusView {
  used: boolean;
  shipAlive: boolean;
}

export type BattleshipAction =
  | { type: "LOCK_FLEET"; ships: PlacedShip[]; mines: GridCoord[] }
  | { type: "FIRE_SHOT"; row: number; col: number }
  | { type: "USE_SONAR"; centerRow: number; centerCol: number }
  | { type: "USE_CROSS_STRIKE"; row: number; col: number }
  | { type: "USE_SHIFT_SHIP"; shipId: ShipId; direction: ShiftDirection };

export interface BattleshipView {
  phase: BattleshipPhase;
  gridSize: number;
  currentTurnPlayerId: string;
  shotsUsedThisTurn: number;
  maxShotsPerTurn: number;
  myFleetLocked: boolean;
  opponentFleetLocked: boolean;
  myShips: PlacedShip[];
  myMines: GridCoord[];
  incomingShots: ShotRecord[];
  myShots: ShotRecord[];
  opponentSunkShips: PlacedShip[];
  opponentAliveShipsCount: number;
  myAliveShipsCount: number;
  mySunkShipIds: ShipId[];
  skills: Record<SkillId, SkillStatusView>;
  lastSonarResult: SonarPingResult | null;
  lastBanner: string | null;
  revealedOpponentShips: PlacedShip[] | null;
  revealedOpponentMines: GridCoord[] | null;
  winnerId: string | null;
}

export function isCoordInBounds(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < BATTLESHIP_GRID_SIZE &&
    col >= 0 &&
    col < BATTLESHIP_GRID_SIZE
  );
}

export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function getShipSize(shipId: ShipId): number {
  return BATTLESHIP_FLEET.find((s) => s.id === shipId)?.size ?? 0;
}

export function getShipCells(ship: PlacedShip): GridCoord[] {
  const size = getShipSize(ship.id);
  const cells: GridCoord[] = [];
  for (let i = 0; i < size; i++) {
    cells.push({
      row: ship.orientation === "V" ? ship.row + i : ship.row,
      col: ship.orientation === "H" ? ship.col + i : ship.col,
    });
  }
  return cells;
}

export function canPlaceShip(
  existingShips: readonly PlacedShip[],
  mines: readonly GridCoord[],
  candidate: PlacedShip
): boolean {
  const cells = getShipCells(candidate);
  if (cells.length === 0) return false;

  const occupied = new Set<string>();
  for (const s of existingShips) {
    if (s.id === candidate.id) continue;
    for (const c of getShipCells(s)) {
      occupied.add(coordKey(c.row, c.col));
    }
  }
  for (const m of mines) {
    occupied.add(coordKey(m.row, m.col));
  }

  for (const cell of cells) {
    if (!isCoordInBounds(cell.row, cell.col)) return false;
    if (occupied.has(coordKey(cell.row, cell.col))) return false;
  }
  return true;
}

export function generateRandomFleetAndMines(
  rng: () => number = Math.random
): { ships: PlacedShip[]; mines: GridCoord[] } {
  const ships: PlacedShip[] = [];

  for (const spec of BATTLESHIP_FLEET) {
    const validPlacements: PlacedShip[] = [];
    for (const orientation of ["H", "V"] as const) {
      for (let r = 0; r < BATTLESHIP_GRID_SIZE; r++) {
        for (let c = 0; c < BATTLESHIP_GRID_SIZE; c++) {
          const candidate: PlacedShip = { id: spec.id, row: r, col: c, orientation };
          if (canPlaceShip(ships, [], candidate)) {
            validPlacements.push(candidate);
          }
        }
      }
    }
    const chosen = validPlacements[Math.floor(rng() * validPlacements.length)]!;
    ships.push(chosen);
  }

  const occupied = new Set<string>();
  for (const s of ships) {
    for (const c of getShipCells(s)) {
      occupied.add(coordKey(c.row, c.col));
    }
  }

  const freeCells: GridCoord[] = [];
  for (let r = 0; r < BATTLESHIP_GRID_SIZE; r++) {
    for (let c = 0; c < BATTLESHIP_GRID_SIZE; c++) {
      if (!occupied.has(coordKey(r, c))) {
        freeCells.push({ row: r, col: c });
      }
    }
  }

  const mines: GridCoord[] = [];
  for (let i = 0; i < BATTLESHIP_MINE_COUNT && freeCells.length > 0; i++) {
    const idx = Math.floor(rng() * freeCells.length);
    mines.push(freeCells.splice(idx, 1)[0]!);
  }

  return { ships, mines };
}
