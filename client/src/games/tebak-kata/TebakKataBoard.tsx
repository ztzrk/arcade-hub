import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Eye, EyeOff, Lightbulb, Lock, Send, Sparkles } from "lucide-react";
import type {
  TebakKataSlot,
  TebakKataView,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";

function groupSlotsByWord(slots: TebakKataSlot[]): TebakKataSlot[][] {
  const groups: TebakKataSlot[][] = [];
  let current: TebakKataSlot[] = [];

  for (const slot of slots) {
    if (slot.kind === "space") {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
    } else {
      current.push(slot);
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups;
}

function buildPreviewSlots(rawInput: string): TebakKataSlot[] {
  const normalized = rawInput.trim().replace(/\s+/g, " ").toUpperCase();
  if (!normalized) return [];
  const slots: TebakKataSlot[] = [];
  for (const ch of normalized) {
    if (ch === " ") {
      slots.push({ kind: "space" });
    } else if (/^[A-Z]$/.test(ch)) {
      slots.push({ kind: "blank" });
    }
  }
  return slots;
}

function SlotRow({
  slots,
  compact = false,
}: {
  slots: TebakKataSlot[];
  compact?: boolean;
}) {
  const wordGroups = useMemo(() => groupSlotsByWord(slots), [slots]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
      {wordGroups.map((group, wordIdx) => (
        <div key={wordIdx} className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {group.map((slot, charIdx) => {
            const isLetter = slot.kind === "letter";
            return (
              <motion.div
                key={`${wordIdx}-${charIdx}-${isLetter ? slot.char : "blank"}`}
                initial={isLetter ? { scale: 0.8, rotateX: 70, opacity: 0.4 } : false}
                animate={{ scale: 1, rotateX: 0, opacity: 1 }}
                transition={{ duration: 0.22 }}
                className={`font-mono-tabular flex items-center justify-center rounded-lg border font-bold uppercase select-none ${
                  compact
                    ? "h-8 w-7 text-sm"
                    : "h-12 w-10 text-xl sm:h-14 sm:w-12 sm:text-2xl"
                } ${
                  isLetter
                    ? "border-[#d4a24c]/70 bg-[#252318] text-[#f3dfb8] shadow-inner"
                    : "border-white/15 bg-[#111915]/85 text-[#8a998d]"
                }`}
              >
                {isLetter ? (
                  slot.char
                ) : (
                  <span
                    className={`block rounded-full bg-[#cfc8ba]/65 ${
                      compact ? "h-0.5 w-3.5 translate-y-2" : "h-0.5 w-5 translate-y-3"
                    }`}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function TebakKataBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as TebakKataView | null;

  const [wordDraft, setWordDraft] = useState("");
  const [clueDraft, setClueDraft] = useState("");
  const [maskDraft, setMaskDraft] = useState(true);
  const [showMyLockedWord, setShowMyLockedWord] = useState(false);
  const [guessDraft, setGuessDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [wrongShakeKey, setWrongShakeKey] = useState(0);

  useEffect(() => {
    setWordDraft("");
    setClueDraft("");
    setGuessDraft("");
    setLocalError(null);
    setShowMyLockedWord(false);
  }, [view?.roundNumber]);

  useEffect(() => {
    for (const ev of lastEvents) {
      if (ev.type === "LETTER_REVEALED") {
        if (ev.payload?.guesserId === playerId) {
          soundManager.play("reveal");
        } else if (ev.payload?.ownerId === playerId) {
          soundManager.play("click");
        }
      }
      if (ev.type === "WRONG_GUESS" && ev.payload?.playerId === playerId) {
        soundManager.play("wrong");
        setWrongShakeKey((k) => k + 1);
      }
      if (ev.type === "WORDS_LOCKED") {
        soundManager.play("card");
      }
      if (ev.type === "ROUND_WON" || ev.type === "MATCH_WON") {
        soundManager.play("win");
      }
    }
  }, [lastEvents, playerId]);

  if (!view) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#9c9689]">
        Menyiapkan papan Tebak Kata...
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const myScore = (playerId ? view.scores[playerId] : 0) ?? 0;
  const opponentScore = (opponent ? view.scores[opponent.id] : 0) ?? 0;

  const previewSlots = buildPreviewSlots(wordDraft);
  const previewLettersCount = previewSlots.filter((s) => s.kind === "blank").length;
  const winner = room.players.find((p) => p.id === view.winnerId);
  const bothReady = room.players.length === 2 && room.players.every((p) => p.ready);

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = wordDraft.trim().replace(/\s+/g, " ").toUpperCase();
    if (!cleaned || cleaned.length > 24) {
      setLocalError("Kata harus antara 2 hingga 24 karakter.");
      return;
    }
    if (!/^[A-Z ]+$/.test(cleaned)) {
      setLocalError("Gunakan huruf A–Z dan spasi saja.");
      return;
    }
    if (cleaned.replace(/ /g, "").length < 2) {
      setLocalError("Masukkan minimal 2 huruf.");
      return;
    }
    setLocalError(null);
    onAction({
      type: "SUBMIT_WORD",
      word: cleaned,
      clue: clueDraft.trim(),
    });
  };

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = guessDraft.trim().replace(/\s+/g, " ").toUpperCase();
    if (!cleaned) {
      setLocalError("Ketik tebakanmu dulu.");
      return;
    }
    if (!/^[A-Z ]+$/.test(cleaned)) {
      setLocalError("Tebakan hanya boleh huruf A–Z dan spasi.");
      return;
    }
    if (view.myGuesses.includes(cleaned)) {
      setLocalError("Kata itu sudah kamu coba.");
      return;
    }
    setLocalError(null);
    onAction({ type: "SUBMIT_GUESS", guess: cleaned });
    setGuessDraft("");
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-5">
      {/* Match Score & Round Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5 text-xs text-[#a9b5ab]">
          <span className="font-mono-tabular rounded-md border border-white/10 bg-[#171815] px-2.5 py-1 text-[#ebe5d8]">
            Ronde {view.roundNumber}
          </span>
          <span>First to {view.targetWins}</span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#171815] px-3.5 py-1.5 text-sm">
          <span className="font-medium text-[#ebe5d8]">{me?.name ?? "Kamu"}</span>
          <span className="font-mono-tabular rounded bg-[#d4a24c]/15 px-2 py-0.5 font-bold text-[#d4a24c]">
            {myScore}
          </span>
          <span className="text-xs text-[#6b665d]">:</span>
          <span className="font-mono-tabular rounded bg-white/8 px-2 py-0.5 font-bold text-[#ebe5d8]">
            {opponentScore}
          </span>
          <span className="font-medium text-[#cfc8ba]">
            {opponent?.name ?? "Lawan"}
          </span>
        </div>
      </div>

      {/* Main Baize Table */}
      <div className="baize-felt relative flex min-h-[340px] flex-col items-center justify-between rounded-2xl px-5 py-6 sm:px-8">
        {/* Phase 1: SETUP_WORDS */}
        {view.phase === "SETUP_WORDS" && (
          <div className="my-auto w-full max-w-lg space-y-5">
            <div className="text-center">
              <h2 className="font-display text-2xl text-[#f3dfb8] sm:text-3xl">
                Siapkan Kata Rahasia
              </h2>
              <p className="mt-1 text-xs text-[#b8c4ba]">
                Isi kata atau frasa yang harus ditebak {opponent?.name ?? "pasanganmu"}.
              </p>
            </div>

            {!view.myWordSubmitted ? (
              <form onSubmit={handleSubmitWord} className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#cfc8ba]">
                      Kata / Frasa Rahasia
                    </label>
                    <button
                      type="button"
                      onClick={() => setMaskDraft((m) => !m)}
                      className="flex items-center gap-1 text-xs text-[#a9b5ab] hover:text-[#ebe5d8] cursor-pointer"
                    >
                      {maskDraft ? (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Tampilkan
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Sembunyikan
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type={maskDraft ? "password" : "text"}
                    autoFocus
                    maxLength={24}
                    autoComplete="off"
                    value={wordDraft}
                    onChange={(e) => {
                      setWordDraft(e.target.value.toUpperCase());
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Misal: KOPI SUSU"
                    className="font-mono-tabular w-full rounded-xl border border-white/15 bg-[#111512]/90 px-4 py-3 text-base uppercase tracking-wider text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
                  />
                </div>

                {/* Live blank preview */}
                {previewSlots.length > 0 && (
                  <div className="rounded-xl border border-white/10 bg-[#111714]/75 px-4 py-3 text-center">
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-[#9c9689]">
                      Tampilan di layar {opponent?.name ?? "lawan"} ({previewLettersCount} huruf)
                    </p>
                    <SlotRow slots={previewSlots} compact />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#cfc8ba]">
                    Petunjuk Singkat (opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={clueDraft}
                    onChange={(e) => setClueDraft(e.target.value)}
                    placeholder="Misal: Minuman favorit kita"
                    className="w-full rounded-xl border border-white/12 bg-[#111512]/80 px-4 py-2.5 text-sm text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
                  />
                </div>

                {localError && (
                  <p className="text-center text-xs text-[#f5b4ae]">{localError}</p>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4a24c] px-5 py-3 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] transition-colors cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  Kunci Kata Rahasia
                </button>
              </form>
            ) : (
              <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-[#131d17]/90 p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#ebe5d8]">
                    Kata rahasiamu sudah dikunci!
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-[#a9b5ab]">
                    <span>
                      Katamu:{" "}
                      <strong className="font-mono-tabular text-[#f3dfb8]">
                        {showMyLockedWord ? view.myWord : "••••••••"}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMyLockedWord((s) => !s)}
                      className="text-[#d4a24c] hover:underline cursor-pointer"
                    >
                      {showMyLockedWord ? "Tutup" : "Intip"}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#9c9689]">
                  {view.opponentWordSubmitted
                    ? `${opponent?.name ?? "Pasangan"} juga sudah siap!`
                    : `Menunggu ${opponent?.name ?? "pasangan"} mengisi kata...`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: GUESSING */}
        {view.phase === "GUESSING" && (
          <div className="flex w-full flex-1 flex-col justify-between gap-6">
            {/* Header & Clue */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#b8c4ba]">
              <span>
                Tebak kata milik{" "}
                <strong className="text-[#ebe5d8]">{opponent?.name ?? "Lawan"}</strong>
              </span>
              <span className="font-mono-tabular text-[#cfc8ba]">
                {view.targetWordCount} kata • {view.targetLetterCount} huruf
              </span>
            </div>

            {view.opponentClue && (
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[#d4a24c]/35 bg-[#232015]/90 px-3.5 py-1 text-xs text-[#f3dfb8]">
                <Sparkles className="h-3.5 w-3.5 text-[#d4a24c]" />
                <span>Petunjuk: {view.opponentClue}</span>
              </div>
            )}

            {/* Word Blanks UI ______ */}
            <div className="my-2 flex flex-col items-center justify-center py-2">
              <SlotRow slots={view.opponentSlots} />
            </div>

            {/* Guess Input + Reveal 1 Letter */}
            <div className="mx-auto w-full max-w-xl space-y-3">
              <motion.form
                key={wrongShakeKey}
                animate={wrongShakeKey > 0 ? { x: [0, -7, 7, -5, 5, 0] } : undefined}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmitGuess}
                className="flex flex-col gap-2.5 sm:flex-row"
              >
                <input
                  type="text"
                  autoFocus
                  maxLength={40}
                  autoComplete="off"
                  value={guessDraft}
                  onChange={(e) => {
                    setGuessDraft(e.target.value.toUpperCase());
                    if (localError) setLocalError(null);
                  }}
                  placeholder="Ketik tebakan kata/frasa..."
                  className="font-mono-tabular flex-1 rounded-xl border border-white/15 bg-[#111512]/95 px-4 py-3 text-base uppercase tracking-wider text-[#ebe5d8] placeholder-[#6b665d] outline-none focus:border-[#d4a24c]"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#d4a24c] px-5 py-3 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] transition-colors cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Tebak
                </button>
              </motion.form>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {localError ? (
                  <span className="text-xs text-[#f5b4ae]">{localError}</span>
                ) : (
                  <span className="text-xs text-[#8a998d]">
                    {view.hintsUsed > 0
                      ? `${view.hintsUsed}/${view.targetLetterCount} huruf dibuka oleh ${opponent?.name ?? "lawan"}`
                      : "Siapa cepat menebak, dia menang!"}
                  </span>
                )}

                <span className="text-xs text-[#8a998d]">
                  {view.myGuesses.length > 0 ? `${view.myGuesses.length}x percobaan` : ""}
                </span>
              </div>

              {view.myGuesses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-[#8a998d]">Sudah dicoba:</span>
                  {view.myGuesses.map((g, idx) => (
                    <span
                      key={`${g}-${idx}`}
                      className="font-mono-tabular rounded border border-[#d9483b]/30 bg-[#281615]/80 px-2 py-0.5 text-[11px] text-[#f5b4ae] line-through decoration-[#f5b4ae]/50"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase 3: ROUND_END */}
        {view.phase === "ROUND_END" && view.lastRoundSummary && (
          <div className="my-auto w-full max-w-lg space-y-5 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#a9b5ab]">
                Ronde {view.lastRoundSummary.roundNumber} Selesai
              </p>
              <h2 className="mt-1 font-display text-2xl text-[#f3dfb8] sm:text-3xl">
                {view.lastRoundSummary.winnerId === playerId
                  ? "Kamu Menang Ronde Ini!"
                  : `${opponent?.name ?? "Pasangan"} Lebih Cepat!`}
              </h2>
            </div>

            <div className="grid gap-3 text-left sm:grid-cols-2">
              {[me, opponent].map((p) => {
                if (!p) return null;
                const word = view.lastRoundSummary?.words[p.id] ?? "-";
                const guesses = view.lastRoundSummary?.guessCounts[p.id] ?? 0;
                const hints = view.lastRoundSummary?.hintsUsed[p.id] ?? 0;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-white/12 bg-[#121915]/90 p-4"
                  >
                    <p className="text-xs text-[#9c9689]">Kata rahasia {p.name}</p>
                    <p className="font-mono-tabular mt-1 text-lg font-bold tracking-wide text-[#f3dfb8]">
                      {word}
                    </p>
                    <p className="mt-2 text-[11px] text-[#a9b5ab]">
                      {p.id === playerId ? "Kamu" : p.name} menebak {guesses}x •{" "}
                      {hints} bantuan huruf
                    </p>
                  </div>
                );
              })}
            </div>

            {(() => {
              const iAmReady = Boolean(playerId && view.readyForNextRound[playerId]);
              const readyCount = Object.values(view.readyForNextRound).filter(Boolean).length;
              return (
                <button
                  type="button"
                  disabled={iAmReady}
                  onClick={() => onAction({ type: "NEXT_ROUND" })}
                  className="rounded-xl bg-[#d4a24c] px-6 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] disabled:cursor-default disabled:opacity-65 transition-colors cursor-pointer"
                >
                  {iAmReady
                    ? `Menunggu ${opponent?.name ?? "lawan"}... (${readyCount}/2)`
                    : `Lanjut Ronde Berikutnya (${readyCount}/2)`}
                </button>
              );
            })()}
          </div>
        )}

        {/* Phase 4: MATCH_END / MATCH_OVER */}
        {(view.phase === "MATCH_END" || room.phase === "MATCH_OVER") && (
          <div className="my-auto w-full max-w-lg space-y-5 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#d4a24c]">
                Match Selesai
              </p>
              <h2 className="mt-1 font-display text-3xl text-[#f3dfb8]">
                {winner?.id === playerId
                  ? "Kamu Menang!"
                  : `${winner?.name ?? "Pasangan"} Menang!`}
              </h2>
              {room.customStake && (
                <p className="mt-1.5 text-xs text-[#d6dfd7]">
                  Taruhan: {room.customStake}
                </p>
              )}
            </div>

            {view.lastRoundSummary && (
              <div className="grid gap-3 text-left sm:grid-cols-2">
                {[me, opponent].map((p) => {
                  if (!p) return null;
                  const word = view.lastRoundSummary?.words[p.id] ?? "-";
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-white/12 bg-[#121915]/90 p-3.5"
                    >
                      <p className="text-xs text-[#9c9689]">Kata terakhir {p.name}</p>
                      <p className="font-mono-tabular mt-1 text-base font-bold text-[#ebe5d8]">
                        {word}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {me && (
                <button
                  onClick={() => onSetReady(!me.ready)}
                  className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${
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
                className="rounded-lg bg-[#d9483b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-35 cursor-pointer"
              >
                Mulai
              </button>
              <button
                onClick={onReturnToLobby}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs text-[#cfc8ba] hover:bg-white/8 cursor-pointer"
              >
                Lobi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel: Own Word + Opponent Progress + Reveal 1 Letter Control */}
      {view.phase === "GUESSING" && view.myWord && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#171815] px-4 py-3.5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#9c9689]">Kata milikmu:</span>
              <span className="font-mono-tabular flex flex-wrap items-center gap-0.5 font-semibold tracking-wider">
                {view.myWord.split("").map((ch, idx) => {
                  if (ch === " ") {
                    return <span key={idx} className="inline-block w-2" />;
                  }
                  const isOpenedForOpponent =
                    view.opponentProgress.revealedIndices.includes(idx);
                  const displayChar =
                    isOpenedForOpponent || showMyLockedWord ? ch : "•";
                  return (
                    <span
                      key={idx}
                      className={`inline-flex h-6 min-w-5 items-center justify-center rounded px-1 ${
                        isOpenedForOpponent
                          ? "border border-[#d4a24c]/50 bg-[#252318] text-[#f3dfb8]"
                          : "bg-white/5 text-[#ebe5d8]"
                      }`}
                      title={
                        isOpenedForOpponent
                          ? "Sudah terbuka untuk lawan"
                          : "Masih rahasia"
                      }
                    >
                      {displayChar}
                    </span>
                  );
                })}
              </span>
              <button
                type="button"
                onClick={() => setShowMyLockedWord((s) => !s)}
                className="text-[#d4a24c] hover:underline cursor-pointer"
              >
                {showMyLockedWord ? "Sembunyikan" : "Intip"}
              </button>
            </div>

            <div className="text-[#a9b5ab]">
              Progres {opponent?.name ?? "lawan"}:{" "}
              <span className="font-mono-tabular text-[#ebe5d8]">
                {view.opponentProgress.guessCount}x tebak
              </span>{" "}
              •{" "}
              <span className="font-mono-tabular text-[#d4a24c]">
                {view.myWordLettersRevealed}/{view.myWordLettersTotal} huruf terbuka
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAction({ type: "REVEAL_LETTER" })}
            disabled={!view.canRevealLetter}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#d4a24c]/45 bg-[#221f14] px-4 py-2.5 text-xs font-semibold text-[#f3dfb8] hover:bg-[#2d291a] disabled:cursor-not-allowed disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Lightbulb className="h-3.5 w-3.5 text-[#d4a24c]" />
            {view.canRevealLetter
              ? `Perlihatkan 1 Huruf ke ${opponent?.name ?? "Lawan"}`
              : "Semua Huruf Terbuka"}
          </button>
        </div>
      )}
    </div>
  );
}
