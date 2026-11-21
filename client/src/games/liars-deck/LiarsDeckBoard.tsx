import { useEffect, useState } from "react";
import { m } from "framer-motion";
import type { GameEvent, LiarsDeckView, PublicRoomState } from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import { PlayingCard } from "./PlayingCard";
import { RevolverModal } from "./RevolverModal";

export interface GameBoardProps {
  view: unknown;
  room: PublicRoomState;
  playerId: string | null;
  lastEvents: GameEvent[];
  onAction: (action: unknown) => void;
  onSetReady: (ready: boolean) => void;
  onStartMatch: () => void;
  onReturnToLobby: () => void;
}

function ChamberPips({ fired, max }: { fired: number; max: number }) {
  return (
    <div className="flex items-center gap-1" title={`${fired}/${max} pelatuk`}>
      {Array.from({ length: max }).map((_, idx) => (
        <span
          key={idx}
          className={`h-2 w-2 rounded-full ${
            idx < fired ? "bg-[#d9483b]" : "border border-[#d4a24c]/55 bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

export function LiarsDeckBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as LiarsDeckView | null;
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [dismissedNonce, setDismissedNonce] = useState<number>(0);

  useEffect(() => {
    setSelectedIndices([]);
  }, [view?.roundNumber, view?.myHand.length, view?.phase]);

  useEffect(() => {
    for (const ev of lastEvents) {
      if (ev.type === "CARDS_PLAYED") soundManager.play("card");
      if (ev.type === "REVOLVER_CLICK") soundManager.play("click");
      if (ev.type === "REVOLVER_BANG") soundManager.play("bang");
    }
  }, [lastEvents]);

  if (!view) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#9c9689]">
        Menyiapkan kartu...
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const isMyTurn = view.phase === "PLAYING" && view.currentTurnPlayerId === playerId;
  const activeOutcome =
    view.lastOutcome && view.lastOutcome.nonce > dismissedNonce
      ? view.lastOutcome
      : null;

  const toggleCard = (idx: number) => {
    if (!view.canPlayCards) return;
    setSelectedIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((item) => item !== idx);
      if (prev.length >= 3) return prev;
      return [...prev, idx];
    });
  };

  const handlePlaySelected = () => {
    if (!view.canPlayCards || selectedIndices.length === 0) return;
    onAction({ type: "PLAY_CARDS", cardIndices: selectedIndices });
    setSelectedIndices([]);
  };

  const winner = room.players.find((p) => p.id === view.winnerId);
  const bothReady = room.players.length === 2 && room.players.every((p) => p.ready);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3.5 px-3 py-3 sm:gap-5 sm:px-4 sm:py-5">
      {/* Opponent Strip */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span
            className={`font-display truncate text-lg sm:text-xl ${
              !isMyTurn && view.phase === "PLAYING" ? "text-[#d4a24c]" : "text-[#ebe5d8]"
            }`}
          >
            {opponent?.name ?? "Lawan"}
          </span>
          <div className="shrink-0">
            <ChamberPips
              fired={view.revolver.opponentShotsFired}
              max={view.revolver.maxChambers}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          {Array.from({ length: view.opponentCardCount }).map((_, idx) => (
            <div key={idx} className="-ml-5 first:ml-0 scale-90 sm:-ml-7">
              <PlayingCard faceDown size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Baize Table */}
      <div className="baize-felt relative flex min-h-[215px] flex-col items-center justify-between rounded-2xl px-4 py-4 sm:min-h-[290px] sm:px-6 sm:py-6">
        <div className="flex w-full items-center justify-between gap-2 text-xs text-[#a9b5ab]">
          <span className="font-mono-tabular shrink-0">Ronde {view.roundNumber}</span>
          <span className={`truncate text-right ${isMyTurn ? "font-semibold text-[#f3dfb8]" : ""}`}>
            {view.phase === "MATCH_END"
              ? `${winner?.name ?? "Pemenang"} menang`
              : isMyTurn
              ? "Giliranmu"
              : `Giliran ${opponent?.name ?? "lawan"}`}
          </span>
        </div>

        {/* Center Cards: Target + Last Played */}
        <div className="my-2 flex flex-wrap items-center justify-center gap-6 sm:my-4 sm:gap-14">
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <PlayingCard rank={view.tableCard} size="md" />
            <span className="text-xs font-medium text-[#cfc8ba]">
              Kartu meja: <strong className="text-[#ebe5d8]">{view.tableCard}</strong>
            </span>
          </div>

          <div className="flex min-w-[115px] flex-col items-center justify-center text-center sm:min-w-[140px]">
            {view.lastPlay ? (
              <>
                <div className="mb-1.5 flex items-center justify-center sm:mb-2">
                  {Array.from({ length: view.lastPlay.count }).map((_, i) => (
                    <m.div
                      key={i}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="-ml-5 first:ml-0 sm:-ml-6"
                    >
                      <PlayingCard faceDown size="sm" />
                    </m.div>
                  ))}
                </div>
                <p className="text-xs text-[#d6dfd7]">
                  {view.lastPlay.playerId === playerId
                    ? "Kamu"
                    : opponent?.name ?? "Lawan"}{" "}
                  taruh {view.lastPlay.count}x {view.tableCard}
                </p>
              </>
            ) : (
              <span className="text-xs text-[#8a998d]">Meja kosong</span>
            )}
          </div>
        </div>

        {/* Match Over Inline Overlay */}
        {room.phase === "MATCH_OVER" && !activeOutcome ? (
          <div className="flex w-full flex-col items-center gap-3 pt-2 text-center">
            <p className="font-display text-xl text-[#f3dfb8] sm:text-2xl">
              {winner?.id === playerId
                ? "Kamu menang!"
                : `${winner?.name ?? "Pasangan"} menang!`}
            </p>
            {room.customStake && (
              <p className="text-xs text-[#d6dfd7]">Taruhan: {room.customStake}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {me && (
                <button
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
                onClick={onStartMatch}
                disabled={!bothReady}
                className="min-h-[42px] rounded-lg bg-[#d9483b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-35 cursor-pointer"
              >
                Mulai
              </button>
              <button
                onClick={onReturnToLobby}
                className="min-h-[42px] rounded-lg border border-white/15 px-4 py-2 text-xs text-[#cfc8ba] hover:bg-white/8 cursor-pointer"
              >
                Lobi
              </button>
            </div>
          </div>
        ) : (
          <div className="h-1" />
        )}
      </div>

      {/* Player Hand & Controls */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3 sm:gap-3 sm:pt-2">
          {view.myHand.map((card, idx) => (
            <PlayingCard
              key={`${card}-${idx}`}
              rank={card}
              size="hand"
              selected={selectedIndices.includes(idx)}
              disabled={!view.canPlayCards}
              onClick={() => toggleCard(idx)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 px-0.5 sm:flex-row sm:items-center sm:justify-between sm:px-1">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <span className="max-w-[140px] truncate text-sm font-medium text-[#ebe5d8]">
              {me?.name ?? "Kamu"}
            </span>
            <ChamberPips
              fired={view.revolver.myShotsFired}
              max={view.revolver.maxChambers}
            />
            {view.canAcceptRound && (
              <span className="text-xs font-medium text-[#d4a24c]">
                Kartu lawan habis
              </span>
            )}
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto sm:items-center">
            <button
              onClick={() => onAction({ type: "CALL_LIAR" })}
              disabled={!view.canCallLiar}
              className="min-h-[46px] rounded-lg border border-[#d9483b]/50 bg-[#2a1513] px-3 py-2.5 text-sm font-semibold text-[#f5b4ae] hover:bg-[#3a1b18] disabled:cursor-not-allowed disabled:opacity-30 transition-colors cursor-pointer sm:px-5"
            >
              Tuduh Bohong
            </button>

            {view.canAcceptRound ? (
              <button
                onClick={() => onAction({ type: "ACCEPT_ROUND" })}
                className="min-h-[46px] rounded-lg bg-[#d4a24c] px-3 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] transition-colors cursor-pointer sm:px-5"
              >
                Lanjut Ronde
              </button>
            ) : (
              <button
                onClick={handlePlaySelected}
                disabled={!view.canPlayCards || selectedIndices.length === 0}
                className="min-h-[46px] rounded-lg bg-[#d4a24c] px-3 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] disabled:cursor-not-allowed disabled:opacity-30 transition-colors cursor-pointer sm:px-5"
              >
                Taruh{selectedIndices.length > 0 ? ` (${selectedIndices.length})` : ""}
              </button>
            )}
          </div>
        </div>
      </div>

      <RevolverModal
        pendingReveal={view.pendingReveal}
        rouletteTargetId={view.rouletteTargetId}
        myPlayerId={playerId}
        players={room.players}
        myShotsFired={view.revolver.myShotsFired}
        opponentShotsFired={view.revolver.opponentShotsFired}
        maxChambers={view.revolver.maxChambers}
        activeOutcome={activeOutcome}
        onPullTrigger={() => onAction({ type: "PULL_TRIGGER" })}
        onDismissOutcome={() => {
          if (activeOutcome) setDismissedNonce(activeOutcome.nonce);
        }}
      />
    </div>
  );
}
