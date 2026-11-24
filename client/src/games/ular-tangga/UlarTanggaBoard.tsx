import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import {
  Bomb,
  Crown,
  Dices,
  HelpCircle,
  Shield,
  Snowflake,
  Sparkles,
  Swords,
  X,
  Zap,
} from "lucide-react";
import {
  ULAR_TANGGA_BOARD_SIZE,
  ULAR_TANGGA_CARDS,
  ULAR_TANGGA_MAX_HAND,
  ULAR_TANGGA_MAX_TILE,
  ULAR_TANGGA_POWER_TILES,
  ULAR_TANGGA_TRAP_PENALTY,
  gridCoordToTile,
  isTrapTileEligible,
  tileToGridCoord,
  type PublicPlayer,
  type UlarTanggaCardId,
  type UlarTanggaLastMove,
  type UlarTanggaView,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";
import { BoardOverlaySvg } from "./BoardOverlaySvg";
import { DiceVisual } from "./DiceVisual";

const POWER_TILE_SET = new Set<number>(ULAR_TANGGA_POWER_TILES);
const ALL_CARD_LIST = Object.values(ULAR_TANGGA_CARDS);

function getTokenTheme(seat: 0 | 1) {
  if (seat === 0) {
    return {
      bg: "bg-gradient-to-br from-[#f26659] via-[#d9483b] to-[#8c231a]",
      ring: "border-[#fecaca]/80",
      glow: "shadow-[0_0_14px_rgba(217,72,59,0.7)]",
      labelColor: "text-[#f79d94]",
      dot: "bg-[#e35346]",
    };
  }
  return {
    bg: "bg-gradient-to-br from-[#f7d37c] via-[#d4a24c] to-[#8a5f19]",
    ring: "border-[#fef3c7]/85",
    glow: "shadow-[0_0_14px_rgba(212,162,76,0.7)]",
    labelColor: "text-[#f3dfb8]",
    dot: "bg-[#e5b55c]",
  };
}

function buildMoveDescription(
  move: UlarTanggaLastMove,
  actorName: string
): string {
  const diceText = move.dice.join(" + ");
  const parts: string[] = [
    `${actorName} melempar ${diceText} → petak ${move.landedTile}`,
  ];
  if (move.bounced) {
    parts[0] = `${actorName} melempar ${diceText} (pantul ke ${move.landedTile})`;
  }
  if (move.trapTile !== null) {
    if (move.trapBlockedByShield) {
      parts.push(`🛡️ Perisai menangkis bom di ${move.trapTile}!`);
    } else {
      parts.push(`💣 Terkena bom di ${move.trapTile}!`);
    }
  }
  if (move.portalKind === "LADDER" && move.portalTo) {
    parts.push(`🪜 Naik tangga ke ${move.portalTo}!`);
  } else if (move.portalKind === "SNAKE" && move.portalTo) {
    parts.push(`🐍 Digigit ular turun ke ${move.portalTo}!`);
  } else if (move.portalKind === "SNAKE_BLOCKED") {
    parts.push("🛡️ Perisai menangkis ular!");
  }
  if (move.drawnCard) {
    const card = ULAR_TANGGA_CARDS[move.drawnCard];
    parts.push(`Dapat kartu ${card.emoji} ${card.name}!`);
  }
  if (move.bonusRollGranted) {
    parts.push("🎲 Bonus lempar lagi!");
  }
  return parts.join(" • ");
}

function PlayerStatusCard({
  player,
  isMe,
  isTurn,
  position,
  shielded,
  miniCursed,
  cardCount,
}: {
  player: PublicPlayer | undefined;
  isMe: boolean;
  isTurn: boolean;
  position: number;
  shielded: boolean;
  miniCursed: boolean;
  cardCount: number;
}) {
  const seat = player?.seat ?? 0;
  const theme = getTokenTheme(seat);
  const progress = Math.min(100, Math.max(0, position));

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 transition-colors ${
        isTurn
          ? "border-[#d4a24c]/70 bg-[#1b241d] shadow-[0_0_20px_rgba(212,162,76,0.12)]"
          : "border-white/10 bg-[#141815]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-4 w-4 shrink-0 rounded-full border ${theme.bg} ${theme.ring}`}
          />
          <span className="truncate text-xs font-semibold text-[#ebe5d8] sm:text-sm">
            {player?.name ?? "Pemain"}
            {isMe && (
              <span className="ml-1 text-[11px] font-normal text-[#9c9689]">
                (kamu)
              </span>
            )}
          </span>
        </div>

        <span className="font-mono-tabular shrink-0 text-xs font-bold text-[#f3dfb8]">
          {position === 0 ? "START" : `${position}/100`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all duration-500 ${theme.dot}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded bg-white/6 px-1.5 py-0.5 text-[#cfc8ba]">
          🎴 {cardCount}/{ULAR_TANGGA_MAX_HAND}
        </span>
        {shielded && (
          <span className="inline-flex items-center gap-1 rounded border border-sky-400/35 bg-sky-500/15 px-1.5 py-0.5 font-medium text-sky-200">
            <Shield className="h-2.5 w-2.5" /> Perisai
          </span>
        )}
        {miniCursed && (
          <span className="inline-flex items-center gap-1 rounded border border-blue-400/35 bg-blue-500/15 px-1.5 py-0.5 font-medium text-blue-200">
            <Snowflake className="h-2.5 w-2.5" /> Beku (1–3)
          </span>
        )}
        {isTurn && (
          <span className="ml-auto font-semibold text-[#d4a24c]">
            ● Giliran
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Interactive 10x10 Snakes & Ladders board with tactical power-up cards,
 * animated token hops, traps, and SVG snakes/ladders overlay.
 */
export function UlarTanggaBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as UlarTanggaView | null;
  const [placingTrapCardIdx, setPlacingTrapCardIdx] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, number>>({});
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);

  const lastAnimatedNonceRef = useRef<number>(0);
  const lastEffectNonceRef = useRef<number>(0);

  // Sync immediate non-roll position updates (e.g. SWAP_POS or initial mount)
  useEffect(() => {
    if (!view) return;
    if (view.lastCardEffect && view.lastCardEffect.nonce > lastEffectNonceRef.current) {
      lastEffectNonceRef.current = view.lastCardEffect.nonce;
      setAnimatedPositions(view.positions);
      setPlacingTrapCardIdx(null);
    } else if (!isAnimatingMove && (!view.lastMove || view.lastMove.nonce === lastAnimatedNonceRef.current)) {
      setAnimatedPositions(view.positions);
    }
  }, [view, isAnimatingMove]);

  // Step-by-step hop animation when a new roll occurs
  useEffect(() => {
    if (!view?.lastMove) return;
    const move = view.lastMove;
    if (move.nonce <= lastAnimatedNonceRef.current) return;

    lastAnimatedNonceRef.current = move.nonce;
    setPlacingTrapCardIdx(null);

    const waypoints: number[] = [];
    if (!move.bounced) {
      for (let t = move.fromTile + 1; t <= move.landedTile; t++) {
        waypoints.push(t);
      }
    } else {
      for (let t = move.fromTile + 1; t <= ULAR_TANGGA_MAX_TILE; t++) {
        waypoints.push(t);
      }
      for (let t = ULAR_TANGGA_MAX_TILE - 1; t >= move.landedTile; t--) {
        waypoints.push(t);
      }
    }

    if (waypoints.length === 0) {
      setAnimatedPositions(view.positions);
      return;
    }

    setIsAnimatingMove(true);
    const timers: number[] = [];
    const stepMs = move.totalRoll > 6 ? 65 : 85;

    // Start from pre-move position for actor while keeping other player synced
    setAnimatedPositions({
      ...view.positions,
      [move.playerId]: move.fromTile,
    });

    let elapsed = 80;
    waypoints.forEach((tile) => {
      const id = window.setTimeout(() => {
        soundManager.play("click");
        setAnimatedPositions((prev) => ({
          ...prev,
          [move.playerId]: tile,
        }));
      }, elapsed);
      timers.push(id);
      elapsed += stepMs;
    });

    // Trap pushback step if triggered
    if (move.trapTile !== null && !move.trapBlockedByShield) {
      const trapTarget = Math.max(1, move.trapTile - ULAR_TANGGA_TRAP_PENALTY);
      elapsed += 170;
      const id = window.setTimeout(() => {
        soundManager.play("spike");
        setAnimatedPositions((prev) => ({
          ...prev,
          [move.playerId]: trapTarget,
        }));
      }, elapsed);
      timers.push(id);
    }

    // Ladder or snake slide step
    if (
      (move.portalKind === "LADDER" || move.portalKind === "SNAKE") &&
      move.portalTo !== null
    ) {
      elapsed += 200;
      const portalTarget = move.portalTo;
      const isLadder = move.portalKind === "LADDER";
      const id = window.setTimeout(() => {
        soundManager.play(isLadder ? "reveal" : "wrong");
        setAnimatedPositions((prev) => ({
          ...prev,
          [move.playerId]: portalTarget,
        }));
      }, elapsed);
      timers.push(id);
    } else if (move.portalKind === "SNAKE_BLOCKED" || move.trapBlockedByShield) {
      elapsed += 120;
      const id = window.setTimeout(() => {
        soundManager.play("reveal");
      }, elapsed);
      timers.push(id);
    }

    // Final settle
    elapsed += 180;
    const endTimer = window.setTimeout(() => {
      setAnimatedPositions(view.positions);
      setIsAnimatingMove(false);
      if (move.toTile === ULAR_TANGGA_MAX_TILE) {
        soundManager.play("win");
      } else if (move.drawnCard) {
        soundManager.play("cheer");
      }
    }, elapsed);
    timers.push(endTimer);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [view?.lastMove, view?.positions]);

  // Play sound for card actions
  useEffect(() => {
    for (const ev of lastEvents) {
      if (ev.type === "CARD_PLAYED") soundManager.play("card");
      if (ev.type === "SHIELD_BLOCKED") soundManager.play("reveal");
    }
  }, [lastEvents]);

  // Cancel trap mode if turn changes
  useEffect(() => {
    if (!view || view.currentTurnPlayerId !== playerId || view.phase !== "PLAYING") {
      setPlacingTrapCardIdx(null);
    }
  }, [view, playerId]);

  const gridCells = useMemo(() => {
    const cells: { row: number; col: number; tile: number }[] = [];
    for (let row = 0; row < ULAR_TANGGA_BOARD_SIZE; row++) {
      for (let col = 0; col < ULAR_TANGGA_BOARD_SIZE; col++) {
        cells.push({ row, col, tile: gridCoordToTile(row, col) });
      }
    }
    return cells;
  }, []);

  if (!view) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#9c9689]">
        Menyiapkan papan Ular Tangga Taktis...
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const isMyTurn =
    view.phase === "PLAYING" && view.currentTurnPlayerId === playerId;
  const bothReady =
    room.players.length === 2 && room.players.every((p) => p.ready);
  const winner = room.players.find((p) => p.id === view.winnerId);

  const myPos = me ? (animatedPositions[me.id] ?? view.positions[me.id] ?? 0) : 0;
  const oppPos = opponent
    ? (animatedPositions[opponent.id] ?? view.positions[opponent.id] ?? 0)
    : 0;
  const myTruePos = me ? (view.positions[me.id] ?? 0) : 0;
  const oppTruePos = opponent ? (view.positions[opponent.id] ?? 0) : 0;

  const trapsByTile = new Map(view.traps.map((t) => [t.tile, t]));
  const occupiedTiles = Object.values(view.positions);

  const canPlayCard = (cardId: UlarTanggaCardId): { ok: boolean; reason?: string } => {
    if (!isMyTurn) return { ok: false, reason: "Giliran lawan" };
    if (isAnimatingMove) return { ok: false, reason: "Menunggu gerak..." };
    if (view.cardPlayedThisTurn) return { ok: false, reason: "Sudah pakai kartu" };

    if (cardId === "SHIELD" && me && view.shielded[me.id]) {
      return { ok: false, reason: "Perisai sudah aktif" };
    }
    if (
      (cardId === "TURBO_DICE" || cardId === "SNIPER_DICE") &&
      view.activeDiceBuff !== null
    ) {
      return { ok: false, reason: "Buff dadu aktif" };
    }
    if (cardId === "SWAP_POS") {
      if (myTruePos < 1 || oppTruePos < 1 || myTruePos === oppTruePos) {
        return { ok: false, reason: "Butuh posisi berbeda di papan" };
      }
    }
    if (cardId === "MINI_CURSE" && opponent && view.miniCursed[opponent.id]) {
      return { ok: false, reason: "Lawan sudah beku" };
    }
    return { ok: true };
  };

  const handleCardClick = (cardIndex: number, cardId: UlarTanggaCardId) => {
    const check = canPlayCard(cardId);
    if (!check.ok) return;

    if (cardId === "TRAP_BOMB") {
      setPlacingTrapCardIdx((prev) => (prev === cardIndex ? null : cardIndex));
      return;
    }

    onAction({ type: "PLAY_CARD", cardIndex });
  };

  const handleTileClick = (tile: number) => {
    if (placingTrapCardIdx === null || !isMyTurn) return;
    if (!isTrapTileEligible(tile, occupiedTiles, view.traps)) return;
    onAction({
      type: "PLAY_CARD",
      cardIndex: placingTrapCardIdx,
      targetTile: tile,
    });
    setPlacingTrapCardIdx(null);
  };

  const handleRollDice = (chosenRoll?: number) => {
    if (!isMyTurn || isAnimatingMove) return;
    setPlacingTrapCardIdx(null);
    onAction(
      chosenRoll !== undefined
        ? { type: "ROLL_DICE", chosenRoll }
        : { type: "ROLL_DICE" }
    );
  };

  const lastActor = view.lastMove
    ? room.players.find((p) => p.id === view.lastMove?.playerId)
    : null;
  const lastEffectActor = view.lastCardEffect
    ? room.players.find((p) => p.id === view.lastCardEffect?.playerId)
    : null;

  const highlightedPortal =
    view.lastMove?.portalKind === "LADDER" || view.lastMove?.portalKind === "SNAKE"
      ? {
          from: view.lastMove.portalFrom!,
          to: view.lastMove.portalTo!,
          kind: view.lastMove.portalKind,
        }
      : null;

  const myDiceVariant: "normal" | "turbo" | "cursed" | "sniper" =
    view.activeDiceBuff === "TURBO"
      ? "turbo"
      : view.activeDiceBuff === "SNIPER"
        ? "sniper"
        : me && view.miniCursed[me.id]
          ? "cursed"
          : "normal";

  const lastRollVariant: "normal" | "turbo" | "cursed" | "sniper" =
    view.lastMove && view.lastMove.dice.length > 1 ? "turbo" : "normal";

  const playersAtStart = room.players.filter((p) => {
    const pos = animatedPositions[p.id] ?? view.positions[p.id] ?? 0;
    return pos === 0;
  });

  const boardTokens = room.players
    .map((p) => {
      const pos = animatedPositions[p.id] ?? view.positions[p.id] ?? 0;
      return { player: p, pos };
    })
    .filter((entry) => entry.pos >= 1);

  const sameBoardTile =
    boardTokens.length === 2 && boardTokens[0]!.pos === boardTokens[1]!.pos;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 px-2.5 py-3 sm:gap-4 sm:px-4 sm:py-5">
      {/* Top Player Strip */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PlayerStatusCard
          player={me}
          isMe
          isTurn={view.phase === "PLAYING" && view.currentTurnPlayerId === me?.id}
          position={myPos}
          shielded={me ? Boolean(view.shielded[me.id]) : false}
          miniCursed={me ? Boolean(view.miniCursed[me.id]) : false}
          cardCount={view.myHand.length}
        />
        <PlayerStatusCard
          player={opponent}
          isMe={false}
          isTurn={
            view.phase === "PLAYING" && view.currentTurnPlayerId === opponent?.id
          }
          position={oppPos}
          shielded={opponent ? Boolean(view.shielded[opponent.id]) : false}
          miniCursed={opponent ? Boolean(view.miniCursed[opponent.id]) : false}
          cardCount={view.opponentCardCount}
        />
      </div>

      {/* Main Arena Grid */}
      <div className="baize-felt grid grid-cols-1 gap-3.5 rounded-2xl p-2.5 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,1fr)_315px] lg:items-start">
        {/* Left Column: Board + Status Ticker */}
        <div className="flex flex-col gap-2.5">
          {/* Status / Guide Header */}
          <div className="flex items-center justify-between gap-2 text-xs text-[#a9b5ab]">
            <span className="font-mono-tabular">
              Giliran #{view.turnNumber}
            </span>
            <button
              type="button"
              onClick={() => setShowRules((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-white/12 bg-[#121a15] px-2.5 py-1 text-[11px] text-[#cfc8ba] hover:border-[#d4a24c]/50 hover:text-[#f3dfb8] transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-[#d4a24c]" />
              {showRules ? "Tutup Panduan" : "Aturan Modern"}
            </button>
          </div>

          {showRules && (
            <div className="rounded-xl border border-[#d4a24c]/30 bg-[#111813]/95 p-3 text-[11px] leading-relaxed text-[#cfc8ba] space-y-2">
              <div className="font-semibold text-[#f3dfb8]">
                Pembaruan Ular Tangga Taktis:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[#a9b5ab]">
                <li>
                  Pakai maksimal <strong className="text-[#ebe5d8]">1 Kartu Power-Up</strong> sebelum melempar dadu.
                </li>
                <li>
                  Petak <strong className="text-amber-300">⚡</strong> &amp; gigitan ular memberi kartu baru (maks 3 di tangan).
                </li>
                <li>
                  Angka <strong className="text-[#ebe5d8]">6</strong> (atau kembar Turbo) memberi <strong className="text-[#ebe5d8]">1x Bonus Lempar</strong>.
                </li>
                <li>
                  Lewat dari 100 akan <strong className="text-[#ebe5d8]">memantul mundur</strong> — harus pas di petak 100!
                </li>
              </ul>
              <div className="grid grid-cols-2 gap-1.5 pt-1 sm:grid-cols-3">
                {ALL_CARD_LIST.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-white/8 bg-[#18211b] px-2 py-1.5"
                  >
                    <div className="font-semibold text-[#ebe5d8]">
                      {card.emoji} {card.name}
                    </div>
                    <div className="text-[10px] text-[#9c9689]">
                      {card.shortDesc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trap Placement Prompt */}
          {placingTrapCardIdx !== null && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-400/60 bg-rose-950/70 px-3 py-2 text-xs text-rose-100">
              <div className="flex items-center gap-2">
                <Bomb className="h-4 w-4 shrink-0 text-rose-300 animate-pulse" />
                <span>
                  Ketuk petak kosong (5–98) di papan untuk memasang{" "}
                  <strong>Bom Jebakan</strong>!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPlacingTrapCardIdx(null)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/20 bg-black/30 px-2 py-1 text-[11px] hover:bg-black/50 cursor-pointer"
              >
                <X className="h-3 w-3" /> Batal
              </button>
            </div>
          )}

          {/* Live Move / Card Ticker */}
          <div className="min-h-[38px] rounded-xl border border-white/10 bg-[#101813]/85 px-3 py-2 text-xs text-[#d6dfd7]">
            {view.lastMove ? (
              <p className="leading-snug">
                {buildMoveDescription(view.lastMove, lastActor?.name ?? "Pemain")}
              </p>
            ) : view.lastCardEffect ? (
              <p className="leading-snug">
                <span className="font-semibold text-[#f3dfb8]">
                  {lastEffectActor?.name ?? "Pemain"}:
                </span>{" "}
                {view.lastCardEffect.detail}
              </p>
            ) : (
              <p className="text-[#9c9689]">
                Lempar dadu atau mainkan kartu power-up untuk memulai lomba ke petak 100!
              </p>
            )}
          </div>

          {/* 10x10 Board Container */}
          <div className="relative mx-auto aspect-square w-full max-w-[540px] select-none overflow-hidden rounded-xl border-2 border-[#384e41] bg-[#0e1612] shadow-2xl">
            {/* Tile Grid */}
            <div className="grid h-full w-full grid-cols-10 grid-rows-10">
              {gridCells.map(({ row, col, tile }) => {
                const isAlt = (row + col) % 2 === 1;
                const isFinish = tile === ULAR_TANGGA_MAX_TILE;
                const isStartTile = tile === 1;
                const isPowerTile = POWER_TILE_SET.has(tile);
                const trap = trapsByTile.get(tile);
                const trapEligible =
                  placingTrapCardIdx !== null &&
                  isTrapTileEligible(tile, occupiedTiles, view.traps);

                return (
                  <button
                    key={tile}
                    type="button"
                    disabled={!trapEligible}
                    onClick={() => handleTileClick(tile)}
                    className={`relative flex flex-col justify-between border border-white/[0.06] p-0.5 text-left transition-colors sm:p-1 ${
                      isFinish
                        ? "bg-gradient-to-br from-[#614718] via-[#4a3510] to-[#2b1f09]"
                        : trap
                          ? "bg-rose-950/55"
                          : isAlt
                            ? "bg-[#15221c]"
                            : "bg-[#1a2a22]"
                    } ${
                      trapEligible
                        ? "cursor-pointer ring-1 ring-inset ring-rose-400/65 hover:bg-rose-500/25"
                        : "cursor-default"
                    }`}
                  >
                    <span
                      className={`font-mono-tabular text-[9px] leading-none sm:text-[10px] ${
                        isFinish
                          ? "font-bold text-[#fde68a]"
                          : isStartTile
                            ? "font-bold text-emerald-300"
                            : isPowerTile
                              ? "font-semibold text-amber-200/90"
                              : "text-[#8ea093]"
                      }`}
                    >
                      {tile}
                    </span>

                    {isFinish && (
                      <Crown className="mx-auto mb-0.5 h-3.5 w-3.5 text-[#facc15] sm:h-4 sm:w-4" />
                    )}
                    {isPowerTile && !trap && (
                      <span className="self-end text-[9px] leading-none text-amber-300/90 sm:text-[11px]">
                        ⚡
                      </span>
                    )}
                    {trap && (
                      <span
                        className="self-center text-xs leading-none drop-shadow sm:text-sm"
                        title="Bom Jebakan (-5 petak)"
                      >
                        💣
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* SVG Overlay: Snakes & Ladders */}
            <BoardOverlaySvg highlightedPortal={highlightedPortal} />

            {/* Animated Player Tokens on Board (1..100) */}
            <div className="pointer-events-none absolute inset-0">
              {boardTokens.map(({ player, pos }) => {
                const { row, col } = tileToGridCoord(pos);
                const theme = getTokenTheme(player.seat);
                const isShielded = Boolean(view.shielded[player.id]);
                const offsetX = sameBoardTile
                  ? player.seat === 0
                    ? -6
                    : 6
                  : 0;
                const offsetY = sameBoardTile
                  ? player.seat === 0
                    ? -4
                    : 4
                  : 0;

                return (
                  <m.div
                    key={player.id}
                    initial={false}
                    animate={{
                      left: `${col * 10}%`,
                      top: `${row * 10}%`,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 26,
                    }}
                    className="absolute flex h-[10%] w-[10%] items-center justify-center"
                    style={{
                      transform: `translate(${offsetX}px, ${offsetY}px)`,
                      zIndex: player.id === view.currentTurnPlayerId ? 20 : 15,
                    }}
                  >
                    <div
                      className={`relative flex h-[68%] w-[68%] items-center justify-center rounded-full border-2 ${theme.bg} ${theme.ring} ${theme.glow}`}
                    >
                      <span className="text-[9px] font-bold uppercase text-white drop-shadow sm:text-[10px]">
                        {player.name.slice(0, 1)}
                      </span>
                      {isShielded && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-400 text-[8px] text-[#091926] shadow">
                          🛡
                        </span>
                      )}
                    </div>
                  </m.div>
                );
              })}
            </div>
          </div>

          {/* Start Dock (for players still at tile 0) */}
          {playersAtStart.length > 0 && (
            <div className="mx-auto flex w-full max-w-[540px] items-center gap-2 rounded-lg border border-white/8 bg-[#101813]/75 px-3 py-1.5 text-[11px] text-[#9c9689]">
              <span className="font-mono-tabular uppercase tracking-wider text-emerald-300/90">
                Start (0):
              </span>
              <div className="flex items-center gap-2">
                {playersAtStart.map((p) => {
                  const theme = getTokenTheme(p.seat);
                  return (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 text-[#ebe5d8]"
                    >
                      <span
                        className={`h-3 w-3 rounded-full border ${theme.bg} ${theme.ring}`}
                      />
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dice Controls & Tactical Power-Up Hand */}
        <div className="flex flex-col gap-3">
          {/* Dice Roll Panel */}
          <div className="rounded-xl border border-white/12 bg-[#111813]/90 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-[11px] font-medium uppercase tracking-wider text-[#9c9689]">
                  {view.phase === "MATCH_END"
                    ? "Match Selesai"
                    : isMyTurn
                      ? "Giliranmu"
                      : `Giliran ${opponent?.name ?? "Lawan"}`}
                </div>
                <div className="text-xs text-[#cfc8ba]">
                  {view.activeDiceBuff === "TURBO"
                    ? "Dadu Turbo aktif: lempar 2 dadu!"
                    : view.activeDiceBuff === "SNIPER"
                      ? "Dadu Presisi aktif: pilih angkanya!"
                      : view.usedBonusRollThisTurn
                        ? "Bonus lempar lagi aktif!"
                        : me && view.miniCursed[me.id] && isMyTurn
                          ? "Terkena Dadu Beku (maks 1–3)"
                          : view.lastMove
                            ? `Terakhir: ${lastActor?.name ?? "Pemain"} dapat ${view.lastMove.totalRoll}`
                            : "Siap melempar dadu"}
                </div>
              </div>

              {/* Last Rolled Dice Visual */}
              <div className="flex items-center gap-1.5">
                {view.lastMove ? (
                  view.lastMove.dice.map((val, idx) => (
                    <DiceVisual
                      key={idx}
                      value={val}
                      rollKey={`${view.lastMove!.nonce}-${idx}`}
                      variant={
                        view.lastMove!.dice.length > 1
                          ? "turbo"
                          : lastRollVariant
                      }
                      size="sm"
                    />
                  ))
                ) : (
                  <DiceVisual value={6} rollKey="init" size="sm" />
                )}
              </div>
            </div>

            {/* Active Action Area */}
            {view.phase === "PLAYING" && (
              <>
                {isMyTurn && view.activeDiceBuff === "SNIPER" ? (
                  <div className="space-y-2">
                    <div className="text-center text-[11px] font-medium text-emerald-300">
                      Pilih angka dadu presisi (1–6):
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          disabled={isAnimatingMove}
                          onClick={() => handleRollDice(num)}
                          className="font-mono-tabular flex h-11 items-center justify-center rounded-lg border border-emerald-400/45 bg-emerald-500/20 text-sm font-bold text-emerald-100 hover:bg-emerald-500/35 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!isMyTurn || isAnimatingMove}
                    onClick={() => handleRollDice()}
                    className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                      myDiceVariant === "turbo"
                        ? "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-[#1a1103] shadow-[0_0_18px_rgba(245,158,11,0.35)] hover:brightness-105"
                        : myDiceVariant === "cursed"
                          ? "bg-gradient-to-r from-[#60a5fa] to-[#3b82f6] text-[#09182e]"
                          : "bg-[#d4a24c] text-[#111210] hover:bg-[#e1b362] active:scale-[0.99]"
                    }`}
                  >
                    {view.activeDiceBuff === "TURBO" ? (
                      <>
                        <Zap className="h-4 w-4" />
                        Lempar 2 Dadu Turbo!
                      </>
                    ) : me && view.miniCursed[me.id] && isMyTurn ? (
                      <>
                        <Snowflake className="h-4 w-4" />
                        Lempar Dadu Beku (1–3)
                      </>
                    ) : (
                      <>
                        <Dices className="h-4 w-4" />
                        {isMyTurn
                          ? view.usedBonusRollThisTurn
                            ? "Lempar Bonus Roll!"
                            : "Lempar Dadu"
                          : `Menunggu ${opponent?.name ?? "Lawan"}...`}
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Power-Up Cards Hand */}
          {view.phase === "PLAYING" && (
            <div className="rounded-xl border border-white/12 bg-[#111813]/90 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ebe5d8]">
                  <Swords className="h-3.5 w-3.5 text-[#d4a24c]" />
                  <span>Kartu Power-Up</span>
                </div>
                <span className="font-mono-tabular text-[11px] text-[#9c9689]">
                  {view.myHand.length}/{ULAR_TANGGA_MAX_HAND}
                </span>
              </div>

              {view.myHand.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-[#0d120f] px-3 py-4 text-center text-xs text-[#7e8a81]">
                  Tangan kosong. Mendaratlah di petak{" "}
                  <span className="text-amber-300">⚡</span> untuk mengambil kartu!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {view.myHand.map((cardId, idx) => {
                    const meta = ULAR_TANGGA_CARDS[cardId];
                    const check = canPlayCard(cardId);
                    const isPlacingThisTrap = placingTrapCardIdx === idx;

                    return (
                      <button
                        key={`${cardId}-${idx}`}
                        type="button"
                        disabled={!check.ok}
                        onClick={() => handleCardClick(idx, cardId)}
                        className={`group flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                          isPlacingThisTrap
                            ? "border-rose-400 bg-rose-950/55 ring-1 ring-rose-400/50 cursor-pointer"
                            : check.ok
                              ? "border-white/15 bg-[#18221c] hover:border-[#d4a24c]/60 hover:bg-[#1e2c24] active:scale-[0.99] cursor-pointer"
                              : "border-white/8 bg-[#121914] opacity-55 cursor-not-allowed"
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-base">
                          {meta.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-semibold text-[#ebe5d8]">
                              {meta.name}
                            </span>
                            {isPlacingThisTrap ? (
                              <span className="text-[10px] font-semibold text-rose-300">
                                Pilih petak
                              </span>
                            ) : !check.ok && check.reason ? (
                              <span className="truncate text-[10px] text-[#9c9689]">
                                {check.reason}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-[#d4a24c] opacity-0 group-hover:opacity-100 transition-opacity">
                                Pakai
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#9c9689]">
                            {meta.shortDesc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Match End Banner */}
          {(room.phase === "MATCH_OVER" || view.phase === "MATCH_END") && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#d4a24c]/45 bg-[#121915]/95 px-4 py-4 text-center">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d4a24c]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Petak 100 Tercapai!</span>
                </div>
                <p className="font-display text-xl text-[#f3dfb8] sm:text-2xl">
                  {winner?.id === playerId
                    ? "Kamu Menang!"
                    : `${winner?.name ?? "Pasangan"} Menang!`}
                </p>
                {room.customStake && (
                  <p className="text-xs text-[#d6dfd7]">
                    Taruhan: {room.customStake}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {me && (
                  <button
                    type="button"
                    onClick={() => onSetReady(!me.ready)}
                    className={`min-h-[42px] rounded-lg border px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      me.ready
                        ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                        : "border-white/20 bg-[#131b16] text-[#ebe5d8]"
                    }`}
                  >
                    {me.ready ? "✓ Siap" : "Main Lagi"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onStartMatch}
                  disabled={!bothReady}
                  className="min-h-[42px] rounded-lg bg-[#d9483b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-35 cursor-pointer"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
