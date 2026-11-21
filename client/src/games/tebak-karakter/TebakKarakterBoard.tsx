import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import {
  Check,
  Crosshair,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  TEBAK_KARAKTER_BY_ID,
  TEBAK_KARAKTER_ROSTER,
  type TebakKarakterCharacter,
  type TebakKarakterView,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";
import { CharacterPortrait } from "./CharacterPortrait";

export function TebakKarakterBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as TebakKarakterView | null;

  const [draftSecretId, setDraftSecretId] = useState<string | null>(null);
  const [guessMode, setGuessMode] = useState(false);
  const [confirmGuessChar, setConfirmGuessChar] =
    useState<TebakKarakterCharacter | null>(null);
  const [hideMySecret, setHideMySecret] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftSecretId(null);
    setGuessMode(false);
    setConfirmGuessChar(null);
    setLocalError(null);
  }, [view?.roundNumber]);

  useEffect(() => {
    if (!lastEvents.length) return;
    for (const ev of lastEvents) {
      if (ev.type === "BOTH_CHARACTERS_READY" || ev.type === "ROUND_STARTED") {
        soundManager.play("reveal");
      } else if (ev.type === "GUESS_LOCKED") {
        soundManager.play("card");
      } else if (ev.type === "ROUND_RESOLVED") {
        const outcome = ev.payload?.outcome;
        const roundWinnerId = ev.payload?.winnerId;
        if (outcome === "DRAW_BOTH_WRONG") {
          soundManager.play("wrong");
        } else if (outcome === "DRAW_BOTH_CORRECT") {
          soundManager.play("reveal");
        } else if (roundWinnerId && roundWinnerId === playerId) {
          soundManager.play("win");
        } else {
          soundManager.play("wrong");
        }
      } else if (ev.type === "MATCH_WON") {
        soundManager.play("win");
      }
    }
  }, [lastEvents, playerId]);

  const me = room.players.find((p) => p.id === playerId) ?? null;
  const opponent = room.players.find((p) => p.id !== playerId) ?? null;

  const eliminatedSet = useMemo(
    () => new Set(view?.myEliminatedIds ?? []),
    [view?.myEliminatedIds]
  );

  const mySecretChar = view?.mySecretCharacterId
    ? TEBAK_KARAKTER_BY_ID.get(view.mySecretCharacterId) ?? null
    : null;

  const myGuessChar = view?.myGuessCharacterId
    ? TEBAK_KARAKTER_BY_ID.get(view.myGuessCharacterId) ?? null
    : null;

  const draftSecretChar = draftSecretId
    ? TEBAK_KARAKTER_BY_ID.get(draftSecretId) ?? null
    : null;

  if (!view) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-[#9c9689]">
        Memuat papan Tebak Karakter...
      </div>
    );
  }

  const myScore = (playerId ? view.scores[playerId] : 0) ?? 0;
  const opponentScore = (opponent ? view.scores[opponent.id] : 0) ?? 0;
  const winner = room.players.find((p) => p.id === view.winnerId) ?? null;
  const bothReady =
    room.players.length === 2 && room.players.every((p) => p.ready);

  const remainingForMe = TEBAK_KARAKTER_ROSTER.length - eliminatedSet.size;
  const canGuessNow = view.phase === "PLAYING" && !view.myGuessSubmitted;

  const handleConfirmSecret = () => {
    if (!draftSecretId) {
      setLocalError("Pilih satu karakter rahasia terlebih dahulu.");
      return;
    }
    setLocalError(null);
    soundManager.play("click");
    onAction({ type: "SELECT_CHARACTER", characterId: draftSecretId });
  };

  const handleCardClick = (character: TebakKarakterCharacter) => {
    if (view.phase === "SELECT_CHARACTER") {
      if (view.myCharacterSelected) return;
      soundManager.play("click");
      setDraftSecretId(character.id);
      setLocalError(null);
      return;
    }

    if (view.phase !== "PLAYING") return;

    if (guessMode && canGuessNow) {
      if (eliminatedSet.has(character.id)) return;
      soundManager.play("click");
      setConfirmGuessChar(character);
      return;
    }

    soundManager.play("click");
    onAction({ type: "TOGGLE_ELIMINATE", characterId: character.id });
  };

  const handleConfirmGuess = () => {
    if (!confirmGuessChar) return;
    soundManager.play("card");
    onAction({ type: "GUESS_CHARACTER", characterId: confirmGuessChar.id });
    setConfirmGuessChar(null);
    setGuessMode(false);
  };

  const renderRoundOutcomeTitle = () => {
    const summary = view.lastRoundSummary;
    if (!summary) return "";
    if (summary.outcome === "DRAW_BOTH_CORRECT") {
      return "Seri! Keduanya Benar";
    }
    if (summary.outcome === "DRAW_BOTH_WRONG") {
      return "Seri! Keduanya Salah";
    }
    return summary.winnerId === playerId
      ? "Kamu Menang Ronde Ini!"
      : `${opponent?.name ?? "Lawan"} Menang Ronde Ini!`;
  };

  const renderRoundOutcomeDesc = () => {
    const summary = view.lastRoundSummary;
    if (!summary) return "";
    if (summary.outcome === "DRAW_BOTH_CORRECT") {
      return "Kamu dan pasanganmu sama-sama menebak dengan tepat — tidak ada poin.";
    }
    if (summary.outcome === "DRAW_BOTH_WRONG") {
      return "Kedua tebakan meleset — tidak ada poin, lanjut ke ronde berikutnya.";
    }
    const roundWinner = room.players.find((p) => p.id === summary.winnerId);
    return `${roundWinner?.name ?? "Pemain"} menebak dengan benar sementara tebakan lawan meleset.`;
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-2.5 py-3 sm:gap-4 sm:px-5 sm:py-5">
      {/* Top Round & Score HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#171815]/95 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="rounded-md border border-[#d4a24c]/35 bg-[#221f14] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d4a24c] sm:px-2.5 sm:text-[11px]">
            Ronde {view.roundNumber} • Bo3
          </span>
          {view.phase === "PLAYING" && (
            <span className="hidden text-xs text-[#9c9689] sm:inline">
              Sisa papanmu:{" "}
              <strong className="font-mono-tabular text-[#ebe5d8]">
                {remainingForMe}/{TEBAK_KARAKTER_ROSTER.length}
              </strong>{" "}
              • Lawan:{" "}
              <strong className="font-mono-tabular text-[#d4a24c]">
                {view.opponentRemainingCount}/{TEBAK_KARAKTER_ROSTER.length}
              </strong>
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2.5 text-xs sm:gap-4">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <span className="max-w-[70px] truncate text-[#cfc8ba] sm:max-w-[140px]">
              {me?.name ?? "Kamu"}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {Array.from({ length: view.targetWins }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full border ${
                    idx < myScore
                      ? "border-[#d4a24c] bg-[#d4a24c]"
                      : "border-white/20 bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <span className="shrink-0 text-[#5e5c54]">vs</span>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="flex shrink-0 items-center gap-1">
              {Array.from({ length: view.targetWins }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2.5 w-2.5 rounded-full border ${
                    idx < opponentScore
                      ? "border-[#d9483b] bg-[#d9483b]"
                      : "border-white/20 bg-transparent"
                  }`}
                />
              ))}
            </div>
            <span className="max-w-[70px] truncate text-[#cfc8ba] sm:max-w-[140px]">
              {opponent?.name ?? "Lawan"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Felt Arena */}
      <div className="baize-felt flex flex-col gap-3.5 rounded-2xl p-3 sm:gap-5 sm:p-6">
        {/* PHASE 1: SELECT_CHARACTER */}
        {view.phase === "SELECT_CHARACTER" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#121915]/85 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a24c]">
                  Persiapan Ronde {view.roundNumber}
                </p>
                <h2 className="font-display mt-0.5 text-xl text-[#ebe5d8] sm:text-2xl">
                  {view.myCharacterSelected
                    ? `Karaktermu terkunci — menunggu ${opponent?.name ?? "lawan"}`
                    : "Pilih 1 karakter rahasia untuk ditebak lawan"}
                </h2>
                <p className="mt-1 text-xs text-[#a9b5ab]">
                  {view.opponentCharacterSelected
                    ? `${opponent?.name ?? "Lawan"} sudah memilih karakternya.`
                    : `${opponent?.name ?? "Lawan"} sedang memilih karakternya...`}
                </p>
              </div>

              {!view.myCharacterSelected ? (
                <button
                  type="button"
                  disabled={!draftSecretId}
                  onClick={handleConfirmSecret}
                  className="flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d4a24c] px-5 py-2.5 text-xs font-semibold text-[#111210] hover:bg-[#dfb263] disabled:cursor-not-allowed disabled:opacity-45 transition-colors cursor-pointer sm:w-auto"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {draftSecretId
                    ? `Kunci ${TEBAK_KARAKTER_BY_ID.get(draftSecretId)?.name ?? ""}`
                    : "Pilih Karakter Dulu"}
                </button>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-[#d4a24c]/35 bg-[#221f14]/80 px-3 py-2">
                  {mySecretChar && (
                    <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                      <CharacterPortrait character={mySecretChar} />
                    </div>
                  )}
                  <div className="text-xs">
                    <p className="text-[#9c9689]">Pilihanmu</p>
                    <p className="font-semibold text-[#f3dfb8]">
                      {mySecretChar?.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {localError && (
              <p className="text-center text-xs text-[#f5b4ae]">{localError}</p>
            )}

            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-3">
              {TEBAK_KARAKTER_ROSTER.map((char) => {
                const isSelected =
                  view.myCharacterSelected
                    ? view.mySecretCharacterId === char.id
                    : draftSecretId === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    disabled={view.myCharacterSelected}
                    onClick={() => handleCardClick(char)}
                    className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all sm:rounded-xl ${
                      isSelected
                        ? "border-[#d4a24c] bg-[#252318] ring-2 ring-[#d4a24c]/60 scale-[1.02]"
                        : "border-white/12 bg-[#121915]/90 hover:border-[#d4a24c]/50"
                    } ${
                      view.myCharacterSelected
                        ? "cursor-default"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      <CharacterPortrait character={char} />
                    </div>
                    <div className="flex items-center justify-between px-1.5 py-1 sm:px-2 sm:py-1.5">
                      <span className="truncate text-[11px] font-semibold text-[#ebe5d8] sm:text-xs">
                        {char.name}
                      </span>
                      {isSelected && (
                        <Check className="h-3 w-3 shrink-0 text-[#d4a24c] sm:h-3.5 sm:w-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {!view.myCharacterSelected && draftSecretChar && (
              <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 rounded-xl border border-[#d4a24c]/55 bg-[#191a15]/95 p-3 shadow-2xl backdrop-blur-md sm:hidden">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                    <CharacterPortrait character={draftSecretChar} />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-[#9c9689]">
                      Pilihanmu
                    </p>
                    <p className="truncate font-semibold text-[#f3dfb8]">
                      {draftSecretChar.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmSecret}
                  className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-lg bg-[#d4a24c] px-4 py-2 text-xs font-semibold text-[#111210] cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Kunci
                </button>
              </div>
            )}
          </div>
        )}

        {/* PHASE 2: PLAYING (Free Eliminations + Simultaneous Guess Lock) */}
        {view.phase === "PLAYING" && (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
              {/* My Secret Character Card */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d4a24c]/30 bg-[#121915]/90 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50 bg-[#1c231e]">
                    {hideMySecret || !mySecretChar ? (
                      <div className="card-back-pattern flex h-full w-full items-center justify-center text-[#ebe5d8]/75">
                        <Lock className="h-5 w-5" />
                      </div>
                    ) : (
                      <CharacterPortrait character={mySecretChar} />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#d4a24c]">
                      Karaktermu
                    </p>
                    <p className="font-display text-lg font-semibold text-[#ebe5d8]">
                      {hideMySecret ? "••••••" : mySecretChar?.name ?? "-"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHideMySecret((s) => !s)}
                  title={
                    hideMySecret
                      ? "Tampilkan karaktermu"
                      : "Sembunyikan karaktermu"
                  }
                  className="rounded-lg border border-white/12 bg-white/5 p-2 text-[#cfc8ba] hover:bg-white/10 cursor-pointer"
                >
                  {hideMySecret ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Simultaneous Guess Control Bar */}
              <div
                className={`rounded-xl border p-3.5 sm:p-4 ${
                  view.opponentGuessSubmitted && !view.myGuessSubmitted
                    ? "border-[#d4a24c]/65 bg-[#221f14]/90"
                    : "border-white/12 bg-[#121915]/90"
                }`}
              >
                {view.myGuessSubmitted ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {myGuessChar && (
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                          <CharacterPortrait character={myGuessChar} />
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a24c]">
                          Tebakanmu Terkunci: {myGuessChar?.name ?? "-"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#cfc8ba]">
                          Menunggu {opponent?.name ?? "lawan"} mengunci
                          tebakannya untuk membuka hasil...
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {view.opponentGuessSubmitted ? (
                          <p className="text-xs font-semibold text-[#f3dfb8]">
                            {opponent?.name ?? "Lawan"} sudah mengunci
                            tebakannya! Sekarang giliran kamu mengunci tebakan.
                          </p>
                        ) : (
                          <p className="text-xs text-[#cfc8ba]">
                            Tanya-jawab bebas lewat WhatsApp/obrolan, eliminasi
                            kartu di papan, lalu kunci tebakan bersama.
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.play("click");
                          setGuessMode((g) => !g);
                          setConfirmGuessChar(null);
                        }}
                        className={`flex min-h-[42px] w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer sm:w-auto ${
                          guessMode
                            ? "border-[#d9483b] bg-[#d9483b]/20 text-[#f5b4ae]"
                            : "border-[#d4a24c]/50 bg-[#d4a24c] text-[#111210] hover:bg-[#dfb263]"
                        }`}
                      >
                        {guessMode ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Batal Mode Tebak
                          </>
                        ) : (
                          <>
                            <Crosshair className="h-3.5 w-3.5" />
                            Kunci Tebakan
                          </>
                        )}
                      </button>
                    </div>

                    {guessMode && !confirmGuessChar && (
                      <div className="rounded-lg border border-[#d4a24c]/40 bg-[#1a1913]/90 px-3 py-2.5 text-xs text-[#f3dfb8]">
                        <span>
                          Klik salah satu karakter aktif di papan untuk
                          mengunci tebakanmu.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 20-Character Board */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-[#a9b5ab]">
                <span>
                  {guessMode && canGuessNow
                    ? "Mode Tebak aktif: klik karakter yang kamu yakini."
                    : "Klik kartu untuk eliminasi / pulihkan catatanmu."}
                </span>
                <span className="font-mono-tabular shrink-0">
                  Kamu {remainingForMe}/{TEBAK_KARAKTER_ROSTER.length} • Lawan{" "}
                  <strong className="text-[#d4a24c]">
                    {view.opponentRemainingCount}/{TEBAK_KARAKTER_ROSTER.length}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-3">
                {TEBAK_KARAKTER_ROSTER.map((char) => {
                  const isEliminated = eliminatedSet.has(char.id);
                  const isConfirming = confirmGuessChar?.id === char.id;
                  const canClickInGuessMode =
                    !(guessMode && canGuessNow) || !isEliminated;

                  return (
                    <m.button
                      key={char.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      disabled={!canClickInGuessMode}
                      onClick={() => handleCardClick(char)}
                      className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all sm:rounded-xl ${
                        isConfirming
                          ? "border-[#d4a24c] bg-[#2a2414] ring-2 ring-[#d4a24c]"
                          : isEliminated
                            ? "border-white/8 bg-[#0e1411]/80 opacity-35 grayscale"
                            : guessMode && canGuessNow
                              ? "border-[#d4a24c]/55 bg-[#121915] hover:border-[#d4a24c] hover:ring-2 hover:ring-[#d4a24c]/60"
                              : "border-white/12 bg-[#121915]/95 hover:border-[#d4a24c]/55"
                      } ${
                        canClickInGuessMode
                          ? "cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden">
                        <CharacterPortrait character={char} />
                        {isEliminated && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                            <X className="h-7 w-7 text-[#ebe5d8]/75 sm:h-8 sm:w-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-1.5 py-1 sm:px-2 sm:py-1.5">
                        <span
                          className={`truncate text-[11px] font-semibold sm:text-xs ${
                            isEliminated
                              ? "text-[#8a998d] line-through"
                              : "text-[#ebe5d8]"
                          }`}
                        >
                          {char.name}
                        </span>
                      </div>
                    </m.button>
                  );
                })}
              </div>

              {guessMode && canGuessNow && confirmGuessChar && (
                <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-xl border border-[#d4a24c]/65 bg-[#1a1913]/95 p-3.5 text-xs text-[#f3dfb8] shadow-2xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                      <CharacterPortrait character={confirmGuessChar} />
                    </div>
                    <span>
                      Kunci tebakanmu ke{" "}
                      <strong className="text-white">
                        {confirmGuessChar.name}
                      </strong>
                      ? Hasil terbuka setelah keduanya menebak.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                    <button
                      type="button"
                      onClick={() => setConfirmGuessChar(null)}
                      className="min-h-[42px] rounded-lg border border-white/15 px-3 py-2 text-[#cfc8ba] hover:bg-white/10 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmGuess}
                      className="min-h-[42px] rounded-lg bg-[#d4a24c] px-4 py-2 font-semibold text-[#111210] hover:bg-[#dfb263] cursor-pointer"
                    >
                      Ya, Kunci!
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 3: ROUND_END */}
        {view.phase === "ROUND_END" && view.lastRoundSummary && (
          <div className="mx-auto my-4 w-full max-w-2xl space-y-5 text-center">
            <div>
              <p className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-[#d4a24c]">
                <Sparkles className="h-3.5 w-3.5" />
                Ronde {view.lastRoundSummary.roundNumber} Selesai
              </p>
              <h2 className="mt-1 font-display text-2xl text-[#f3dfb8] sm:text-3xl">
                {renderRoundOutcomeTitle()}
              </h2>
              <p className="mt-1 text-xs text-[#a9b5ab]">
                {renderRoundOutcomeDesc()}
              </p>
            </div>

            <div className="grid gap-3 text-left sm:grid-cols-2">
              {[me, opponent].map((p) => {
                if (!p) return null;
                const other = p.id === me?.id ? opponent : me;
                const secretId = view.lastRoundSummary?.secretCharacters[p.id];
                const secretChar = secretId
                  ? TEBAK_KARAKTER_BY_ID.get(secretId)
                  : null;
                const guessId = view.lastRoundSummary?.guesses[p.id];
                const guessChar = guessId
                  ? TEBAK_KARAKTER_BY_ID.get(guessId)
                  : null;
                const targetSecretId = other
                  ? view.lastRoundSummary?.secretCharacters[other.id]
                  : null;
                const guessedCorrectly = Boolean(
                  guessId && targetSecretId && guessId === targetSecretId
                );

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-[#121915]/90 p-3.5"
                  >
                    {secretChar && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                        <CharacterPortrait character={secretChar} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-[#9c9689]">
                        Karakter rahasia {p.name}
                      </p>
                      <p className="font-display text-lg font-bold text-[#ebe5d8]">
                        {secretChar?.name ?? "-"}
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-medium ${
                          guessedCorrectly
                            ? "text-emerald-300"
                            : "text-[#f5b4ae]"
                        }`}
                      >
                        Tebakan {p.name}: {guessChar?.name ?? "-"}{" "}
                        {guessedCorrectly ? "✓" : "✗"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const iAmReady = Boolean(
                playerId && view.readyForNextRound[playerId]
              );
              const readyCount = Object.values(view.readyForNextRound).filter(
                Boolean
              ).length;
              return (
                <button
                  type="button"
                  disabled={iAmReady}
                  onClick={() => onAction({ type: "NEXT_ROUND" })}
                  className="min-h-[44px] w-full rounded-xl bg-[#d4a24c] px-6 py-2.5 text-sm font-semibold text-[#111210] hover:bg-[#dfb263] disabled:cursor-default disabled:opacity-65 transition-colors cursor-pointer sm:w-auto"
                >
                  {iAmReady
                    ? `Menunggu ${opponent?.name ?? "lawan"}... (${readyCount}/2)`
                    : `Lanjut Ronde Berikutnya (${readyCount}/2)`}
                </button>
              );
            })()}
          </div>
        )}

        {/* PHASE 4: MATCH_END / MATCH_OVER */}
        {(view.phase === "MATCH_END" || room.phase === "MATCH_OVER") && (
          <div className="mx-auto my-4 w-full max-w-2xl space-y-5 text-center">
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
                  const other = p.id === me?.id ? opponent : me;
                  const secretId =
                    view.lastRoundSummary?.secretCharacters[p.id];
                  const secretChar = secretId
                    ? TEBAK_KARAKTER_BY_ID.get(secretId)
                    : null;
                  const guessId = view.lastRoundSummary?.guesses[p.id];
                  const guessChar = guessId
                    ? TEBAK_KARAKTER_BY_ID.get(guessId)
                    : null;
                  const targetSecretId = other
                    ? view.lastRoundSummary?.secretCharacters[other.id]
                    : null;
                  const guessedCorrectly = Boolean(
                    guessId && targetSecretId && guessId === targetSecretId
                  );

                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-white/12 bg-[#121915]/90 p-3.5"
                    >
                      {secretChar && (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                          <CharacterPortrait character={secretChar} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-[#9c9689]">
                          Karakter terakhir {p.name}
                        </p>
                        <p className="font-display text-lg font-bold text-[#ebe5d8]">
                          {secretChar?.name ?? "-"}
                        </p>
                        <p
                          className={`mt-0.5 text-xs font-medium ${
                            guessedCorrectly
                              ? "text-emerald-300"
                              : "text-[#f5b4ae]"
                          }`}
                        >
                          Tebakan {p.name}: {guessChar?.name ?? "-"}{" "}
                          {guessedCorrectly ? "✓" : "✗"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
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
        )}
      </div>
    </div>
  );
}
