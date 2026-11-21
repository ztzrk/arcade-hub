import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Crosshair,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  MessageSquareText,
  RotateCcw,
  Send,
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

const QUICK_QUESTION_IDEAS = [
  "Pakai kacamata?",
  "Pakai topi atau penutup kepala?",
  "Punya kumis atau jenggot?",
  "Rambutnya panjang?",
  "Pakai anting?",
];

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
  const [questionDraft, setQuestionDraft] = useState("");
  const [guessMode, setGuessMode] = useState(false);
  const [confirmGuessChar, setConfirmGuessChar] =
    useState<TebakKarakterCharacter | null>(null);
  const [hideMySecret, setHideMySecret] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDraftSecretId(null);
    setQuestionDraft("");
    setGuessMode(false);
    setConfirmGuessChar(null);
    setLocalError(null);
  }, [view?.roundNumber]);

  useEffect(() => {
    if (!lastEvents.length) return;
    for (const ev of lastEvents) {
      if (ev.type === "BOTH_CHARACTERS_READY" || ev.type === "ROUND_STARTED") {
        soundManager.play("reveal");
      } else if (ev.type === "QUESTION_ASKED" || ev.type === "QUESTION_ANSWERED") {
        soundManager.play("card");
      } else if (ev.type === "GUESS_WRONG") {
        soundManager.play("wrong");
      } else if (
        ev.type === "GUESS_CORRECT" ||
        ev.type === "ROUND_WON" ||
        ev.type === "MATCH_WON"
      ) {
        soundManager.play("win");
      }
    }
  }, [lastEvents]);

  const me = room.players.find((p) => p.id === playerId) ?? null;
  const opponent = room.players.find((p) => p.id !== playerId) ?? null;

  const eliminatedSet = useMemo(
    () => new Set(view?.myEliminatedIds ?? []),
    [view?.myEliminatedIds]
  );

  const mySecretChar = view?.mySecretCharacterId
    ? TEBAK_KARAKTER_BY_ID.get(view.mySecretCharacterId) ?? null
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

  const isMyTurn = Boolean(playerId && view.currentTurnPlayerId === playerId);
  const canAskOrGuess =
    view.phase === "PLAYING" && isMyTurn && view.turnStage === "ASK_OR_GUESS";
  const isWaitingMyAnswer =
    view.phase === "PLAYING" &&
    view.turnStage === "ANSWER_QUESTION" &&
    Boolean(view.pendingQuestion && view.pendingQuestion.askerId !== playerId);
  const isWaitingOpponentAnswer =
    view.phase === "PLAYING" &&
    view.turnStage === "ANSWER_QUESTION" &&
    Boolean(view.pendingQuestion && view.pendingQuestion.askerId === playerId);

  const remainingForMe = TEBAK_KARAKTER_ROSTER.length - eliminatedSet.size;

  const handleConfirmSecret = () => {
    if (!draftSecretId) {
      setLocalError("Pilih satu karakter rahasia terlebih dahulu.");
      return;
    }
    setLocalError(null);
    soundManager.play("click");
    onAction({ type: "SELECT_CHARACTER", characterId: draftSecretId });
  };

  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = questionDraft.trim().replace(/\s+/g, " ");
    if (clean.length < 2) {
      setLocalError("Pertanyaan minimal 2 karakter.");
      return;
    }
    setLocalError(null);
    setGuessMode(false);
    setConfirmGuessChar(null);
    soundManager.play("click");
    onAction({ type: "ASK_QUESTION", question: clean });
    setQuestionDraft("");
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

    if (guessMode && canAskOrGuess) {
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5">
      {/* Top Round & Score HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#171815]/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-[#d4a24c]/35 bg-[#221f14] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#d4a24c]">
            Ronde {view.roundNumber} • Best of 3
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

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#cfc8ba]">{me?.name ?? "Kamu"}</span>
            <div className="flex items-center gap-1">
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

          <span className="text-[#5e5c54]">vs</span>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
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
            <span className="text-[#cfc8ba]">{opponent?.name ?? "Lawan"}</span>
          </div>
        </div>
      </div>

      {/* Main Felt Arena */}
      <div className="baize-felt flex flex-col gap-5 rounded-2xl p-4 sm:p-6">
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
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d4a24c] px-5 py-2.5 text-xs font-semibold text-[#111210] hover:bg-[#dfb263] disabled:cursor-not-allowed disabled:opacity-45 transition-colors cursor-pointer"
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

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
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
                    className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
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
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="truncate text-xs font-semibold text-[#ebe5d8]">
                        {char.name}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#d4a24c]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE 2: PLAYING */}
        {view.phase === "PLAYING" && (
          <div className="space-y-4">
            {/* Secret Character + Turn Prompt Row */}
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
                  title={hideMySecret ? "Tampilkan karaktermu" : "Sembunyikan karaktermu"}
                  className="rounded-lg border border-white/12 bg-white/5 p-2 text-[#cfc8ba] hover:bg-white/10 cursor-pointer"
                >
                  {hideMySecret ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Action / Turn Panel */}
              <div className="rounded-xl border border-white/12 bg-[#121915]/90 p-3.5 sm:p-4">
                {isWaitingMyAnswer && view.pendingQuestion && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#d4a24c]">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {opponent?.name ?? "Lawan"} bertanya padamu:
                      </p>
                      <p className="font-display text-lg text-[#f3dfb8]">
                        &ldquo;{view.pendingQuestion.question}&rdquo;
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.play("click");
                          onAction({ type: "ANSWER_QUESTION", answer: "YES" });
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        YA
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.play("click");
                          onAction({ type: "ANSWER_QUESTION", answer: "NO" });
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-[#d9483b] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#e55a4d] transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        TIDAK
                      </button>
                    </div>
                  </div>
                )}

                {isWaitingOpponentAnswer && view.pendingQuestion && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4a24c]">
                      Menunggu jawaban {opponent?.name ?? "lawan"}...
                    </p>
                    <p className="text-sm text-[#ebe5d8]">
                      Pertanyaanmu: &ldquo;{view.pendingQuestion.question}&rdquo;
                    </p>
                  </div>
                )}

                {canAskOrGuess && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-emerald-300">
                        Giliranmu! Ajukan pertanyaan atau langsung tebak.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.play("click");
                          setGuessMode((g) => !g);
                          setConfirmGuessChar(null);
                          setLocalError(null);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          guessMode
                            ? "border-[#d9483b] bg-[#d9483b]/20 text-[#f5b4ae]"
                            : "border-[#d4a24c]/45 bg-[#221f14] text-[#f3dfb8] hover:bg-[#2d291a]"
                        }`}
                      >
                        {guessMode ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" />
                            Batal Mode Tebak
                          </>
                        ) : (
                          <>
                            <Crosshair className="h-3.5 w-3.5 text-[#d4a24c]" />
                            Tebak Karakter
                          </>
                        )}
                      </button>
                    </div>

                    {guessMode ? (
                      <div className="rounded-lg border border-[#d9483b]/40 bg-[#2a1514]/80 px-3 py-2.5 text-xs text-[#f5b4ae]">
                        {confirmGuessChar ? (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              Yakin tebak{" "}
                              <strong className="text-[#ebe5d8]">
                                {confirmGuessChar.name}
                              </strong>
                              ? Salah tebak langsung kalah ronde ini!
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleConfirmGuess}
                                className="rounded-lg bg-[#d9483b] px-3 py-1.5 font-semibold text-white hover:bg-[#e55a4d] cursor-pointer"
                              >
                                Ya, Tebak!
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmGuessChar(null)}
                                className="rounded-lg border border-white/15 px-3 py-1.5 text-[#cfc8ba] hover:bg-white/10 cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span>
                            Klik kartu karakter aktif di papan untuk menebak.
                            Hati-hati: <strong>salah tebak = kalah ronde ini!</strong>
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <form onSubmit={handleSubmitQuestion} className="flex gap-2">
                          <input
                            type="text"
                            maxLength={100}
                            value={questionDraft}
                            onChange={(e) => {
                              setQuestionDraft(e.target.value);
                              setLocalError(null);
                            }}
                            placeholder="Ketik pertanyaan Ya/Tidak (cth: Pakai kacamata?)"
                            className="w-full rounded-lg border border-white/15 bg-[#0e1411] px-3 py-2 text-xs text-[#ebe5d8] placeholder:text-[#6f7b72] focus:border-[#d4a24c] focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#d4a24c] px-4 py-2 text-xs font-semibold text-[#111210] hover:bg-[#dfb263] transition-colors cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Tanya
                          </button>
                        </form>
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_QUESTION_IDEAS.map((idea) => (
                            <button
                              key={idea}
                              type="button"
                              onClick={() => setQuestionDraft(idea)}
                              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-[#a9b5ab] hover:border-[#d4a24c]/40 hover:text-[#f3dfb8] transition-colors cursor-pointer"
                            >
                              {idea}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {localError && (
                      <p className="text-xs text-[#f5b4ae]">{localError}</p>
                    )}
                  </div>
                )}

                {!isMyTurn && !isWaitingMyAnswer && !isWaitingOpponentAnswer && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9c9689]">
                      Giliran {opponent?.name ?? "lawan"}
                    </p>
                    <p className="text-xs text-[#cfc8ba]">
                      {opponent?.name ?? "Lawan"} sedang menyusun pertanyaan atau
                      bersiap menebak. Kamu tetap bisa membalik kartu di papanmu.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 20-Character Board */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[#a9b5ab]">
                <span>
                  {guessMode && canAskOrGuess
                    ? "Mode Tebak aktif: klik kartu karakter pilihanmu."
                    : "Klik kartu untuk eliminasi / pulihkan catatanmu."}
                </span>
                <span className="font-mono-tabular">
                  {remainingForMe} aktif • {eliminatedSet.size} tersisih
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
                {TEBAK_KARAKTER_ROSTER.map((char) => {
                  const isEliminated = eliminatedSet.has(char.id);
                  const isConfirming = confirmGuessChar?.id === char.id;
                  const canClickInGuessMode =
                    !(guessMode && canAskOrGuess) || !isEliminated;

                  return (
                    <motion.button
                      key={char.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      disabled={!canClickInGuessMode}
                      onClick={() => handleCardClick(char)}
                      className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                        isConfirming
                          ? "border-[#d9483b] bg-[#2a1514] ring-2 ring-[#d9483b]"
                          : isEliminated
                            ? "border-white/8 bg-[#0e1411]/80 opacity-35 grayscale"
                            : guessMode && canAskOrGuess
                              ? "border-[#d4a24c]/55 bg-[#121915] hover:border-[#d9483b] hover:ring-2 hover:ring-[#d9483b]/60"
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
                            <X className="h-8 w-8 text-[#ebe5d8]/75" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span
                          className={`truncate text-xs font-semibold ${
                            isEliminated
                              ? "text-[#8a998d] line-through"
                              : "text-[#ebe5d8]"
                          }`}
                        >
                          {char.name}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Q&A History Feed */}
            <div className="rounded-xl border border-white/10 bg-[#121915]/85 p-3.5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-[#cfc8ba]">
                  <MessageSquareText className="h-3.5 w-3.5 text-[#d4a24c]" />
                  Riwayat Tanya-Jawab ({view.qaHistory.length})
                </span>
              </div>
              {view.qaHistory.length === 0 ? (
                <p className="text-xs text-[#7e8a81]">
                  Belum ada pertanyaan di ronde ini.
                </p>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {[...view.qaHistory].reverse().map((qa) => {
                    const asker = room.players.find((p) => p.id === qa.askerId);
                    const isYes = qa.answer === "YES";
                    return (
                      <div
                        key={qa.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-[#171f1b]/90 px-3 py-1.5 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-[#d4a24c]">
                            {asker?.name ?? "Pemain"}:
                          </span>{" "}
                          <span className="text-[#ebe5d8]">{qa.question}</span>
                        </div>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isYes
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-[#d9483b]/20 text-[#f5b4ae]"
                          }`}
                        >
                          {isYes ? "YA" : "TIDAK"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 3: ROUND_END */}
        {view.phase === "ROUND_END" && view.lastRoundSummary && (
          <div className="mx-auto my-4 w-full max-w-xl space-y-5 text-center">
            <div>
              <p className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-[#d4a24c]">
                <Sparkles className="h-3.5 w-3.5" />
                Ronde {view.lastRoundSummary.roundNumber} Selesai
              </p>
              <h2 className="mt-1 font-display text-2xl text-[#f3dfb8] sm:text-3xl">
                {view.lastRoundSummary.winnerId === playerId
                  ? "Kamu Menang Ronde Ini!"
                  : `${opponent?.name ?? "Lawan"} Menang Ronde Ini!`}
              </h2>
              <p className="mt-1 text-xs text-[#a9b5ab]">
                {(() => {
                  const guesser = room.players.find(
                    (p) => p.id === view.lastRoundSummary?.guesserId
                  );
                  const guessed = TEBAK_KARAKTER_BY_ID.get(
                    view.lastRoundSummary.guessedCharacterId
                  );
                  return view.lastRoundSummary.reason === "CORRECT_GUESS"
                    ? `${guesser?.name ?? "Pemain"} berhasil menebak ${guessed?.name ?? ""} dengan tepat (${view.lastRoundSummary.questionCount} pertanyaan).`
                    : `${guesser?.name ?? "Pemain"} menebak ${guessed?.name ?? ""} — salah! Poin otomatis untuk lawan.`;
                })()}
              </p>
            </div>

            <div className="grid gap-3 text-left sm:grid-cols-2">
              {[me, opponent].map((p) => {
                if (!p) return null;
                const charId = view.lastRoundSummary?.secretCharacters[p.id];
                const char = charId ? TEBAK_KARAKTER_BY_ID.get(charId) : null;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-[#121915]/90 p-3.5"
                  >
                    {char && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                        <CharacterPortrait character={char} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-[#9c9689]">
                        Karakter rahasia {p.name}
                      </p>
                      <p className="font-display text-lg font-bold text-[#ebe5d8]">
                        {char?.name ?? "-"}
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

        {/* PHASE 4: MATCH_END / MATCH_OVER */}
        {(view.phase === "MATCH_END" || room.phase === "MATCH_OVER") && (
          <div className="mx-auto my-4 w-full max-w-lg space-y-5 text-center">
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
              {view.lastRoundSummary && (
                <p className="mt-1 text-xs text-[#a9b5ab]">
                  {(() => {
                    const guesser = room.players.find(
                      (p) => p.id === view.lastRoundSummary?.guesserId
                    );
                    const guessed = TEBAK_KARAKTER_BY_ID.get(
                      view.lastRoundSummary.guessedCharacterId
                    );
                    return view.lastRoundSummary.reason === "CORRECT_GUESS"
                      ? `Ronde penentuan dimenangkan oleh tebakan tepat ${guesser?.name ?? ""} (${guessed?.name ?? ""}).`
                      : `${guesser?.name ?? ""} salah menebak ${guessed?.name ?? ""} di ronde penentuan.`;
                  })()}
                </p>
              )}
            </div>

            {view.lastRoundSummary && (
              <div className="grid gap-3 text-left sm:grid-cols-2">
                {[me, opponent].map((p) => {
                  if (!p) return null;
                  const charId = view.lastRoundSummary?.secretCharacters[p.id];
                  const char = charId
                    ? TEBAK_KARAKTER_BY_ID.get(charId)
                    : null;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-white/12 bg-[#121915]/90 p-3.5"
                    >
                      {char && (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#d4a24c]/50">
                          <CharacterPortrait character={char} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-[#9c9689]">
                          Karakter terakhir {p.name}
                        </p>
                        <p className="font-display text-lg font-bold text-[#ebe5d8]">
                          {char?.name ?? "-"}
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
    </div>
  );
}
