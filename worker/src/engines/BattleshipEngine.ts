import {
  BATTLESHIP_FLEET,
  BATTLESHIP_GRID_SIZE,
  BATTLESHIP_MAX_SHOTS_PER_TURN,
  BATTLESHIP_MINE_COUNT,
  TOTAL_FLEET_CELLS,
  coordKey,
  getShipCells,
  isCoordInBounds,
  type BattleshipAction,
  type BattleshipPhase,
  type BattleshipView,
  type GameEvent,
  type GridCoord,
  type PlacedShip,
  type ShiftDirection,
  type ShipId,
  type ShotRecord,
  type SkillId,
  type SkillStatusView,
  type SonarPingResult,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const SHIP_SPEC_MAP = new Map(BATTLESHIP_FLEET.map((s) => [s.id, s]));

const SHIFT_DELTAS: Record<ShiftDirection, [number, number]> = {
  UP: [-1, 0],
  DOWN: [1, 0],
  LEFT: [0, -1],
  RIGHT: [0, 1],
};

export interface BattleshipState {
  playerIds: [string, string];
  phase: BattleshipPhase;
  currentTurnPlayerId: string;
  shotsUsedThisTurn: number;
  nonceCounter: number;
  fleets: Record<string, PlacedShip[] | null>;
  mines: Record<string, GridCoord[]>;
  shotsBy: Record<string, ShotRecord[]>;
  skillsUsed: Record<string, Record<SkillId, boolean>>;
  lastSonarBy: Record<string, SonarPingResult | null>;
  lastBannerBy: Record<string, string | null>;
  winnerId: string | null;
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

function createEmptySkillFlags(): Record<SkillId, boolean> {
  return {
    SONAR_PING: false,
    CROSS_STRIKE: false,
    SHIFT_SHIP: false,
  };
}

function validateFleetAndMines(
  ships: readonly PlacedShip[],
  mines: readonly GridCoord[]
): { validatedShips: PlacedShip[]; validatedMines: GridCoord[] } {
  if (!Array.isArray(ships) || ships.length !== BATTLESHIP_FLEET.length) {
    throw new EngineError(
      "INVALID_ACTION",
      `Armada harus berisi tepat ${BATTLESHIP_FLEET.length} kapal.`
    );
  }
  if (!Array.isArray(mines) || mines.length !== BATTLESHIP_MINE_COUNT) {
    throw new EngineError(
      "INVALID_ACTION",
      `Pasang tepat ${BATTLESHIP_MINE_COUNT} Ranjau Laut sebelum mengunci formasi.`
    );
  }

  const seenShipIds = new Set<ShipId>();
  const occupied = new Set<string>();
  const validatedShips: PlacedShip[] = [];

  for (const ship of ships) {
    if (!ship || !SHIP_SPEC_MAP.has(ship.id)) {
      throw new EngineError("INVALID_ACTION", "Tipe kapal tidak valid.");
    }
    if (seenShipIds.has(ship.id)) {
      throw new EngineError("INVALID_ACTION", "Setiap tipe kapal hanya boleh 1 buah.");
    }
    if (ship.orientation !== "H" && ship.orientation !== "V") {
      throw new EngineError("INVALID_ACTION", "Orientasi kapal harus H atau V.");
    }
    seenShipIds.add(ship.id);

    const cells = getShipCells(ship);
    for (const cell of cells) {
      if (!isCoordInBounds(cell.row, cell.col)) {
        throw new EngineError("INVALID_ACTION", "Kapal keluar dari batas grid laut.");
      }
      const key = coordKey(cell.row, cell.col);
      if (occupied.has(key)) {
        throw new EngineError("INVALID_ACTION", "Posisi kapal tidak boleh bertumpukan.");
      }
      occupied.add(key);
    }
    validatedShips.push({
      id: ship.id,
      row: ship.row,
      col: ship.col,
      orientation: ship.orientation,
    });
  }

  const validatedMines: GridCoord[] = [];
  for (const mine of mines) {
    if (!mine || !isCoordInBounds(mine.row, mine.col)) {
      throw new EngineError("INVALID_ACTION", "Posisi ranjau di luar grid.");
    }
    const key = coordKey(mine.row, mine.col);
    if (occupied.has(key)) {
      throw new EngineError(
        "INVALID_ACTION",
        "Ranjau harus ditaruh di petak air kosong (tidak bertumpuk dengan kapal atau ranjau lain)."
      );
    }
    occupied.add(key);
    validatedMines.push({ row: mine.row, col: mine.col });
  }

  return { validatedShips, validatedMines };
}

function getHitKeys(shots: readonly ShotRecord[]): Set<string> {
  const keys = new Set<string>();
  for (const shot of shots) {
    if (shot.outcome === "HIT" || shot.outcome === "SUNK") {
      keys.add(coordKey(shot.row, shot.col));
    }
  }
  return keys;
}

function getSunkShipIds(
  fleet: readonly PlacedShip[] | null,
  shotsAgainstFleet: readonly ShotRecord[]
): ShipId[] {
  if (!fleet) return [];
  const hitKeys = getHitKeys(shotsAgainstFleet);
  const sunk: ShipId[] = [];
  for (const ship of fleet) {
    const cells = getShipCells(ship);
    if (cells.every((c) => hitKeys.has(coordKey(c.row, c.col)))) {
      sunk.push(ship.id);
    }
  }
  return sunk;
}

function getUnhitShipCells(
  fleet: readonly PlacedShip[],
  shotsAgainstFleet: readonly ShotRecord[]
): { ship: PlacedShip; coord: GridCoord }[] {
  const hitKeys = getHitKeys(shotsAgainstFleet);
  const unhit: { ship: PlacedShip; coord: GridCoord }[] = [];
  for (const ship of fleet) {
    for (const coord of getShipCells(ship)) {
      if (!hitKeys.has(coordKey(coord.row, coord.col))) {
        unhit.push({ ship, coord });
      }
    }
  }
  return unhit;
}

function findShipAt(
  fleet: readonly PlacedShip[],
  row: number,
  col: number
): PlacedShip | null {
  const targetKey = coordKey(row, col);
  for (const ship of fleet) {
    for (const c of getShipCells(ship)) {
      if (coordKey(c.row, c.col) === targetKey) {
        return ship;
      }
    }
  }
  return null;
}

interface SingleShotResolution {
  shotsBy: Record<string, ShotRecord[]>;
  nonceCounter: number;
  outcome: ShotRecord["outcome"];
  sunkShipId?: ShipId;
  winnerId: string | null;
  ricochetTriggered: boolean;
}

function resolveSingleShot(
  fleets: Record<string, PlacedShip[] | null>,
  mines: Record<string, GridCoord[]>,
  shotsBy: Record<string, ShotRecord[]>,
  nonceCounter: number,
  attackerId: string,
  defenderId: string,
  row: number,
  col: number,
  rng: () => number
): SingleShotResolution {
  const defenderFleet = fleets[defenderId] ?? [];
  const attackerFleet = fleets[attackerId] ?? [];
  const defenderMines = mines[defenderId] ?? [];

  const nextShotsBy: Record<string, ShotRecord[]> = {
    [attackerId]: [...(shotsBy[attackerId] ?? [])],
    [defenderId]: [...(shotsBy[defenderId] ?? [])],
  };

  let nextNonce = nonceCounter + 1;
  const targetKey = coordKey(row, col);

  // 1. Check Sea Mine hit first
  const hitMine = defenderMines.some((m) => coordKey(m.row, m.col) === targetKey);
  if (hitMine) {
    nextShotsBy[attackerId]!.push({
      nonce: nextNonce,
      row,
      col,
      outcome: "MINE_HIT",
    });

    let winnerId: string | null = null;
    const unhitAttacker = getUnhitShipCells(attackerFleet, nextShotsBy[defenderId]!);
    if (unhitAttacker.length > 0) {
      const picked = unhitAttacker[Math.floor(rng() * unhitAttacker.length)]!;
      const existingAttackerHits = getHitKeys(nextShotsBy[defenderId]!);
      existingAttackerHits.add(coordKey(picked.coord.row, picked.coord.col));
      const shipNowSunk = getShipCells(picked.ship).every((c) =>
        existingAttackerHits.has(coordKey(c.row, c.col))
      );

      nextNonce += 1;
      nextShotsBy[defenderId]!.push({
        nonce: nextNonce,
        row: picked.coord.row,
        col: picked.coord.col,
        outcome: shipNowSunk ? "SUNK" : "HIT",
        sunkShipId: shipNowSunk ? picked.ship.id : undefined,
        isRicochet: true,
      });

      if (existingAttackerHits.size >= TOTAL_FLEET_CELLS) {
        winnerId = defenderId;
      }
    }

    return {
      shotsBy: nextShotsBy,
      nonceCounter: nextNonce,
      outcome: "MINE_HIT",
      winnerId,
      ricochetTriggered: true,
    };
  }

  // 2. Check Ship hit
  const hitShip = findShipAt(defenderFleet, row, col);
  if (hitShip) {
    const defenderHitKeys = getHitKeys(nextShotsBy[attackerId]!);
    defenderHitKeys.add(targetKey);
    const sunk = getShipCells(hitShip).every((c) =>
      defenderHitKeys.has(coordKey(c.row, c.col))
    );
    const outcome: ShotRecord["outcome"] = sunk ? "SUNK" : "HIT";
    nextShotsBy[attackerId]!.push({
      nonce: nextNonce,
      row,
      col,
      outcome,
      sunkShipId: sunk ? hitShip.id : undefined,
    });

    const winnerId = defenderHitKeys.size >= TOTAL_FLEET_CELLS ? attackerId : null;
    return {
      shotsBy: nextShotsBy,
      nonceCounter: nextNonce,
      outcome,
      sunkShipId: sunk ? hitShip.id : undefined,
      winnerId,
      ricochetTriggered: false,
    };
  }

  // 3. Miss
  nextShotsBy[attackerId]!.push({
    nonce: nextNonce,
    row,
    col,
    outcome: "MISS",
  });

  return {
    shotsBy: nextShotsBy,
    nonceCounter: nextNonce,
    outcome: "MISS",
    winnerId: null,
    ricochetTriggered: false,
  };
}

export class BattleshipEngine
  implements IGameEngine<BattleshipState, BattleshipAction, BattleshipView>
{
  readonly id = "battleship";
  readonly name = "Battleship Taktis";
  readonly tagline =
    "Perang kapal 1v1 dengan 2 Ranjau Laut, skill kapal aktif (Sonar, Cross Strike, Geser Kapal), & hit-streak!";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string]): BattleshipState {
    const [p1, p2] = playerIds;
    return {
      playerIds,
      phase: "SETUP_FLEET",
      currentTurnPlayerId: p1,
      shotsUsedThisTurn: 0,
      nonceCounter: 0,
      fleets: { [p1]: null, [p2]: null },
      mines: { [p1]: [], [p2]: [] },
      shotsBy: { [p1]: [], [p2]: [] },
      skillsUsed: {
        [p1]: createEmptySkillFlags(),
        [p2]: createEmptySkillFlags(),
      },
      lastSonarBy: { [p1]: null, [p2]: null },
      lastBannerBy: { [p1]: null, [p2]: null },
      winnerId: null,
    };
  }

  handleAction(
    state: BattleshipState,
    playerId: string,
    action: BattleshipAction
  ): EngineResult<BattleshipState> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }

    const opponentId = getOpponentId(state.playerIds, playerId);

    switch (action.type) {
      case "LOCK_FLEET":
        return this.handleLockFleet(state, playerId, opponentId, action.ships, action.mines);
      case "FIRE_SHOT":
        return this.handleFireShot(state, playerId, opponentId, action.row, action.col);
      case "USE_SONAR":
        return this.handleUseSonar(
          state,
          playerId,
          opponentId,
          action.centerRow,
          action.centerCol
        );
      case "USE_CROSS_STRIKE":
        return this.handleUseCrossStrike(
          state,
          playerId,
          opponentId,
          action.row,
          action.col
        );
      case "USE_SHIFT_SHIP":
        return this.handleUseShiftShip(
          state,
          playerId,
          opponentId,
          action.shipId,
          action.direction
        );
      default:
        throw new EngineError("INVALID_ACTION", "Tipe aksi tidak dikenal.");
    }
  }

  getViewForPlayer(state: BattleshipState, playerId: string): BattleshipView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    const myFleet = state.fleets[playerId] ?? [];
    const oppFleet = state.fleets[opponentId] ?? [];
    const myShots = state.shotsBy[playerId] ?? [];
    const incomingShots = state.shotsBy[opponentId] ?? [];

    const mySunkIds = getSunkShipIds(myFleet, incomingShots);
    const oppSunkIds = getSunkShipIds(oppFleet, myShots);
    const oppSunkSet = new Set(oppSunkIds);
    const mySunkSet = new Set(mySunkIds);

    const mySkills = state.skillsUsed[playerId] ?? createEmptySkillFlags();
    const skills: Record<SkillId, SkillStatusView> = {
      SONAR_PING: {
        used: mySkills.SONAR_PING,
        shipAlive: state.fleets[playerId] !== null && !mySunkSet.has("submarine"),
      },
      CROSS_STRIKE: {
        used: mySkills.CROSS_STRIKE,
        shipAlive: state.fleets[playerId] !== null && !mySunkSet.has("carrier"),
      },
      SHIFT_SHIP: {
        used: mySkills.SHIFT_SHIP,
        shipAlive: state.fleets[playerId] !== null && !mySunkSet.has("destroyer"),
      },
    };

    const opponentSunkShips = oppFleet
      .filter((s) => oppSunkSet.has(s.id))
      .map((s) => ({ ...s }));

    const isMatchEnd = state.phase === "MATCH_END";

    return {
      phase: state.phase,
      gridSize: BATTLESHIP_GRID_SIZE,
      currentTurnPlayerId: state.currentTurnPlayerId,
      shotsUsedThisTurn: state.shotsUsedThisTurn,
      maxShotsPerTurn: BATTLESHIP_MAX_SHOTS_PER_TURN,
      myFleetLocked: state.fleets[playerId] !== null,
      opponentFleetLocked: state.fleets[opponentId] !== null,
      myShips: myFleet.map((s) => ({ ...s })),
      myMines: (state.mines[playerId] ?? []).map((m) => ({ ...m })),
      incomingShots: incomingShots.map((s) => ({ ...s })),
      myShots: myShots.map((s) => ({ ...s })),
      opponentSunkShips,
      opponentAliveShipsCount:
        state.fleets[opponentId] === null
          ? BATTLESHIP_FLEET.length
          : BATTLESHIP_FLEET.length - oppSunkIds.length,
      myAliveShipsCount:
        state.fleets[playerId] === null
          ? BATTLESHIP_FLEET.length
          : BATTLESHIP_FLEET.length - mySunkIds.length,
      mySunkShipIds: mySunkIds,
      skills,
      lastSonarResult: state.lastSonarBy[playerId]
        ? { ...state.lastSonarBy[playerId]! }
        : null,
      lastBanner: state.lastBannerBy[playerId] ?? null,
      revealedOpponentShips: isMatchEnd ? oppFleet.map((s) => ({ ...s })) : null,
      revealedOpponentMines: isMatchEnd
        ? (state.mines[opponentId] ?? []).map((m) => ({ ...m }))
        : null,
      winnerId: state.winnerId,
    };
  }

  private handleLockFleet(
    state: BattleshipState,
    playerId: string,
    opponentId: string,
    ships: PlacedShip[],
    mines: GridCoord[]
  ): EngineResult<BattleshipState> {
    if (state.phase !== "SETUP_FLEET") {
      throw new EngineError("INVALID_ACTION", "Fase penempatan armada sudah selesai.");
    }
    if (state.fleets[playerId] !== null) {
      throw new EngineError("INVALID_ACTION", "Armada sudah dikunci.");
    }

    const { validatedShips, validatedMines } = validateFleetAndMines(ships, mines);

    const nextFleets = { ...state.fleets, [playerId]: validatedShips };
    const nextMines = { ...state.mines, [playerId]: validatedMines };
    const bothLocked = nextFleets[opponentId] !== null;

    const events: GameEvent[] = [
      { type: "FLEET_LOCKED", payload: { byPlayerId: playerId } },
    ];
    if (bothLocked) {
      events.push({ type: "BATTLE_STARTED" });
    }

    return {
      newState: {
        ...state,
        phase: bothLocked ? "BATTLE" : "SETUP_FLEET",
        fleets: nextFleets,
        mines: nextMines,
        lastBannerBy: bothLocked
          ? {
              [state.playerIds[0]]: "Pertempuran dimulai! Tembak radar lawan.",
              [state.playerIds[1]]: "Pertempuran dimulai! Menunggu tembakan pembuka.",
            }
          : state.lastBannerBy,
      },
      events,
    };
  }

  private assertCanActInBattle(
    state: BattleshipState,
    playerId: string,
    requireFreshTurn = false
  ): void {
    if (state.phase !== "BATTLE") {
      throw new EngineError("INVALID_ACTION", "Pertempuran tidak sedang berlangsung.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Sekarang giliran lawan.");
    }
    if (requireFreshTurn && state.shotsUsedThisTurn > 0) {
      throw new EngineError(
        "INVALID_ACTION",
        "Skill hanya bisa dipakai di awal giliran sebelum menembak."
      );
    }
  }

  private assertSkillAvailable(
    state: BattleshipState,
    playerId: string,
    skillId: SkillId,
    requiredShip: ShipId
  ): void {
    if (state.skillsUsed[playerId]?.[skillId]) {
      throw new EngineError("INVALID_ACTION", "Skill ini sudah terpakai di match ini.");
    }
    const opponentId = getOpponentId(state.playerIds, playerId);
    const myFleet = state.fleets[playerId] ?? [];
    const sunkIds = getSunkShipIds(myFleet, state.shotsBy[opponentId] ?? []);
    if (sunkIds.includes(requiredShip)) {
      const shipName = SHIP_SPEC_MAP.get(requiredShip)?.name ?? requiredShip;
      throw new EngineError(
        "INVALID_ACTION",
        `${shipName} sudah tenggelam — skill tidak aktif lagi!`
      );
    }
  }

  private handleFireShot(
    state: BattleshipState,
    playerId: string,
    opponentId: string,
    row: number,
    col: number
  ): EngineResult<BattleshipState> {
    this.assertCanActInBattle(state, playerId);

    if (!isCoordInBounds(row, col)) {
      throw new EngineError("INVALID_ACTION", "Koordinat tembakan di luar grid.");
    }

    const alreadyShot = (state.shotsBy[playerId] ?? []).some(
      (s) => s.row === row && s.col === col
    );
    if (alreadyShot) {
      throw new EngineError("INVALID_ACTION", "Petak tersebut sudah pernah ditembak.");
    }

    const res = resolveSingleShot(
      state.fleets,
      state.mines,
      state.shotsBy,
      state.nonceCounter,
      playerId,
      opponentId,
      row,
      col,
      this.rng
    );

    if (res.winnerId) {
      return {
        newState: {
          ...state,
          phase: "MATCH_END",
          shotsBy: res.shotsBy,
          nonceCounter: res.nonceCounter,
          shotsUsedThisTurn: 0,
          winnerId: res.winnerId,
          lastBannerBy: {
            [playerId]: res.ricochetTriggered
              ? "💣 Ledakan balik ranjau menenggelamkan kapal terakhirmu!"
              : "🏆 Seluruh armada lawan tenggelam!",
            [opponentId]: res.ricochetTriggered
              ? "💣 Ranjau membalikkan keadaan! Kamu menang!"
              : "Armada kita tenggelam semua.",
          },
        },
        events: [
          {
            type: "SHOT_FIRED",
            payload: { byPlayerId: playerId, outcome: res.outcome, row, col },
          },
        ],
        matchWinnerId: res.winnerId,
      };
    }

    const nextShotsUsed = state.shotsUsedThisTurn + 1;
    const keepsTurn =
      (res.outcome === "HIT" || res.outcome === "SUNK") &&
      nextShotsUsed < BATTLESHIP_MAX_SHOTS_PER_TURN;

    const bannerForAttacker =
      res.outcome === "MINE_HIT"
        ? "💣 Kena Ranjau Laut! 1 sel kapalmu ikut meledak & giliran berakhir."
        : res.outcome === "SUNK"
          ? `🔥 ${SHIP_SPEC_MAP.get(res.sunkShipId!)?.name ?? "Kapal"} lawan tenggelam!${keepsTurn ? " Bonus 1 tembakan!" : ""}`
          : res.outcome === "HIT"
            ? keepsTurn
              ? "💥 KENA! Bonus 1 tembakan lagi di giliran ini!"
              : "💥 KENA! Batas 2 tembakan tercapai, giliran lawan."
            : "💧 Meleset! Giliran pindah ke lawan.";

    const bannerForDefender =
      res.outcome === "MINE_HIT"
        ? "💣 Lawan menembak Ranjau Lautmu! Ledakan balik menghantam armadanya!"
        : res.outcome === "SUNK"
          ? `☠️ ${SHIP_SPEC_MAP.get(res.sunkShipId!)?.name ?? "Kapal"} kita tenggelam!`
          : res.outcome === "HIT"
            ? "💥 Kapal kita terkena tembakan!"
            : "🛡️ Tembakan lawan meleset — giliranmu!";

    const events: GameEvent[] = [
      {
        type: "SHOT_FIRED",
        payload: {
          byPlayerId: playerId,
          outcome: res.outcome,
          sunkShipId: res.sunkShipId ?? null,
        },
      },
    ];

    return {
      newState: {
        ...state,
        shotsBy: res.shotsBy,
        nonceCounter: res.nonceCounter,
        currentTurnPlayerId: keepsTurn ? playerId : opponentId,
        shotsUsedThisTurn: keepsTurn ? nextShotsUsed : 0,
        lastBannerBy: {
          [playerId]: bannerForAttacker,
          [opponentId]: bannerForDefender,
        },
      },
      events,
    };
  }

  private handleUseSonar(
    state: BattleshipState,
    playerId: string,
    opponentId: string,
    centerRow: number,
    centerCol: number
  ): EngineResult<BattleshipState> {
    this.assertCanActInBattle(state, playerId, true);
    this.assertSkillAvailable(state, playerId, "SONAR_PING", "submarine");

    if (!isCoordInBounds(centerRow, centerCol)) {
      throw new EngineError("INVALID_ACTION", "Titik sonar di luar grid.");
    }

    const oppFleet = state.fleets[opponentId] ?? [];
    const oppMines = state.mines[opponentId] ?? [];
    const myShots = state.shotsBy[playerId] ?? [];
    const myShotKeys = new Set(myShots.map((s) => coordKey(s.row, s.col)));

    const unhitShipKeys = new Set<string>();
    for (const ship of oppFleet) {
      for (const c of getShipCells(ship)) {
        const k = coordKey(c.row, c.col);
        if (!myShotKeys.has(k)) unhitShipKeys.add(k);
      }
    }

    const untriggeredMineKeys = new Set<string>();
    for (const m of oppMines) {
      const k = coordKey(m.row, m.col);
      if (!myShotKeys.has(k)) untriggeredMineKeys.add(k);
    }

    let detectedShipCells = 0;
    let detectedMines = 0;
    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
      for (let c = centerCol - 1; c <= centerCol + 1; c++) {
        if (!isCoordInBounds(r, c)) continue;
        const k = coordKey(r, c);
        if (unhitShipKeys.has(k)) detectedShipCells += 1;
        if (untriggeredMineKeys.has(k)) detectedMines += 1;
      }
    }

    const sonarResult: SonarPingResult = {
      centerRow,
      centerCol,
      detectedShipCells,
      detectedMines,
    };

    const nextSkills = {
      ...state.skillsUsed,
      [playerId]: {
        ...state.skillsUsed[playerId]!,
        SONAR_PING: true,
      },
    };

    return {
      newState: {
        ...state,
        currentTurnPlayerId: opponentId,
        shotsUsedThisTurn: 0,
        skillsUsed: nextSkills,
        lastSonarBy: {
          ...state.lastSonarBy,
          [playerId]: sonarResult,
        },
        lastBannerBy: {
          [playerId]: `📡 Sonar 3×3: Terdeteksi ${detectedShipCells} sel kapal & ${detectedMines} ranjau.`,
          [opponentId]: "📡 Lawan memindai laut dengan Sonar Ping!",
        },
      },
      events: [{ type: "SONAR_USED", payload: { byPlayerId: playerId } }],
    };
  }

  private handleUseCrossStrike(
    state: BattleshipState,
    playerId: string,
    opponentId: string,
    row: number,
    col: number
  ): EngineResult<BattleshipState> {
    this.assertCanActInBattle(state, playerId, true);
    this.assertSkillAvailable(state, playerId, "CROSS_STRIKE", "carrier");

    if (!isCoordInBounds(row, col)) {
      throw new EngineError("INVALID_ACTION", "Titik Cross Strike di luar grid.");
    }

    const pattern: GridCoord[] = [
      { row, col },
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];

    const existingShotKeys = new Set(
      (state.shotsBy[playerId] ?? []).map((s) => coordKey(s.row, s.col))
    );
    const targets = pattern.filter(
      (p) => isCoordInBounds(p.row, p.col) && !existingShotKeys.has(coordKey(p.row, p.col))
    );

    if (targets.length === 0) {
      throw new EngineError(
        "INVALID_ACTION",
        "Semua petak pada pola Cross Strike ini sudah ditembak."
      );
    }

    let shotsBy = state.shotsBy;
    let nonceCounter = state.nonceCounter;
    let hits = 0;
    let minesHit = 0;
    let sunkCount = 0;
    let winnerId: string | null = null;

    for (const t of targets) {
      const res = resolveSingleShot(
        state.fleets,
        state.mines,
        shotsBy,
        nonceCounter,
        playerId,
        opponentId,
        t.row,
        t.col,
        this.rng
      );
      shotsBy = res.shotsBy;
      nonceCounter = res.nonceCounter;

      if (res.outcome === "HIT") hits += 1;
      else if (res.outcome === "SUNK") {
        hits += 1;
        sunkCount += 1;
      } else if (res.outcome === "MINE_HIT") {
        minesHit += 1;
      }

      if (res.winnerId) {
        winnerId = res.winnerId;
        break;
      }
    }

    const nextSkills = {
      ...state.skillsUsed,
      [playerId]: {
        ...state.skillsUsed[playerId]!,
        CROSS_STRIKE: true,
      },
    };

    if (winnerId) {
      return {
        newState: {
          ...state,
          phase: "MATCH_END",
          shotsBy,
          nonceCounter,
          shotsUsedThisTurn: 0,
          skillsUsed: nextSkills,
          winnerId,
          lastBannerBy: {
            [playerId]:
              winnerId === playerId
                ? "🚀 Cross Strike menghancurkan armada terakhir lawan!"
                : "💣 Ledakan balik ranjau dari Cross Strike menenggelamkanmu!",
            [opponentId]:
              winnerId === opponentId
                ? "💣 Ranjau membalikkan Cross Strike lawan — kamu menang!"
                : "🚀 Cross Strike lawan menenggelamkan kapal terakhir kita.",
          },
        },
        events: [{ type: "CROSS_STRIKE_USED", payload: { byPlayerId: playerId } }],
        matchWinnerId: winnerId,
      };
    }

    return {
      newState: {
        ...state,
        shotsBy,
        nonceCounter,
        currentTurnPlayerId: opponentId,
        shotsUsedThisTurn: 0,
        skillsUsed: nextSkills,
        lastBannerBy: {
          [playerId]: `🚀 Cross Strike: ${hits} kena${sunkCount ? ` (${sunkCount} tenggelam)` : ""}${minesHit ? `, ${minesHit} ranjau meledak!` : "!"}`,
          [opponentId]: `🚀 Lawan meluncurkan Cross Strike! (${hits} kena${minesHit ? `, ${minesHit} ranjau terpicu` : ""})`,
        },
      },
      events: [{ type: "CROSS_STRIKE_USED", payload: { byPlayerId: playerId } }],
    };
  }

  private handleUseShiftShip(
    state: BattleshipState,
    playerId: string,
    opponentId: string,
    shipId: ShipId,
    direction: ShiftDirection
  ): EngineResult<BattleshipState> {
    this.assertCanActInBattle(state, playerId, true);
    this.assertSkillAvailable(state, playerId, "SHIFT_SHIP", "destroyer");

    const delta = SHIFT_DELTAS[direction];
    if (!delta) {
      throw new EngineError("INVALID_ACTION", "Arah geser kapal tidak valid.");
    }

    const myFleet = state.fleets[playerId] ?? [];
    const targetShip = myFleet.find((s) => s.id === shipId);
    if (!targetShip) {
      throw new EngineError("INVALID_ACTION", "Kapal tidak ditemukan.");
    }

    const incomingShotKeys = new Set(
      (state.shotsBy[opponentId] ?? []).map((s) => coordKey(s.row, s.col))
    );
    const oldCells = getShipCells(targetShip);
    if (oldCells.some((c) => incomingShotKeys.has(coordKey(c.row, c.col)))) {
      throw new EngineError(
        "INVALID_ACTION",
        "Kapal yang sudah pernah tertembak tidak bisa digeser."
      );
    }

    const shiftedShip: PlacedShip = {
      ...targetShip,
      row: targetShip.row + delta[0],
      col: targetShip.col + delta[1],
    };
    const newCells = getShipCells(shiftedShip);

    const blockedKeys = new Set<string>();
    for (const s of myFleet) {
      if (s.id === shipId) continue;
      for (const c of getShipCells(s)) {
        blockedKeys.add(coordKey(c.row, c.col));
      }
    }
    for (const m of state.mines[playerId] ?? []) {
      blockedKeys.add(coordKey(m.row, m.col));
    }

    for (const cell of newCells) {
      if (!isCoordInBounds(cell.row, cell.col)) {
        throw new EngineError("INVALID_ACTION", "Kapal keluar dari batas grid jika digeser ke arah ini.");
      }
      const key = coordKey(cell.row, cell.col);
      if (blockedKeys.has(key)) {
        throw new EngineError("INVALID_ACTION", "Jalur geser terhalang kapal atau ranjau lain.");
      }
      if (incomingShotKeys.has(key)) {
        throw new EngineError(
          "INVALID_ACTION",
          "Tidak bisa menggeser kapal ke petak yang sudah pernah ditembak lawan."
        );
      }
    }

    const nextFleet = myFleet.map((s) => (s.id === shipId ? shiftedShip : s));
    const nextSkills = {
      ...state.skillsUsed,
      [playerId]: {
        ...state.skillsUsed[playerId]!,
        SHIFT_SHIP: true,
      },
    };

    const shipName = SHIP_SPEC_MAP.get(shipId)?.name ?? shipId;

    return {
      newState: {
        ...state,
        fleets: { ...state.fleets, [playerId]: nextFleet },
        currentTurnPlayerId: opponentId,
        shotsUsedThisTurn: 0,
        skillsUsed: nextSkills,
        lastBannerBy: {
          [playerId]: `⚓ ${shipName} berhasil digeser 1 petak!`,
          [opponentId]: "⚠️ Radar mendeteksi pergerakan salah satu kapal lawan!",
        },
      },
      events: [{ type: "SHIP_SHIFTED", payload: { byPlayerId: playerId } }],
    };
  }
}

export const battleshipEngine = new BattleshipEngine();
