import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, RefreshCw, Sparkles, Zap } from "lucide-react";
import {
  SUSUN_4_COLS,
  SUSUN_4_ROWS,
  type PublicPlayer,
  type Susun4RoundEndReason,
  type Susun4TwistInfo,
  type Susun4View,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";

function WinPips({ wins, target }: { wins: number; target: number }) {
  return (
    <div className="flex items-center gap-1" title={`${wins}/${target} ronde menang`}>
      {Array.from({ length: target }).map((_, idx) => (
        <span
          key={idx}
          className={`h-2.5 w-2.5 rounded-full transition-colors ${
            idx < wins
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]"
              : "border border-white/25 bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

function getTwistMessage(twist: Susun4TwistInfo): string {
  if (twist.kind === "FLIP_COLUMN" && twist.targetCol !== null) {
    return `Kejutan! Kolom ${twist.targetCol + 1} tiba-tiba dibalik!`;
  }
  if (twist.kind === "SHIFT_LEFT") {
    return "Kejutan! Semua kolom bergeser ke kiri!";
  }
  return "Kejutan! Semua kolom bergeser ke kanan!";
}

function getReasonLabel(
  reason: Susun4RoundEndReason,
  winnerName: string | null
): string {
  switch (reason) {
    case "CONNECT_4":
      return winnerName
        ? `${winnerName} menyusun 4 koin segaris!`
        : "4 koin segaris!";
    case "TWIST_CONNECT_4":
      return winnerName
        ? `Putaran kolom menguntungkan ${winnerName}!`
        : "4 koin segaris setelah putaran!";
    case "DRAW_BOTH_CONNECT_4":
      return "Seri! Keduanya terbentuk 4 segaris setelah putaran!";
    case "DRAW_BOARD_FULL":
      return "Seri! Papan sudah penuh.";
  }
}

function getCoinStyle(seat: 0 | 1): {
  bg: string;
  label: string;
  ring: string;
} {
  if (seat === 0) {
    return {
      bg: "bg-gradient-to-br from-[#ef6458] via-[#d9483b] to-[#9f2c22]",
      ring: "border-[#f6a59e]/45",
      label: "Merah",
    };
  }
  return {
    bg: "bg-gradient-to-br from-[#f0c76f] via-[#d4a24c] to-[#9b6f23]",
    ring: "border-[#fbe6b5]/50",
    label: "Emas",
  };
}

function PlayerChip({
  player,
  isMe,
  isTurn,
  wins,
  targetWins,
}: {
  player: PublicPlayer | undefined;
  isMe: boolean;
  isTurn: boolean;
  wins: number;
  targetWins: number;
}) {
  const seat = player?.seat ?? 0;
  const coin = getCoinStyle(seat);

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
        isTurn
          ? "border-[#d4a24c]/65 bg-[#1c2119]"
          : "border-white/10 bg-[#151814]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`h-4 w-4 shrink-0 rounded-full border shadow-inner ${coin.bg} ${coin.ring}`}
        />
        <span className="truncate text-xs font-medium text-[#ebe5d8] sm:text-sm">
          {player?.name ?? "Pemain"}
          {isMe && <span className="ml-1 text-[11px] text-[#9c9689]">(kamu)</span>}
        </span>
      </div>
      <WinPips wins={wins} target={targetWins} />
    </div>
  );
}

/**
 * Interactive 7x6 Connect-4 board with sudden column flip & shift animations.
 */
export function Susun4Board({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as Susun4View | null;
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  useEffect(() => {
    for (const ev of lastEvents) {
      if (ev.type === "COIN_DROPPED") soundManager.play("card");
      if (ev.type === "BOARD_TWIST") soundManager.play("reveal");
      if (ev.type === "ROUND_WON") soundManager.play("win");
      if (ev.type === "ROUND_DRAW") soundManager.play("wrong");
    }
  }, [lastEvents]);

  const activeTwist = view?.lastTwist ?? null;
  const happenedThisMove =
    activeTwist !== null && activeTwist.moveCount === view?.moveCount;

  const seatByPlayerId = useMemo(() => {
    const map = new Map<string, 0 | 1>();
    for (const p of room.players) {
      map.set(p.id, p.seat);
    }
    return map;
  }, [room.players]);

  const winningCellSet = useMemo(() => {
    const set = new Set<string>();
    if (!view) return set;
    for (const [r, c] of view.winningCells) {
      set.add(`${r},${c}`);
    }
    return set;
  }, [view]);

  if (!view) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#9c9689]">
        Menyiapkan papan Susun 4...
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const isMyTurn =
    view.phase === "PLAYING" && view.currentTurnPlayerId === playerId;
  const bothReady =
    room.players.length === 2 && room.players.every((p) => p.ready);
  const matchWinner = room.players.find((p) => p.id === view.winnerId);
  const roundWinner = view.lastRoundSummary?.winnerId
    ? room.players.find((p) => p.id === view.lastRoundSummary?.winnerId)
    : null;

  const showTwistBanner =
    activeTwist !== null &&
    (happenedThisMove ||
      view.lastRoundSummary?.reason === "TWIST_CONNECT_4" ||
      view.lastRoundSummary?.reason === "DRAW_BOTH_CONNECT_4");

  const boardShiftAnim =
    happenedThisMove && activeTwist?.kind === "SHIFT_LEFT"
      ? { x: [18, 0] }
      : happenedThisMove && activeTwist?.kind === "SHIFT_RIGHT"
        ? { x: [-18, 0] }
        : { x: 0 };

  const handleDrop = (col: number) => {
    if (!isMyTurn) return;
    if (view.board[0]?.[col] !== null) return;
    onAction({ type: "DROP_COIN", col });
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-5">
      {/* Player Strip */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PlayerChip
          player={me}
          isMe
          isTurn={view.phase === "PLAYING" && view.currentTurnPlayerId === me?.id}
          wins={me ? (view.scores[me.id] ?? 0) : 0}
          targetWins={view.targetWins}
        />
        <PlayerChip
          player={opponent}
          isMe={false}
          isTurn={
            view.phase === "PLAYING" && view.currentTurnPlayerId === opponent?.id
          }
          wins={opponent ? (view.scores[opponent.id] ?? 0) : 0}
          targetWins={view.targetWins}
        />
      </div>

      {/* Main Felt Arena */}
      <div className="baize-felt relative flex flex-col gap-3 rounded-2xl p-3 sm:gap-4 sm:p-5">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#a9b5ab]">
          <span className="font-mono-tabular shrink-0">
            Ronde {view.roundNumber} • Langkah {view.moveCount}
          </span>
          <span
            className={`truncate text-right ${
              isMyTurn ? "font-semibold text-[#f3dfb8]" : ""
            }`}
          >
            {view.phase === "MATCH_END"
              ? `${matchWinner?.name ?? "Pemenang"} menang match!`
              : view.phase === "ROUND_END"
                ? roundWinner
                  ? `${roundWinner.name} menang ronde`
                  : "Ronde seri"
                : isMyTurn
                  ? "Giliranmu — pilih kolom"
                  : `Giliran ${opponent?.name ?? "lawan"}`}
          </span>
        </div>

        {/* Sudden Twist Notification Banner */}
        {showTwistBanner && activeTwist ? (
          <m.div
            key={`twist-${activeTwist.nonce}`}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#d4a24c]/55 bg-[#262113]/95 px-3 py-2 text-center text-xs font-semibold text-[#f3dfb8] shadow-md"
          >
            {activeTwist.kind === "FLIP_COLUMN" ? (
              <RefreshCw className="h-3.5 w-3.5 shrink-0 text-[#d4a24c]" />
            ) : activeTwist.kind === "SHIFT_LEFT" ? (
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[#d4a24c]" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#d4a24c]" />
            )}
            <span>{getTwistMessage(activeTwist)}</span>
          </m.div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-[#101813]/75 px-3 py-1.5 text-[11px] text-[#9c9689]">
            <Zap className="h-3 w-3 shrink-0 text-[#d4a24c]" />
            <span>
              Kolom bisa tiba-tiba terbalik atau bergeser setelah minimal 5 koin!
            </span>
          </div>
        )}

        {/* Column Numbers / Drop Arrows */}
        <div className="grid grid-cols-7 gap-1.5 px-1.5 sm:gap-2 sm:px-2">
          {Array.from({ length: SUSUN_4_COLS }).map((_, col) => {
            const isFull = view.board[0]?.[col] !== null;
            const active = isMyTurn && !isFull;
            const isFlippedCol =
              happenedThisMove &&
              activeTwist?.kind === "FLIP_COLUMN" &&
              activeTwist.targetCol === col;

            return (
              <button
                key={col}
                type="button"
                disabled={!active}
                onClick={() => handleDrop(col)}
                onMouseEnter={() => setHoverCol(col)}
                onMouseLeave={() => setHoverCol(null)}
                className={`flex h-7 items-center justify-center rounded-lg text-[11px] font-mono-tabular transition-colors ${
                  active
                    ? "cursor-pointer bg-[#1c2720] text-[#f3dfb8] hover:bg-[#27382d] active:scale-95"
                    : "cursor-default text-[#68776c]"
                } ${isFlippedCol ? "ring-1 ring-[#d4a24c]/70" : ""}`}
                aria-label={`Jatuhkan koin di kolom ${col + 1}`}
              >
                {active ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <span>{col + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 7x6 Board Grid */}
        <m.div
          key={
            activeTwist && activeTwist.kind !== "FLIP_COLUMN"
              ? `board-shift-${activeTwist.nonce}`
              : "board-base"
          }
          initial={
            happenedThisMove && activeTwist?.kind !== "FLIP_COLUMN"
              ? boardShiftAnim
              : false
          }
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="rounded-2xl border border-[#2d4035] bg-[#101c16] p-1.5 shadow-inner sm:p-2.5"
        >
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: SUSUN_4_COLS }).map((_, col) => {
              const isColFull = view.board[0]?.[col] !== null;
              const isColInteractive = isMyTurn && !isColFull;
              const isFlippedCol =
                happenedThisMove &&
                activeTwist?.kind === "FLIP_COLUMN" &&
                activeTwist.targetCol === col;

              return (
                <m.div
                  key={`col-${col}-${isFlippedCol ? activeTwist?.nonce : "base"}`}
                  initial={isFlippedCol ? { rotateX: 180, scale: 0.94 } : false}
                  animate={{ rotateX: 0, scale: 1 }}
                  transition={{ duration: 0.36, ease: "easeOut" }}
                  onClick={() => handleDrop(col)}
                  onMouseEnter={() => setHoverCol(col)}
                  onMouseLeave={() => setHoverCol(null)}
                  className={`flex flex-col gap-1.5 rounded-xl p-0.5 transition-colors sm:gap-2 ${
                    isColInteractive ? "cursor-pointer" : "cursor-default"
                  } ${
                    isColInteractive && hoverCol === col
                      ? "bg-white/6"
                      : isFlippedCol
                        ? "bg-[#d4a24c]/10 ring-1 ring-[#d4a24c]/45"
                        : ""
                  }`}
                >
                  {Array.from({ length: SUSUN_4_ROWS }).map((__, row) => {
                    const occupantId = view.board[row]?.[col] ?? null;
                    const seat = occupantId
                      ? (seatByPlayerId.get(occupantId) ?? 0)
                      : null;
                    const isWinning = winningCellSet.has(`${row},${col}`);
                    const isLastDropped =
                      view.lastDrop?.row === row &&
                      view.lastDrop?.col === col &&
                      !happenedThisMove;

                    return (
                      <div
                        key={row}
                        className="relative flex aspect-square w-full items-center justify-center rounded-full border border-white/8 bg-[#090e0b] p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]"
                      >
                        {occupantId && seat !== null && (
                          <m.div
                            key={`${row}-${col}-${occupantId}-${
                              isLastDropped ? view.lastDrop?.nonce : "static"
                            }`}
                            initial={
                              isLastDropped
                                ? { y: -(row + 1) * 42, opacity: 0.75, scale: 0.92 }
                                : false
                            }
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 360,
                              damping: 22,
                            }}
                            className={`h-full w-full rounded-full border shadow-md ${
                              getCoinStyle(seat).bg
                            } ${getCoinStyle(seat).ring} ${
                              isWinning
                                ? "ring-2 ring-[#fff7df] shadow-[0_0_16px_rgba(243,223,184,0.9)] animate-pulse"
                                : ""
                            }`}
                          >
                            <div className="m-[18%] h-[64%] w-[64%] rounded-full border border-white/20" />
                          </m.div>
                        )}
                      </div>
                    );
                  })}
                </m.div>
              );
            })}
          </div>
        </m.div>

        {/* Round End Banner */}
        {view.phase === "ROUND_END" && view.lastRoundSummary && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/12 bg-[#121915]/95 px-4 py-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#d4a24c]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ronde {view.lastRoundSummary.roundNumber} Selesai</span>
              </div>
              <p className="font-display text-lg text-[#ebe5d8] sm:text-xl">
                {getReasonLabel(
                  view.lastRoundSummary.reason,
                  roundWinner?.name ?? null
                )}
              </p>
            </div>

            {me && (
              <button
                type="button"
                onClick={() => onAction({ type: "NEXT_ROUND" })}
                disabled={Boolean(view.readyForNextRound[me.id])}
                className="min-h-[44px] rounded-lg bg-[#d4a24c] px-5 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] disabled:cursor-default disabled:opacity-60 transition-colors cursor-pointer"
              >
                {view.readyForNextRound[me.id]
                  ? "✓ Menunggu lawan..."
                  : "Lanjut Ronde"}
              </button>
            )}
          </div>
        )}

        {/* Match End Banner */}
        {(room.phase === "MATCH_OVER" || view.phase === "MATCH_END") && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#d4a24c]/35 bg-[#121915]/95 px-4 py-4 text-center">
            <div className="space-y-1">
              <p className="font-display text-xl text-[#f3dfb8] sm:text-2xl">
                {matchWinner?.id === playerId
                  ? "Kamu Menang!"
                  : `${matchWinner?.name ?? "Pasangan"} Menang!`}
              </p>
              {view.lastRoundSummary && (
                <p className="text-xs text-[#a9b5ab]">
                  {getReasonLabel(
                    view.lastRoundSummary.reason,
                    matchWinner?.name ?? null
                  )}
                </p>
              )}
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
  );
}
