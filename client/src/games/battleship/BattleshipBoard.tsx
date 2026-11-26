import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import {
  Anchor,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bomb,
  Crosshair,
  Flame,
  Lock,
  Radar,
  RotateCw,
  Shield,
  Shuffle,
  Skull,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  BATTLESHIP_FLEET,
  BATTLESHIP_GRID_SIZE,
  BATTLESHIP_MINE_COUNT,
  canPlaceShip,
  coordKey,
  generateRandomFleetAndMines,
  getShipCells,
  isCoordInBounds,
  type BattleshipView,
  type GridCoord,
  type PlacedShip,
  type ShiftDirection,
  type ShipId,
  type ShipOrientation,
  type ShotRecord,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";

const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;

type SetupTool = { kind: "SHIP"; shipId: ShipId } | { kind: "MINE" };
type ActiveSkillTool = "NONE" | "SONAR_PING" | "CROSS_STRIKE" | "SHIFT_SHIP";

export function BattleshipBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as BattleshipView | null;

  // Setup state
  const [draftShips, setDraftShips] = useState<PlacedShip[]>([]);
  const [draftMines, setDraftMines] = useState<GridCoord[]>([]);
  const [orientation, setOrientation] = useState<ShipOrientation>("H");
  const [setupTool, setSetupTool] = useState<SetupTool>({
    kind: "SHIP",
    shipId: "carrier",
  });
  const [hoverCell, setHoverCell] = useState<GridCoord | null>(null);

  // Battle state
  const [activeSkill, setActiveSkill] = useState<ActiveSkillTool>("NONE");
  const [shiftShipId, setShiftShipId] = useState<ShipId | null>(null);
  const [radarHover, setRadarHover] = useState<GridCoord | null>(null);
  const lastEventSigRef = useRef("");

  useEffect(() => {
    if (view?.phase === "SETUP_FLEET" && !view.myFleetLocked && draftShips.length === 0) {
      setSetupTool({ kind: "SHIP", shipId: "carrier" });
    }
    if (view?.phase !== "BATTLE") {
      setActiveSkill("NONE");
      setShiftShipId(null);
    }
  }, [view?.phase, view?.myFleetLocked, draftShips.length]);

  useEffect(() => {
    if (!lastEvents.length) return;
    const sig = JSON.stringify(lastEvents);
    if (sig === lastEventSigRef.current) return;
    lastEventSigRef.current = sig;

    for (const ev of lastEvents) {
      if (ev.type === "BATTLE_STARTED") {
        soundManager.play("whistle");
      } else if (ev.type === "SHOT_FIRED") {
        const payload = ev.payload as { outcome?: string } | undefined;
        if (payload?.outcome === "MINE_HIT") {
          soundManager.play("bang");
        } else if (payload?.outcome === "SUNK") {
          soundManager.play("bang");
        } else if (payload?.outcome === "HIT") {
          soundManager.play("spike");
        } else {
          soundManager.play("click");
        }
      } else if (
        ev.type === "SONAR_USED" ||
        ev.type === "CROSS_STRIKE_USED" ||
        ev.type === "SHIP_SHIFTED"
      ) {
        soundManager.play("reveal");
      }
    }
  }, [lastEvents]);

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const bothReady = room.players.length === 2 && room.players.every((p) => p.ready);

  const isMyTurn = Boolean(view && me && view.currentTurnPlayerId === me.id);
  const canUseSkill = Boolean(
    view &&
      view.phase === "BATTLE" &&
      isMyTurn &&
      view.shotsUsedThisTurn === 0
  );

  useEffect(() => {
    if (!canUseSkill) {
      setActiveSkill("NONE");
      setShiftShipId(null);
    }
  }, [canUseSkill]);

  const placedShipMap = useMemo(() => {
    const map = new Map<string, PlacedShip>();
    const source = view?.myFleetLocked ? view.myShips : draftShips;
    for (const s of source) {
      for (const c of getShipCells(s)) {
        map.set(coordKey(c.row, c.col), s);
      }
    }
    return map;
  }, [view?.myFleetLocked, view?.myShips, draftShips]);

  const placedMineSet = useMemo(() => {
    const source = view?.myFleetLocked ? view.myMines : draftMines;
    return new Set(source.map((m) => coordKey(m.row, m.col)));
  }, [view?.myFleetLocked, view?.myMines, draftMines]);

  const myShotMap = useMemo(() => {
    const map = new Map<string, ShotRecord>();
    for (const s of view?.myShots ?? []) {
      map.set(coordKey(s.row, s.col), s);
    }
    return map;
  }, [view?.myShots]);

  const incomingShotMap = useMemo(() => {
    const map = new Map<string, ShotRecord>();
    for (const s of view?.incomingShots ?? []) {
      map.set(coordKey(s.row, s.col), s);
    }
    return map;
  }, [view?.incomingShots]);

  const sunkShipCellMap = useMemo(() => {
    const map = new Map<string, PlacedShip>();
    const list =
      view?.phase === "MATCH_END" && view.revealedOpponentShips
        ? view.revealedOpponentShips
        : view?.opponentSunkShips ?? [];
    for (const s of list) {
      for (const c of getShipCells(s)) {
        map.set(coordKey(c.row, c.col), s);
      }
    }
    return map;
  }, [view?.phase, view?.revealedOpponentShips, view?.opponentSunkShips]);

  const revealedMineSet = useMemo(() => {
    return new Set(
      (view?.revealedOpponentMines ?? []).map((m) => coordKey(m.row, m.col))
    );
  }, [view?.revealedOpponentMines]);

  const setupPreview = useMemo(() => {
    if (!hoverCell || view?.phase !== "SETUP_FLEET" || view.myFleetLocked) {
      return { keys: new Set<string>(), valid: false };
    }
    if (setupTool.kind === "MINE") {
      const k = coordKey(hoverCell.row, hoverCell.col);
      const valid =
        !placedShipMap.has(k) &&
        !placedMineSet.has(k) &&
        draftMines.length < BATTLESHIP_MINE_COUNT;
      return { keys: new Set([k]), valid };
    }
    const candidate: PlacedShip = {
      id: setupTool.shipId,
      row: hoverCell.row,
      col: hoverCell.col,
      orientation,
    };
    const valid = canPlaceShip(draftShips, draftMines, candidate);
    const keys = new Set(
      getShipCells(candidate)
        .filter((c) => isCoordInBounds(c.row, c.col))
        .map((c) => coordKey(c.row, c.col))
    );
    return { keys, valid };
  }, [
    hoverCell,
    view?.phase,
    view?.myFleetLocked,
    setupTool,
    orientation,
    draftShips,
    draftMines,
    placedShipMap,
    placedMineSet,
  ]);

  const radarPreviewKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!radarHover || !isMyTurn || view?.phase !== "BATTLE") return keys;
    if (activeSkill === "SONAR_PING") {
      for (let r = radarHover.row - 1; r <= radarHover.row + 1; r++) {
        for (let c = radarHover.col - 1; c <= radarHover.col + 1; c++) {
          if (isCoordInBounds(r, c)) keys.add(coordKey(r, c));
        }
      }
    } else if (activeSkill === "CROSS_STRIKE") {
      const pts = [
        { row: radarHover.row, col: radarHover.col },
        { row: radarHover.row - 1, col: radarHover.col },
        { row: radarHover.row + 1, col: radarHover.col },
        { row: radarHover.row, col: radarHover.col - 1 },
        { row: radarHover.row, col: radarHover.col + 1 },
      ];
      for (const p of pts) {
        if (isCoordInBounds(p.row, p.col)) keys.add(coordKey(p.row, p.col));
      }
    } else {
      keys.add(coordKey(radarHover.row, radarHover.col));
    }
    return keys;
  }, [radarHover, isMyTurn, view?.phase, activeSkill]);

  const sonarResultKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!view?.lastSonarResult) return keys;
    const { centerRow, centerCol } = view.lastSonarResult;
    for (let r = centerRow - 1; r <= centerRow + 1; r++) {
      for (let c = centerCol - 1; c <= centerCol + 1; c++) {
        if (isCoordInBounds(r, c)) keys.add(coordKey(r, c));
      }
    }
    return keys;
  }, [view?.lastSonarResult]);

  if (!view || !me) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-sm text-[#9c9689]">
        Memuat radar Battleship Taktis...
      </div>
    );
  }

  const pickNextUnplacedTool = (
    nextShips: PlacedShip[],
    nextMines: GridCoord[]
  ) => {
    const placedIds = new Set(nextShips.map((s) => s.id));
    const missingShip = BATTLESHIP_FLEET.find((s) => !placedIds.has(s.id));
    if (missingShip) {
      setSetupTool({ kind: "SHIP", shipId: missingShip.id });
    } else if (nextMines.length < BATTLESHIP_MINE_COUNT) {
      setSetupTool({ kind: "MINE" });
    }
  };

  const handleSetupCellClick = (row: number, col: number) => {
    if (view.myFleetLocked) return;
    const k = coordKey(row, col);

    if (setupTool.kind === "MINE") {
      if (placedMineSet.has(k)) {
        soundManager.play("click");
        setDraftMines((prev) => prev.filter((m) => coordKey(m.row, m.col) !== k));
        return;
      }
      if (placedShipMap.has(k) || draftMines.length >= BATTLESHIP_MINE_COUNT) {
        return;
      }
      soundManager.play("card");
      const nextMines = [...draftMines, { row, col }];
      setDraftMines(nextMines);
      pickNextUnplacedTool(draftShips, nextMines);
      return;
    }

    const existingAtCell = placedShipMap.get(k);
    if (existingAtCell && existingAtCell.id === setupTool.shipId) {
      soundManager.play("click");
      setDraftShips((prev) => prev.filter((s) => s.id !== existingAtCell.id));
      return;
    }

    const candidate: PlacedShip = {
      id: setupTool.shipId,
      row,
      col,
      orientation,
    };
    if (!canPlaceShip(draftShips, draftMines, candidate)) {
      soundManager.play("wrong");
      return;
    }
    soundManager.play("card");
    const nextShips = [
      ...draftShips.filter((s) => s.id !== setupTool.shipId),
      candidate,
    ];
    setDraftShips(nextShips);
    pickNextUnplacedTool(nextShips, draftMines);
  };

  const handleRandomizeSetup = () => {
    soundManager.play("reveal");
    const { ships, mines } = generateRandomFleetAndMines();
    setDraftShips(ships);
    setDraftMines(mines);
  };

  const handleRadarCellClick = (row: number, col: number) => {
    if (view.phase !== "BATTLE" || !isMyTurn) return;

    if (activeSkill === "SONAR_PING") {
      onAction({ type: "USE_SONAR", centerRow: row, centerCol: col });
      setActiveSkill("NONE");
      return;
    }
    if (activeSkill === "CROSS_STRIKE") {
      onAction({ type: "USE_CROSS_STRIKE", row, col });
      setActiveSkill("NONE");
      return;
    }
    if (myShotMap.has(coordKey(row, col))) return;
    onAction({ type: "FIRE_SHOT", row, col });
  };

  const handleMyBoardClickInBattle = (row: number, col: number) => {
    if (activeSkill !== "SHIFT_SHIP" || !canUseSkill) return;
    const ship = placedShipMap.get(coordKey(row, col));
    if (!ship) return;
    const cells = getShipCells(ship);
    const hasHit = cells.some((c) => {
      const s = incomingShotMap.get(coordKey(c.row, c.col));
      return s && (s.outcome === "HIT" || s.outcome === "SUNK");
    });
    if (hasHit) {
      soundManager.play("wrong");
      return;
    }
    soundManager.play("click");
    setShiftShipId(ship.id);
  };

  const handleShiftDirection = (direction: ShiftDirection) => {
    if (!shiftShipId || !canUseSkill) return;
    onAction({ type: "USE_SHIFT_SHIP", shipId: shiftShipId, direction });
    setActiveSkill("NONE");
    setShiftShipId(null);
  };

  const setupReadyToLock =
    draftShips.length === BATTLESHIP_FLEET.length &&
    draftMines.length === BATTLESHIP_MINE_COUNT;

  const myHitsLanded = view.myShots.filter(
    (s) => s.outcome === "HIT" || s.outcome === "SUNK"
  ).length;
  const accuracy =
    view.myShots.length > 0
      ? Math.round((myHitsLanded / view.myShots.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-4 sm:px-5 sm:py-6">
      <div className="space-y-4">
        {/* Top Battle Status */}
        <div className="rounded-xl border border-white/12 bg-[#14171a] p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-[#38bdf8] uppercase">
                {view.phase === "SETUP_FLEET"
                  ? "Fase 1 • Penempatan Armada & 2 Ranjau"
                  : view.phase === "BATTLE"
                    ? isMyTurn
                      ? `Giliranmu • Sisa ${view.maxShotsPerTurn - view.shotsUsedThisTurn} Tembakan (jika HIT)`
                      : `Giliran ${opponent?.name ?? "Lawan"}`
                    : "Pertempuran Selesai"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm font-bold text-[#ebe5d8]">
                <span>
                  {me.name}:{" "}
                  <span className="font-mono-tabular text-emerald-400">
                    {view.myAliveShipsCount}/5 kapal
                  </span>
                </span>
                <span className="text-[#6b7280]">vs</span>
                <span>
                  {opponent?.name ?? "Lawan"}:{" "}
                  <span className="font-mono-tabular text-rose-400">
                    {view.opponentAliveShipsCount}/5 kapal
                  </span>
                </span>
              </div>
            </div>

            {view.lastBanner && (
              <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-medium text-[#ebe5d8]">
                {view.lastBanner}
              </div>
            )}
          </div>
        </div>

        {/* PHASE: SETUP_FLEET */}
        {view.phase === "SETUP_FLEET" && (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 rounded-xl border border-white/12 bg-[#14171a] p-4 lg:col-span-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#ebe5d8]">
                  Susun Armada &amp; Ranjau
                </h3>
                <button
                  type="button"
                  disabled={view.myFleetLocked}
                  onClick={() =>
                    setOrientation((o) => (o === "H" ? "V" : "H"))
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-[#ebe5d8] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5 text-[#38bdf8]" />
                  {orientation === "H" ? "Horizontal" : "Vertikal"}
                </button>
              </div>

              <div className="space-y-1.5">
                {BATTLESHIP_FLEET.map((spec) => {
                  const placed = draftShips.some((s) => s.id === spec.id);
                  const active =
                    setupTool.kind === "SHIP" && setupTool.shipId === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      disabled={view.myFleetLocked}
                      onClick={() =>
                        setSetupTool({ kind: "SHIP", shipId: spec.id })
                      }
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                        active
                          ? "border-[#38bdf8] bg-[#102430]"
                          : placed
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-white/10 bg-[#101214] hover:border-white/25"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#ebe5d8]">
                          {spec.name} ({spec.size})
                        </p>
                        {spec.skillName && (
                          <p className="text-[10px] text-[#38bdf8]">
                            Skill: {spec.skillName}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: spec.size }).map((_, i) => (
                          <span
                            key={i}
                            className={`h-2.5 w-2.5 rounded-xs ${
                              placed ? "bg-emerald-400" : "bg-white/25"
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={view.myFleetLocked}
                  onClick={() => setSetupTool({ kind: "MINE" })}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                    setupTool.kind === "MINE"
                      ? "border-amber-400 bg-amber-500/15"
                      : draftMines.length === BATTLESHIP_MINE_COUNT
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/10 bg-[#101214] hover:border-white/25"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bomb className="h-4 w-4 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-[#ebe5d8]">
                        Ranjau Laut ({draftMines.length}/{BATTLESHIP_MINE_COUNT})
                      </p>
                      <p className="text-[10px] text-[#9c9689]">
                        Ledakkan balik 1 sel kapal lawan jika tertembak
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={view.myFleetLocked}
                  onClick={handleRandomizeSetup}
                  className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-[#ebe5d8] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                >
                  <Shuffle className="h-3.5 w-3.5 text-[#38bdf8]" />
                  Acak Semua
                </button>
                <button
                  type="button"
                  disabled={view.myFleetLocked}
                  onClick={() => {
                    setDraftShips([]);
                    setDraftMines([]);
                    setSetupTool({ kind: "SHIP", shipId: "carrier" });
                  }}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-[#cfc8ba] hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              <button
                type="button"
                disabled={view.myFleetLocked || !setupReadyToLock}
                onClick={() =>
                  onAction({
                    type: "LOCK_FLEET",
                    ships: draftShips,
                    mines: draftMines,
                  })
                }
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#38bdf8] px-4 py-2 text-sm font-bold text-[#0b1218] hover:bg-[#60ccf9] disabled:opacity-45 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                {view.myFleetLocked
                  ? view.opponentFleetLocked
                    ? "Memulai pertempuran..."
                    : "✓ Armada Terkunci • Menunggu lawan..."
                  : "Kunci Formasi & Siap Tempur"}
              </button>
            </div>

            <div className="rounded-xl border border-white/12 bg-[#0e161d] p-3.5 sm:p-4 lg:col-span-7">
              <p className="mb-2 text-xs font-semibold text-[#9c9689]">
                Klik petak laut untuk menaruh kapal / ranjau (klik lagi untuk hapus).
              </p>
              <SeaGrid
                onMouseLeave={() => setHoverCell(null)}
                renderCell={(r, c) => {
                  const k = coordKey(r, c);
                  const ship = placedShipMap.get(k);
                  const isMine = placedMineSet.has(k);
                  const isPreview = setupPreview.keys.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={view.myFleetLocked}
                      onMouseEnter={() => setHoverCell({ row: r, col: c })}
                      onClick={() => handleSetupCellClick(r, c)}
                      className={`relative flex aspect-square items-center justify-center rounded-xs border text-[10px] font-bold transition-colors ${
                        isPreview
                          ? setupPreview.valid
                            ? "border-emerald-300 bg-emerald-500/35"
                            : "border-rose-400 bg-rose-500/35"
                          : ship
                            ? "border-[#38bdf8]/70 bg-[#1a4358] text-[#bae6fd]"
                            : isMine
                              ? "border-amber-400/75 bg-amber-500/25 text-amber-300"
                              : "border-white/10 bg-[#102230] hover:bg-[#173245]"
                      }`}
                    >
                      {isMine ? (
                        <Bomb className="h-3.5 w-3.5" />
                      ) : ship ? (
                        <span className="text-[9px]">
                          {BATTLESHIP_FLEET.find((f) => f.id === ship.id)?.shortName}
                        </span>
                      ) : null}
                    </button>
                  );
                }}
              />
            </div>
          </div>
        )}

        {/* PHASE: BATTLE & MATCH_END */}
        {(view.phase === "BATTLE" || view.phase === "MATCH_END") && (
          <>
            {view.phase === "BATTLE" && (
              <div className="rounded-xl border border-white/12 bg-[#14171a] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#d4a24c]">
                    SKILL KAPAL AKTIF (1×/Match • Awal Giliran)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        !canUseSkill ||
                        view.skills.SONAR_PING.used ||
                        !view.skills.SONAR_PING.shipAlive
                      }
                      onClick={() =>
                        setActiveSkill((s) =>
                          s === "SONAR_PING" ? "NONE" : "SONAR_PING"
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        activeSkill === "SONAR_PING"
                          ? "border-[#38bdf8] bg-[#38bdf8]/25 text-[#e0f2fe]"
                          : "border-white/15 bg-white/5 text-[#ebe5d8] disabled:opacity-35"
                      }`}
                    >
                      <Radar className="h-3.5 w-3.5 text-[#38bdf8]" />
                      Sonar 3×3
                      {!view.skills.SONAR_PING.shipAlive
                        ? " (SLM Tenggelam)"
                        : view.skills.SONAR_PING.used
                          ? " (Terpakai)"
                          : ""}
                    </button>

                    <button
                      type="button"
                      disabled={
                        !canUseSkill ||
                        view.skills.CROSS_STRIKE.used ||
                        !view.skills.CROSS_STRIKE.shipAlive
                      }
                      onClick={() =>
                        setActiveSkill((s) =>
                          s === "CROSS_STRIKE" ? "NONE" : "CROSS_STRIKE"
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        activeSkill === "CROSS_STRIKE"
                          ? "border-[#f97316] bg-[#f97316]/25 text-[#ffedd5]"
                          : "border-white/15 bg-white/5 text-[#ebe5d8] disabled:opacity-35"
                      }`}
                    >
                      <Crosshair className="h-3.5 w-3.5 text-[#f97316]" />
                      Cross Strike (+)
                      {!view.skills.CROSS_STRIKE.shipAlive
                        ? " (IND Tenggelam)"
                        : view.skills.CROSS_STRIKE.used
                          ? " (Terpakai)"
                          : ""}
                    </button>

                    <button
                      type="button"
                      disabled={
                        !canUseSkill ||
                        view.skills.SHIFT_SHIP.used ||
                        !view.skills.SHIFT_SHIP.shipAlive
                      }
                      onClick={() => {
                        setShiftShipId(null);
                        setActiveSkill((s) =>
                          s === "SHIFT_SHIP" ? "NONE" : "SHIFT_SHIP"
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        activeSkill === "SHIFT_SHIP"
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                          : "border-white/15 bg-white/5 text-[#ebe5d8] disabled:opacity-35"
                      }`}
                    >
                      <Anchor className="h-3.5 w-3.5 text-emerald-400" />
                      Geser Kapal
                      {!view.skills.SHIFT_SHIP.shipAlive
                        ? " (PRS Tenggelam)"
                        : view.skills.SHIFT_SHIP.used
                          ? " (Terpakai)"
                          : ""}
                    </button>
                  </div>
                </div>

                {activeSkill === "SHIFT_SHIP" && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs">
                    <span className="text-emerald-200">
                      {shiftShipId
                        ? `Pilih arah geser ${
                            BATTLESHIP_FLEET.find((s) => s.id === shiftShipId)?.name
                          }:`
                        : "Klik kapalmu yang masih utuh di papan Armada Saya."}
                    </span>
                    {shiftShipId && (
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            ["UP", ArrowUp],
                            ["DOWN", ArrowDown],
                            ["LEFT", ArrowLeft],
                            ["RIGHT", ArrowRight],
                          ] as const
                        ).map(([dir, Icon]) => (
                          <button
                            key={dir}
                            type="button"
                            onClick={() => handleShiftDirection(dir)}
                            className="rounded border border-emerald-400/50 bg-[#0d1f18] p-1.5 text-emerald-200 hover:bg-emerald-500/30 cursor-pointer"
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {view.lastSonarResult && (
                  <p className="mt-2 text-xs text-[#7dd3fc]">
                    📡 Hasil Sonar terakhir di{" "}
                    <strong>
                      {COL_LABELS[view.lastSonarResult.centerCol]}
                      {view.lastSonarResult.centerRow + 1}
                    </strong>
                    : {view.lastSonarResult.detectedShipCells} sel kapal •{" "}
                    {view.lastSonarResult.detectedMines} ranjau.
                  </p>
                )}
              </div>
            )}

            {view.phase === "MATCH_END" && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 rounded-xl border border-[#d4a24c]/45 bg-[#14171a] p-5 text-center"
              >
                <div className="flex flex-col items-center gap-1.5">
                  {view.winnerId === me.id ? (
                    <Trophy className="h-8 w-8 text-[#d4a24c]" />
                  ) : (
                    <Shield className="h-8 w-8 text-[#9c9689]" />
                  )}
                  <h2 className="font-display text-2xl text-[#ebe5d8] sm:text-3xl">
                    {view.winnerId === me.id
                      ? "Kemenangan Armada!"
                      : `${opponent?.name ?? "Lawan"} Menang!`}
                  </h2>
                  <p className="text-xs text-[#9c9689]">
                    Akurasi tembakanmu: {accuracy}% ({myHitsLanded}/{view.myShots.length} tembakan)
                  </p>
                  {room.customStake && (
                    <p className="text-xs font-medium text-[#d4a24c]">
                      Taruhan: {room.customStake}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSetReady(!me.ready)}
                    className={`min-h-[42px] rounded-lg border px-4 py-2 text-xs font-semibold cursor-pointer ${
                      me.ready
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                        : "border-white/20 bg-[#171a1d] text-[#ebe5d8]"
                    }`}
                  >
                    {me.ready ? "✓ Siap" : "Main Lagi"}
                  </button>
                  <button
                    type="button"
                    onClick={onStartMatch}
                    disabled={!bothReady}
                    className="min-h-[42px] rounded-lg bg-[#38bdf8] px-4 py-2 text-xs font-bold text-[#0b1218] disabled:opacity-35 cursor-pointer"
                  >
                    Mulai
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToLobby}
                    className="min-h-[42px] rounded-lg border border-white/15 px-4 py-2 text-xs text-[#cfc8ba] hover:bg-white/8 cursor-pointer"
                  >
                    Lobi
                  </button>
                </div>
              </m.div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Radar Lawan */}
              <div className="rounded-xl border border-white/12 bg-[#0e161d] p-3.5 sm:p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#ebe5d8]">
                    Radar Serangan ({opponent?.name ?? "Lawan"})
                  </h3>
                  <span className="text-[11px] text-[#9c9689]">
                    {view.phase === "MATCH_END"
                      ? "Seluruh kapal & ranjau lawan terbuka"
                      : activeSkill === "SONAR_PING"
                        ? "Mode Sonar 3×3 aktif"
                        : activeSkill === "CROSS_STRIKE"
                          ? "Mode Cross Strike (+) aktif"
                          : isMyTurn
                            ? "Klik petak untuk menembak"
                            : "Menunggu giliran..."}
                  </span>
                </div>

                <SeaGrid
                  onMouseLeave={() => setRadarHover(null)}
                  renderCell={(r, c) => {
                    const k = coordKey(r, c);
                    const shot = myShotMap.get(k);
                    const sunkOrRevealedShip = sunkShipCellMap.get(k);
                    const revealedMine = revealedMineSet.has(k);
                    const isPreview = radarPreviewKeys.has(k);
                    const inSonarScan = sonarResultKeys.has(k);
                    const clickable =
                      view.phase === "BATTLE" &&
                      isMyTurn &&
                      activeSkill !== "SHIFT_SHIP" &&
                      (activeSkill !== "NONE" || !shot);

                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={!clickable}
                        onMouseEnter={() => setRadarHover({ row: r, col: c })}
                        onClick={() => handleRadarCellClick(r, c)}
                        className={`relative flex aspect-square items-center justify-center rounded-xs border transition-colors ${
                          shot?.outcome === "SUNK"
                            ? "border-rose-400 bg-rose-700/60 text-white"
                            : shot?.outcome === "HIT"
                              ? "border-rose-400 bg-rose-500/45 text-rose-100"
                              : shot?.outcome === "MINE_HIT"
                                ? "border-amber-400 bg-amber-500/40 text-amber-200"
                                : shot?.outcome === "MISS"
                                  ? "border-white/10 bg-[#0b141c] text-sky-300/60"
                                  : sunkOrRevealedShip
                                    ? "border-[#38bdf8]/65 bg-[#19445a] text-[#bae6fd]"
                                    : revealedMine
                                      ? "border-amber-400/65 bg-amber-500/20 text-amber-300"
                                      : isPreview
                                        ? "border-[#f97316] bg-[#f97316]/30 cursor-crosshair"
                                        : inSonarScan
                                          ? "border-sky-400/40 bg-sky-500/15"
                                          : clickable
                                            ? "border-white/12 bg-[#102332] hover:bg-[#19384f] cursor-crosshair"
                                            : "border-white/10 bg-[#102230]"
                        }`}
                      >
                        {shot?.outcome === "SUNK" ? (
                          <Skull className="h-3.5 w-3.5" />
                        ) : shot?.outcome === "HIT" ? (
                          <Flame className="h-3.5 w-3.5" />
                        ) : shot?.outcome === "MINE_HIT" || revealedMine ? (
                          <Bomb className="h-3.5 w-3.5" />
                        ) : shot?.outcome === "MISS" ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-300/65" />
                        ) : sunkOrRevealedShip ? (
                          <span className="text-[8px] font-bold">
                            {
                              BATTLESHIP_FLEET.find(
                                (f) => f.id === sunkOrRevealedShip.id
                              )?.shortName
                            }
                          </span>
                        ) : null}
                      </button>
                    );
                  }}
                />
              </div>

              {/* Armada Saya */}
              <div className="rounded-xl border border-white/12 bg-[#0e161d] p-3.5 sm:p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#ebe5d8]">
                    Armada Saya ({me.name})
                  </h3>
                  <span className="text-[11px] text-[#9c9689]">
                    {activeSkill === "SHIFT_SHIP"
                      ? "Klik kapal utuh untuk digeser"
                      : "Posisi kapal, ranjau, & tembakan masuk"}
                  </span>
                </div>

                <SeaGrid
                  renderCell={(r, c) => {
                    const k = coordKey(r, c);
                    const ship = placedShipMap.get(k);
                    const isMine = placedMineSet.has(k);
                    const incoming = incomingShotMap.get(k);
                    const isShiftTarget = ship && shiftShipId === ship.id;
                    const shiftClickable =
                      activeSkill === "SHIFT_SHIP" && Boolean(ship);

                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={!shiftClickable}
                        onClick={() => handleMyBoardClickInBattle(r, c)}
                        className={`relative flex aspect-square items-center justify-center rounded-xs border transition-colors ${
                          incoming?.outcome === "SUNK"
                            ? "border-rose-400 bg-rose-700/65 text-white"
                            : incoming?.outcome === "HIT"
                              ? "border-rose-400 bg-rose-500/45 text-rose-100"
                              : incoming?.outcome === "MINE_HIT"
                                ? "border-amber-400 bg-amber-500/40 text-amber-200"
                                : incoming?.outcome === "MISS"
                                  ? "border-white/10 bg-[#0b141c] text-sky-300/60"
                                  : isShiftTarget
                                    ? "border-emerald-300 bg-emerald-500/35 ring-1 ring-emerald-300"
                                    : ship
                                      ? `border-[#38bdf8]/65 bg-[#1a4358] text-[#bae6fd] ${
                                          shiftClickable ? "cursor-pointer hover:bg-[#235873]" : ""
                                        }`
                                      : isMine
                                        ? "border-amber-400/70 bg-amber-500/20 text-amber-300"
                                        : "border-white/10 bg-[#102230]"
                        }`}
                      >
                        {incoming?.outcome === "SUNK" ? (
                          <Skull className="h-3.5 w-3.5" />
                        ) : incoming?.outcome === "HIT" ? (
                          <Flame className="h-3.5 w-3.5" />
                        ) : isMine ? (
                          <Bomb className="h-3.5 w-3.5" />
                        ) : incoming?.outcome === "MISS" ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-300/65" />
                        ) : ship ? (
                          <span className="text-[8px] font-bold">
                            {BATTLESHIP_FLEET.find((f) => f.id === ship.id)?.shortName}
                          </span>
                        ) : null}
                      </button>
                    );
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SeaGrid({
  renderCell,
  onMouseLeave,
}: {
  renderCell: (row: number, col: number) => React.ReactNode;
  onMouseLeave?: () => void;
}) {
  return (
    <div onMouseLeave={onMouseLeave} className="select-none">
      <div className="mb-1 grid grid-cols-[18px_repeat(10,minmax(0,1fr))] gap-1 text-center font-mono-tabular text-[10px] text-[#7b8794]">
        <span />
        {COL_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="space-y-1">
        {Array.from({ length: BATTLESHIP_GRID_SIZE }).map((_, r) => (
          <div
            key={r}
            className="grid grid-cols-[18px_repeat(10,minmax(0,1fr))] items-center gap-1"
          >
            <span className="text-right font-mono-tabular text-[10px] text-[#7b8794]">
              {r + 1}
            </span>
            {Array.from({ length: BATTLESHIP_GRID_SIZE }).map((__, c) =>
              renderCell(r, c)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
