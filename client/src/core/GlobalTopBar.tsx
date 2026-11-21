import { useState } from "react";
import { Check, Copy, LogOut, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { TAUNT_EMOTES, type PublicRoomState, type TauntEmoteId } from "@arcade-hub/shared";
import { soundManager } from "../shared/audio";
import type { SocketStatus } from "./useGameSocket";

interface GlobalTopBarProps {
  room: PublicRoomState;
  playerId: string | null;
  status: SocketStatus;
  onSendTaunt: (emoteId: TauntEmoteId) => void;
  onLeaveRoom: () => void;
}

export function GlobalTopBar({
  room,
  playerId,
  status,
  onSendTaunt,
  onLeaveRoom,
}: GlobalTopBarProps) {
  const [muted, setMuted] = useState(() => soundManager.isMuted());
  const [copied, setCopied] = useState(false);
  const [tauntOpen, setTauntOpen] = useState(false);

  const p1 = room.players.find((p) => p.seat === 0);
  const p2 = room.players.find((p) => p.seat === 1);

  const toggleMute = () => {
    const next = !muted;
    soundManager.setMuted(next);
    setMuted(next);
  };

  const copyRoomLink = async () => {
    const url = `${window.location.origin}/?room=${room.roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#111210]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-1.5 px-2.5 sm:h-13 sm:gap-3 sm:px-4">
        {/* Room Code */}
        <button
          onClick={copyRoomLink}
          className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-[#9c9689] hover:bg-white/5 hover:text-[#ebe5d8] transition-colors cursor-pointer sm:gap-2 sm:px-2"
          title="Salin link room"
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              status === "connected" ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
            }`}
          />
          <span className="font-mono-tabular tracking-wider text-[#ebe5d8]">
            {room.roomId}
          </span>
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />
          )}
        </button>

        {/* Scoreboard */}
        <div className="flex min-w-0 items-center gap-1.5 text-xs sm:gap-2.5 sm:text-sm">
          <span
            className={`max-w-[56px] truncate sm:max-w-[110px] ${
              p1?.id === playerId ? "font-semibold text-[#ebe5d8]" : "text-[#9c9689]"
            }`}
          >
            {p1?.name ?? "..."}
          </span>
          <span className="font-mono-tabular shrink-0 rounded bg-[#1b1d1a] px-2 py-0.5 text-xs font-bold text-[#d4a24c] sm:px-2.5">
            {p1?.score ?? 0} : {p2?.score ?? 0}
          </span>
          <span
            className={`max-w-[56px] truncate sm:max-w-[110px] ${
              p2?.id === playerId ? "font-semibold text-[#ebe5d8]" : "text-[#9c9689]"
            }`}
          >
            {p2?.name ?? "..."}
          </span>
        </div>

        {/* Utility Controls */}
        <div className="relative flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={() => setTauntOpen((v) => !v)}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[#cfc8ba] hover:bg-white/8 hover:text-[#ebe5d8] transition-colors cursor-pointer sm:px-2.5"
            title="Kirim Taunt"
            aria-label="Kirim Taunt"
          >
            <MessageSquare className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Taunt</span>
          </button>

          {tauntOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setTauntOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-11 z-40 grid w-60 max-w-[calc(100vw-1.25rem)] grid-cols-2 gap-1 rounded-lg border border-white/12 bg-[#191a17] p-1.5 shadow-2xl">
                {TAUNT_EMOTES.map((emote) => (
                  <button
                    key={emote.id}
                    onClick={() => {
                      onSendTaunt(emote.id);
                      setTauntOpen(false);
                    }}
                    className="flex min-h-[40px] items-center gap-1.5 rounded px-2.5 py-2 text-left text-xs text-[#ebe5d8] hover:bg-white/8 transition-colors cursor-pointer"
                  >
                    <span>{emote.emoji}</span>
                    <span className="truncate">{emote.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <button
            onClick={toggleMute}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1.5 text-[#9c9689] hover:bg-white/8 hover:text-[#ebe5d8] transition-colors cursor-pointer"
            title={muted ? "Aktifkan suara" : "Bisukan suara"}
            aria-label={muted ? "Aktifkan suara" : "Bisukan suara"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md p-1.5 text-[#9c9689] hover:bg-[#d9483b]/15 hover:text-[#e87066] transition-colors cursor-pointer"
            title="Keluar"
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {room.customStake && (
        <div className="border-t border-white/6 bg-[#161714] px-3 py-1 text-center text-[11px] break-words text-[#d4a24c] sm:px-4 sm:text-xs">
          Taruhan: <span className="text-[#ebe5d8]">{room.customStake}</span>
        </div>
      )}
    </header>
  );
}
