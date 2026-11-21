import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { PublicRoomState } from "@arcade-hub/shared";
import { REGISTERED_GAMES } from "../games/registry";
import { createRoom, type SocketStatus } from "./useGameSocket";

interface EntryScreenProps {
  initialRoomCode: string;
  status: SocketStatus;
  onJoin: (roomId: string, playerName: string) => void;
}

export function EntryScreen({ initialRoomCode, status, onJoin }: EntryScreenProps) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [inviteMode, setInviteMode] = useState(() => Boolean(initialRoomCode));
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreate = async () => {
    const cleanName = playerName.trim();
    if (!cleanName) {
      setLocalError("Isi namamu dulu.");
      return;
    }
    setLocalError(null);
    setCreating(true);
    try {
      const newRoomId = await createRoom();
      const url = new URL(window.location.href);
      url.searchParams.set("room", newRoomId);
      window.history.replaceState({}, "", url.toString());
      onJoin(newRoomId, cleanName);
    } catch {
      setLocalError("Gagal menghubungi server.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim();
    const cleanRoom = roomCode.trim().toUpperCase();
    if (!cleanName) {
      setLocalError("Isi namamu dulu.");
      return;
    }
    if (cleanRoom.length < 3) {
      setLocalError("Kode room tidak valid.");
      return;
    }
    setLocalError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("room", cleanRoom);
    window.history.replaceState({}, "", url.toString());
    onJoin(cleanRoom, cleanName);
  };

  const switchToCreateMode = () => {
    setInviteMode(false);
    setRoomCode("");
    setLocalError(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl tracking-tight text-[#ebe5d8] sm:text-5xl">
          {inviteMode ? (
            <>
              Gabung Meja{" "}
              <span className="font-mono-tabular text-[#d4a24c]">{roomCode}</span>
            </>
          ) : (
            "Arcade Hub"
          )}
        </h1>
        <p className="mt-1.5 text-sm text-[#9c9689]">
          {inviteMode ? "Masukkan nama untuk masuk ke meja ini." : "Meja duel 1v1 privat."}
        </p>
      </div>

      {inviteMode ? (
        <form
          onSubmit={handleJoin}
          className="space-y-4 rounded-xl border border-white/10 bg-[#171815] p-6"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9c9689]">
              Nama
            </label>
            <input
              type="text"
              maxLength={24}
              autoFocus
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nama panggilan..."
              className="w-full rounded-lg border border-white/12 bg-[#111210] px-3.5 py-2.5 text-sm text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
            />
          </div>

          {localError && <p className="text-xs text-[#e87066]">{localError}</p>}

          <button
            type="submit"
            disabled={status === "connecting"}
            className="w-full rounded-lg bg-[#d4a24c] px-4 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {status === "connecting" ? "Masuk..." : `Masuk Meja ${roomCode}`}
          </button>

          <button
            type="button"
            onClick={switchToCreateMode}
            className="w-full pt-1 text-center text-xs text-[#9c9689] hover:text-[#ebe5d8] transition-colors cursor-pointer"
          >
            Atau buat meja baru
          </button>
        </form>
      ) : (
        <div className="space-y-5 rounded-xl border border-white/10 bg-[#171815] p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9c9689]">
              Nama
            </label>
            <input
              type="text"
              maxLength={24}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Nama panggilan..."
              className="w-full rounded-lg border border-white/12 bg-[#111210] px-3.5 py-2.5 text-sm text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
            />
          </div>

          {localError && <p className="text-xs text-[#e87066]">{localError}</p>}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || status === "connecting"}
            className="w-full rounded-lg bg-[#d4a24c] px-4 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {creating ? "Membuat meja..." : "Buat Meja Baru"}
          </button>

          <div className="border-t border-white/8 pt-4">
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                maxLength={12}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Kode room"
                className="font-mono-tabular flex-1 rounded-lg border border-white/12 bg-[#111210] px-3.5 py-2.5 text-sm uppercase tracking-wider text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
              />
              <button
                type="submit"
                disabled={status === "connecting"}
                className="rounded-lg border border-white/15 bg-[#20221d] px-4 py-2.5 text-sm font-medium text-[#ebe5d8] hover:bg-[#2a2d26] disabled:opacity-50 transition-colors cursor-pointer"
              >
                Masuk
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface LobbyViewProps {
  room: PublicRoomState;
  playerId: string | null;
  onSetStake: (stakeText: string) => void;
  onSelectGame: (gameId: string) => void;
  onSetReady: (ready: boolean) => void;
  onStartMatch: () => void;
}

export function LobbyView({
  room,
  playerId,
  onSetStake,
  onSelectGame,
  onSetReady,
  onStartMatch,
}: LobbyViewProps) {
  const [stakeDraft, setStakeDraft] = useState(room.customStake);
  const [copiedLink, setCopiedLink] = useState(false);

  const me = room.players.find((p) => p.id === playerId);
  const bothReady = room.players.length === 2 && room.players.every((p) => p.ready);

  const copyInvite = async () => {
    const inviteUrl = `${window.location.origin}/?room=${room.roomId}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="space-y-6">
        {/* Room & Invite */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <h2 className="font-display text-3xl text-[#ebe5d8]">
              Meja <span className="font-mono-tabular text-[#d4a24c]">{room.roomId}</span>
            </h2>
          </div>
          <button
            onClick={copyInvite}
            className="flex items-center gap-2 rounded-lg border border-white/12 bg-[#1a1c18] px-3.5 py-2 text-xs font-medium text-[#ebe5d8] hover:bg-[#232620] transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[#9c9689]" />
                Salin Link
              </>
            )}
          </button>
        </div>

        {/* Players */}
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((seatIndex) => {
            const occupant = room.players.find((p) => p.seat === seatIndex);
            const isMe = occupant?.id === playerId;
            return (
              <div
                key={seatIndex}
                className={`flex items-center justify-between rounded-lg border px-4 py-3.5 ${
                  occupant
                    ? occupant.ready
                      ? "border-emerald-500/40 bg-[#151e19]"
                      : "border-white/12 bg-[#171815]"
                    : "border-dashed border-white/10 bg-[#141512]"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-[#ebe5d8]">
                    {occupant ? occupant.name : "Menunggu pemain..."}
                    {isMe && <span className="ml-1.5 text-xs text-[#9c9689]">(kamu)</span>}
                  </p>
                </div>
                {occupant && (
                  <span
                    className={`text-xs font-medium ${
                      occupant.ready ? "text-emerald-400" : "text-[#9c9689]"
                    }`}
                  >
                    {occupant.ready ? "Siap" : "Belum siap"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Game List */}
        <div>
          <p className="mb-2 text-xs font-medium text-[#9c9689]">Game</p>
          <div className="space-y-2">
            {REGISTERED_GAMES.map((game) => {
              const selected = room.selectedGameId === game.id;
              return (
                <button
                  key={game.id}
                  onClick={() => onSelectGame(game.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer ${
                    selected
                      ? "border-[#d4a24c]/60 bg-[#1c2019]"
                      : "border-white/10 bg-[#171815] hover:border-white/20"
                  }`}
                >
                  <div>
                    <div className="font-display text-lg text-[#ebe5d8]">{game.name}</div>
                    <div className="text-xs text-[#9c9689]">{game.tagline}</div>
                  </div>
                  {selected && (
                    <span className="h-2 w-2 rounded-full bg-[#d4a24c]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stake */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSetStake(stakeDraft);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            maxLength={80}
            value={stakeDraft}
            onChange={(e) => setStakeDraft(e.target.value)}
            placeholder="Taruhan (opsional), misal: traktir kopi"
            className="flex-1 rounded-lg border border-white/12 bg-[#171815] px-3.5 py-2.5 text-sm text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
          />
          <button
            type="submit"
            className="rounded-lg border border-white/12 bg-[#20221d] px-4 py-2.5 text-xs font-medium text-[#ebe5d8] hover:bg-[#2a2d26] transition-colors cursor-pointer"
          >
            Simpan
          </button>
        </form>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {me && (
            <button
              onClick={() => onSetReady(!me.ready)}
              className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                me.ready
                  ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-300"
                  : "border-white/15 bg-[#1b1d19] text-[#ebe5d8] hover:bg-[#242721]"
              }`}
            >
              {me.ready ? "✓ Siap" : "Siap"}
            </button>
          )}

          <button
            onClick={onStartMatch}
            disabled={!bothReady}
            className="rounded-lg bg-[#d9483b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#e15a4e] disabled:cursor-not-allowed disabled:opacity-35 transition-colors cursor-pointer"
          >
            Mulai
          </button>
        </div>
      </div>
    </div>
  );
}
