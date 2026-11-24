import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import {
  AlertTriangle,
  Flame,
  HelpCircle,
  Layers,
  Siren,
  Sparkles,
  X,
} from "lucide-react";
import {
  UNO_COLORS,
  UNO_COLOR_META,
  type PublicPlayer,
  type UnoCard,
  type UnoColor,
  type UnoRoundEndReason,
  type UnoView,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";
import { UnoCardView } from "./UnoCardView";

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

function getRoundReasonText(
  reason: UnoRoundEndReason,
  winnerName: string,
  loserName: string,
  loserCount: number
): string {
  if (reason === "MERCY_KO") {
    return `${loserName} terkena Mercy KO (${loserCount} kartu)! ${winnerName} menang ronde!`;
  }
  return `${winnerName} menghabiskan semua kartunya!`;
}

function PlayerUnoBadge({
  player,
  isMe,
  isTurn,
  cardCount,
  mercyLimit,
  wins,
  targetWins,
  unoCalled,
}: {
  player: PublicPlayer | undefined;
  isMe: boolean;
  isTurn: boolean;
  cardCount: number;
  mercyLimit: number;
  wins: number;
  targetWins: number;
  unoCalled: boolean;
}) {
  const danger = cardCount >= mercyLimit - 3;
  const warning = cardCount >= mercyLimit - 5 && !danger;

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl border px-3 py-2 transition-colors ${
        isTurn
          ? "border-[#d4a24c]/70 bg-[#1b241d] shadow-[0_0_18px_rgba(212,162,76,0.12)]"
          : "border-white/10 bg-[#141815]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-[#ebe5d8] sm:text-sm">
          {player?.name ?? "Pemain"}
          {isMe && (
            <span className="ml-1 text-[11px] font-normal text-[#9c9689]">
              (kamu)
            </span>
          )}
        </span>
        <WinPips wins={wins} target={targetWins} />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span
          className={`font-mono-tabular inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${
            danger
              ? "bg-rose-500/20 text-rose-300 animate-pulse"
              : warning
                ? "bg-amber-500/20 text-amber-200"
                : "bg-white/6 text-[#cfc8ba]"
          }`}
        >
          {danger && <AlertTriangle className="h-3 w-3" />}
          {cardCount}/{mercyLimit} kartu
        </span>

        <div className="flex items-center gap-1.5">
          {cardCount === 1 && unoCalled && (
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
              UNO!
            </span>
          )}
          {isTurn && (
            <span className="text-[10px] font-semibold text-[#d4a24c]">
              ● Giliran
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive 1v1 UNO: No Mercy table with stacking, Mercy KO meter,
 * real-time UNO/Catch buttons, and Wild color picker.
 */
export function UnoNoMercyBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as UnoView | null;
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    for (const ev of lastEvents) {
      if (ev.type === "CARD_PLAYED" || ev.type === "CARD_DRAWN") {
        soundManager.play("card");
      }
      if (ev.type === "SWAP_HANDS" || ev.type === "UNO_CALLED") {
        soundManager.play("reveal");
      }
      if (
        ev.type === "HEAVY_STACK" ||
        ev.type === "PENALTY_DRAWN" ||
        ev.type === "UNO_CAUGHT"
      ) {
        soundManager.play("spike");
      }
      if (ev.type === "ROUND_KO") {
        soundManager.play("bang");
      }
      if (ev.type === "ROUND_WON") {
        soundManager.play("win");
      }
    }
  }, [lastEvents]);

  useEffect(() => {
    setPendingWildCard(null);
  }, [view?.currentTurnPlayerId, view?.roundNumber, view?.phase]);

  const playableSet = useMemo(
    () => new Set(view?.playableCardIds ?? []),
    [view?.playableCardIds]
  );

  if (!view) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#9c9689]">
        Menyiapkan meja UNO: No Mercy...
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
  const roundWinner = view.lastRoundSummary
    ? room.players.find((p) => p.id === view.lastRoundSummary?.winnerId)
    : null;
  const roundLoser = view.lastRoundSummary
    ? room.players.find((p) => p.id === view.lastRoundSummary?.loserId)
    : null;

  const activeColorMeta = UNO_COLOR_META[view.activeColor];
  const lastActor = view.lastAction
    ? room.players.find((p) => p.id === view.lastAction?.playerId)
    : null;

  const handleCardClick = (card: UnoCard) => {
    if (!isMyTurn || !playableSet.has(card.id)) return;
    if (card.color === "WILD") {
      setPendingWildCard((prev) => (prev?.id === card.id ? null : card));
      return;
    }
    onAction({ type: "PLAY_CARD", cardId: card.id });
  };

  const handlePickWildColor = (color: UnoColor) => {
    if (!pendingWildCard || !isMyTurn) return;
    onAction({
      type: "PLAY_CARD",
      cardId: pendingWildCard.id,
      chosenColor: color,
    });
    setPendingWildCard(null);
  };

  const visibleOppBacks = Math.min(8, view.opponentCardCount);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-2.5 py-3 sm:gap-4 sm:px-4 sm:py-5">
      {/* Player Strip */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PlayerUnoBadge
          player={me}
          isMe
          isTurn={view.phase === "PLAYING" && view.currentTurnPlayerId === me?.id}
          cardCount={view.myHand.length}
          mercyLimit={view.mercyLimit}
          wins={me ? (view.scores[me.id] ?? 0) : 0}
          targetWins={view.targetWins}
          unoCalled={me ? Boolean(view.unoCalled[me.id]) : false}
        />
        <PlayerUnoBadge
          player={opponent}
          isMe={false}
          isTurn={
            view.phase === "PLAYING" && view.currentTurnPlayerId === opponent?.id
          }
          cardCount={view.opponentCardCount}
          mercyLimit={view.mercyLimit}
          wins={opponent ? (view.scores[opponent.id] ?? 0) : 0}
          targetWins={view.targetWins}
          unoCalled={opponent ? Boolean(view.unoCalled[opponent.id]) : false}
        />
      </div>

      {/* Main Felt Arena */}
      <div className="baize-felt relative flex flex-col gap-3.5 rounded-2xl p-3 sm:gap-4 sm:p-5">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#a9b5ab]">
          <span className="font-mono-tabular">
            Ronde {view.roundNumber} • Deck {view.deckCount}
          </span>
          <button
            type="button"
            onClick={() => setShowRules((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-white/12 bg-[#121a15] px-2.5 py-1 text-[11px] text-[#cfc8ba] hover:border-[#d4a24c]/50 hover:text-[#f3dfb8] transition-colors cursor-pointer"
          >
            <HelpCircle className="h-3.5 w-3.5 text-[#d4a24c]" />
            {showRules ? "Tutup Aturan" : "Aturan No Mercy"}
          </button>
        </div>

        {showRules && (
          <div className="rounded-xl border border-[#d4a24c]/30 bg-[#111813]/95 p-3 text-[11px] leading-relaxed text-[#a9b5ab] space-y-1">
            <div className="font-semibold text-[#f3dfb8]">
              Aturan UNO: No Mercy (1v1 Best of 3):
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>
                <strong className="text-[#ebe5d8]">Stacking Hukuman:</strong> Kartu{" "}
                <span className="text-amber-300">+2, +4, +6, +10</span> bisa ditumpuk dengan kartu bernilai sama atau lebih tinggi!
              </li>
              <li>
                <strong className="text-[#ebe5d8]">Mercy Rule (KO):</strong> Memegang{" "}
                <span className="text-rose-300">20 kartu atau lebih</span> langsung kalah ronde!
              </li>
              <li>
                <strong className="text-[#ebe5d8]">Kartu 0 = Tukar Tangan:</strong> Keluarkan angka 0 untuk menukar seluruh kartumu dengan lawan.
              </li>
              <li>
                <strong className="text-[#ebe5d8]">Buang Semua 💥:</strong> Membuang semua kartu berwarna sama sekaligus.
              </li>
              <li>
                <strong className="text-[#ebe5d8]">Skip &amp; Reverse:</strong> Di 1v1 keduanya membuatmu langsung jalan lagi!
              </li>
              <li>
                <strong className="text-[#ebe5d8]">Ambil Sepuasnya &amp; Wajib Main:</strong> Saat giliranmu, kamu bebas mengambil kartu dari deck sepuasnya — namun wajib mengeluarkan kartu untuk mengakhiri giliran (hati-hati batas KO 20!).
              </li>
              <li>
                <strong className="text-[#ebe5d8]">UNO! &amp; Tangkap!:</strong> Tekan UNO saat sisa 1–2 kartu, atau tangkap lawan yang lupa untuk +2 kartu penalti.
              </li>
            </ul>
          </div>
        )}

        {/* Opponent Hand Fan + Catch UNO Alert */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-[#101813]/65 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-3">
              {Array.from({ length: visibleOppBacks }).map((_, idx) => (
                <div
                  key={idx}
                  className="card-back-pattern h-9 w-6 rounded border border-white/25 shadow-sm"
                />
              ))}
              {view.opponentCardCount === 0 && (
                <span className="text-xs text-[#9c9689]">0 kartu</span>
              )}
            </div>
            {view.opponentCardCount > visibleOppBacks && (
              <span className="font-mono-tabular text-[11px] text-[#9c9689]">
                +{view.opponentCardCount - visibleOppBacks}
              </span>
            )}
          </div>

          {view.canCatchOpponent && (
            <button
              type="button"
              onClick={() => onAction({ type: "CATCH_UNO" })}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-[#d9483b] px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_18px_rgba(217,72,59,0.6)] hover:bg-[#e55548] active:scale-95 animate-bounce cursor-pointer"
            >
              <Siren className="h-3.5 w-3.5" />
              TANGKAP! (+2)
            </button>
          )}
        </div>

        {/* Center Piles & Pending Stack */}
        <div className="flex flex-col items-center gap-3 py-1">
          {/* Active Stack Warning */}
          {view.pendingDraw > 0 && (
            <m.div
              key={`stack-${view.pendingDraw}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-wrap items-center justify-center gap-2.5 rounded-xl border border-rose-400/60 bg-rose-950/80 px-3.5 py-2 text-xs text-rose-100 shadow-lg"
            >
              <span className="inline-flex items-center gap-1.5 font-bold text-rose-200">
                <Flame className="h-4 w-4 text-rose-400" />
                TUMPUKAN +{view.pendingDraw}!
              </span>
              {isMyTurn ? (
                <button
                  type="button"
                  onClick={() => onAction({ type: "ACCEPT_DRAW" })}
                  className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 active:scale-95 transition-colors cursor-pointer"
                >
                  Ambil +{view.pendingDraw} Kartu
                </button>
              ) : (
                <span className="text-[11px] text-rose-200/80">
                  {opponent?.name ?? "Lawan"} harus tumpuk ≥ +{view.pendingDrawMinValue} atau ambil!
                </span>
              )}
            </m.div>
          )}

          {/* Deck + Discard + Color Indicator */}
          {(() => {
            const canDrawFromDeck = isMyTurn && view.pendingDraw === 0;
            const mustDraw =
              canDrawFromDeck && view.playableCardIds.length === 0;

            return (
              <>
                <div className="flex items-center justify-center gap-5 sm:gap-8">
                  {/* Draw Pile */}
                  <button
                    type="button"
                    disabled={!canDrawFromDeck}
                    onClick={() => onAction({ type: "DRAW_CARD" })}
                    className={`group relative flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 shadow-xl transition-all sm:h-32 sm:w-22 ${
                      mustDraw
                        ? "card-back-pattern cursor-pointer border-[#d4a24c] ring-2 ring-[#d4a24c]/55 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(212,162,76,0.45)] active:scale-95 animate-pulse"
                        : canDrawFromDeck
                          ? "card-back-pattern cursor-pointer border-[#d4a24c]/70 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(212,162,76,0.35)] active:scale-95"
                          : "card-back-pattern cursor-default border-white/20 opacity-75"
                    }`}
                    title={
                      mustDraw
                        ? "Tidak ada kartu cocok — ambil kartu dari deck"
                        : canDrawFromDeck
                          ? "Ambil 1 kartu dari deck (bebas ambil sepuasnya di giliranmu)"
                          : "Tunggu giliranmu atau tangani tumpukan kartu"
                    }
                  >
                    <Layers className="h-5 w-5 text-[#ebe5d8]/85" />
                    <span className="mt-1 text-[10px] font-bold tracking-wider text-[#f3dfb8]">
                      {canDrawFromDeck ? "AMBIL +1" : "DECK"}
                    </span>
                    <span className="font-mono-tabular text-[10px] text-[#cfc8ba]/80">
                      {view.deckCount}
                    </span>
                  </button>

                  {/* Discard Pile with Active Color Halo */}
                  <div className="relative flex flex-col items-center gap-2">
                    <div
                      className="relative rounded-2xl p-1.5 transition-shadow duration-300"
                      style={{
                        boxShadow: `0 0 26px ${activeColorMeta.hex}55, inset 0 0 0 2px ${activeColorMeta.hex}88`,
                      }}
                    >
                      {view.previousCard && (
                        <div className="pointer-events-none absolute inset-1.5 -rotate-6 opacity-50">
                          <UnoCardView card={view.previousCard} size="lg" />
                        </div>
                      )}
                      <div className="relative z-10">
                        <UnoCardView card={view.topCard} size="lg" />
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold text-[#ebe5d8] ${activeColorMeta.softBg} ${activeColorMeta.border}`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: activeColorMeta.hex }}
                      />
                      <span>Warna: {activeColorMeta.label}</span>
                    </div>
                  </div>
                </div>

                {/* Clear CTA button when player has no playable card */}
                {mustDraw && (
                  <button
                    type="button"
                    onClick={() => onAction({ type: "DRAW_CARD" })}
                    className="min-h-[42px] rounded-xl bg-[#d4a24c] px-4 py-2 text-xs font-semibold text-[#111210] shadow-md hover:bg-[#e1b362] active:scale-95 transition-all cursor-pointer"
                  >
                    Tidak Ada Kartu Cocok — Ambil Kartu (+1)
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Wild Color Picker */}
        {pendingWildCard && isMyTurn && (
          <div className="rounded-xl border border-[#d4a24c]/55 bg-[#121914]/95 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#f3dfb8]">
                Pilih warna aktif untuk {pendingWildCard.kind.replace("WILD_", "Wild +").replace("WILD", "Wild")}:
              </span>
              <button
                type="button"
                onClick={() => setPendingWildCard(null)}
                className="inline-flex items-center gap-1 text-[11px] text-[#9c9689] hover:text-[#ebe5d8] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Batal
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {UNO_COLORS.map((c) => {
                const meta = UNO_COLOR_META[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handlePickWildColor(c)}
                    className="min-h-[42px] rounded-lg border border-white/25 px-2 py-2 text-xs font-bold text-white shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                    style={{ backgroundColor: meta.hex }}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Last Action Log */}
        <div className="rounded-xl border border-white/10 bg-[#101813]/85 px-3 py-2 text-center text-xs text-[#d6dfd7]">
          {view.lastAction ? (
            <span>
              <strong className="text-[#f3dfb8]">
                {lastActor?.name ?? "Pemain"}:
              </strong>{" "}
              {view.lastAction.detail}
            </span>
          ) : (
            <span className="text-[#9c9689]">
              {isMyTurn
                ? "Giliranmu — mainkan kartu yang cocok atau ambil dari deck."
                : `Giliran ${opponent?.name ?? "lawan"} untuk memulai.`}
            </span>
          )}
        </div>

        {/* My Hand + UNO Call Button */}
        {view.phase === "PLAYING" && (
          <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#0f1612]/90 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#ebe5d8]">
                Kartumu ({view.myHand.length})
              </span>

              <div className="flex items-center gap-2">
                {view.canCallUno && (
                  <button
                    type="button"
                    onClick={() => onAction({ type: "CALL_UNO" })}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d9483b] px-3 py-1 text-xs font-extrabold tracking-wide text-white shadow-[0_0_16px_rgba(245,158,11,0.55)] hover:brightness-110 active:scale-95 animate-pulse cursor-pointer"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    TERIAK UNO!
                  </button>
                )}
                {!isMyTurn && (
                  <span className="text-[11px] text-[#9c9689]">
                    Menunggu {opponent?.name ?? "lawan"}...
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 pt-1 sm:gap-2">
              {view.myHand.map((card) => {
                const playable = isMyTurn && playableSet.has(card.id);
                return (
                  <UnoCardView
                    key={card.id}
                    card={card}
                    playable={playable}
                    dimmed={isMyTurn && !playable}
                    selected={pendingWildCard?.id === card.id}
                    onClick={() => handleCardClick(card)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Round End Banner */}
        {view.phase === "ROUND_END" && view.lastRoundSummary && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/12 bg-[#121915]/95 px-4 py-4 text-center">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#d4a24c]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ronde {view.lastRoundSummary.roundNumber} Selesai</span>
              </div>
              <p className="font-display text-lg text-[#ebe5d8] sm:text-xl">
                {getRoundReasonText(
                  view.lastRoundSummary.reason,
                  roundWinner?.name ?? "Pemain",
                  roundLoser?.name ?? "Lawan",
                  view.lastRoundSummary.loserCardCount
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
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#d4a24c]/40 bg-[#121915]/95 px-4 py-4 text-center">
            <div className="space-y-1">
              <p className="font-display text-xl text-[#f3dfb8] sm:text-2xl">
                {matchWinner?.id === playerId
                  ? "Kamu Menang!"
                  : `${matchWinner?.name ?? "Pasangan"} Menang!`}
              </p>
              {view.lastRoundSummary && (
                <p className="text-xs text-[#a9b5ab]">
                  {getRoundReasonText(
                    view.lastRoundSummary.reason,
                    roundWinner?.name ?? "Pemain",
                    roundLoser?.name ?? "Lawan",
                    view.lastRoundSummary.loserCardCount
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
