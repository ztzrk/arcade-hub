import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import {
  ArrowLeftRight,
  Check,
  Clock,
  Lock,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import {
  COURT_SLOTS,
  KARASUNO_FORMATIONS,
  findBestAutoSlot,
  getFormationStatus,
  getPositionFit,
  getPotentialResonances,
  type CourtSlotId,
  type FormationId,
  type HaikyuuDraftView,
  type HaikyuuPlayer,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import { JerseyAvatar } from "../karasuno-haruko/JerseyAvatar";
import { VolleyballCourt } from "../karasuno-haruko/VolleyballCourt";
import type { GameBoardProps } from "../liars-deck/LiarsDeckBoard";

function countFilledSlots(lineup: HaikyuuDraftView["me"]["lineup"]): number {
  let n = 0;
  for (const s of COURT_SLOTS) {
    if (lineup[s.id]) n += 1;
  }
  return n;
}

function getFormationName(id: FormationId | null): string {
  if (!id) return "Rahasia";
  return KARASUNO_FORMATIONS.find((f) => f.id === id)?.name ?? id;
}

export function HaikyuuDraftBoard({
  view: rawView,
  room,
  playerId,
  lastEvents,
  serverTimeOffsetMs = 0,
  onAction,
  onSetReady,
  onStartMatch,
  onReturnToLobby,
}: GameBoardProps) {
  const view = rawView as HaikyuuDraftView | null;
  const [nowMs, setNowMs] = useState(() => Date.now() + serverTimeOffsetMs);
  const [swapSlot, setSwapSlot] = useState<CourtSlotId | null>(null);
  const [courtTab, setCourtTab] = useState<"mine" | "opponent">("mine");
  const lastSoundKeyRef = useRef<string>("");

  useEffect(() => {
    setNowMs(Date.now() + serverTimeOffsetMs);
    if (!view?.phaseDeadlineAt) return;
    const id = window.setInterval(() => {
      setNowMs(Date.now() + serverTimeOffsetMs);
    }, 100);
    return () => window.clearInterval(id);
  }, [view?.phaseDeadlineAt, serverTimeOffsetMs]);

  useEffect(() => {
    setSwapSlot(null);
  }, [view?.phase, view?.setScores.length]);

  useEffect(() => {
    if (!lastEvents.length) return;
    const eventSig = JSON.stringify(lastEvents);
    if (eventSig === lastSoundKeyRef.current) return;
    lastSoundKeyRef.current = eventSig;

    for (const ev of lastEvents) {
      if (ev.type === "DRAFT_ROUND_STARTED") {
        soundManager.play("reveal");
      } else if (ev.type === "PLAYER_CLAIMED") {
        const by = (ev.payload as { byPlayerId?: string } | undefined)?.byPlayerId;
        soundManager.play(by === playerId ? "card" : "click");
      } else if (ev.type === "SET_COMPLETED") {
        const winner = (ev.payload as { winnerId?: string } | undefined)?.winnerId;
        soundManager.play(winner === playerId ? "win" : "spike");
      } else if (ev.type === "MATCH_COMPLETED") {
        const winner = (ev.payload as { winnerId?: string } | undefined)?.winnerId;
        soundManager.play(winner === playerId ? "cheer" : "wrong");
      }
    }
  }, [lastEvents, playerId]);

  const me = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);
  const bothReady = room.players.length === 2 && room.players.every((p) => p.ready);

  const remainingMs = useMemo(() => {
    if (!view?.phaseDeadlineAt) return 0;
    return Math.max(0, view.phaseDeadlineAt - nowMs);
  }, [view?.phaseDeadlineAt, nowMs]);

  const remainingSec = (remainingMs / 1000).toFixed(1);
  const timerPct =
    view && view.phaseDurationMs > 0
      ? Math.min(100, Math.max(0, (remainingMs / view.phaseDurationMs) * 100))
      : 0;
  const isUrgent = Boolean(view?.phaseDeadlineAt) && remainingMs <= 4000;

  if (!view || !me) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-sm text-[#9c9689]">
        Menyiapkan lapangan Haikyuu!! 1v1 Draft...
      </div>
    );
  }

  const myFilledCount = countFilledSlots(view.me.lineup);
  const myRoundDone =
    view.phase === "DRAFT" &&
    view.me.pendingPlayer === null &&
    myFilledCount >= view.roundNumber;
  const myCanSwap =
    (view.phase === "TACTICS" && !view.me.tacticsLocked) ||
    (view.phase === "MATCH" && !view.readyForNextSet[me.id]);

  const myFormationStatus = view.me.formationId
    ? getFormationStatus(
        view.me.lineup,
        view.me.formationId,
        view.me.evaluation.stats.defense,
        view.me.evaluation.activeSynergies.length
      )
    : null;

  const handleTacticsSlotClick = (slotId: CourtSlotId) => {
    if (!myCanSwap) return;
    if (!swapSlot) {
      soundManager.play("click");
      setSwapSlot(slotId);
      return;
    }
    if (swapSlot === slotId) {
      setSwapSlot(null);
      return;
    }
    soundManager.play("card");
    onAction({ type: "SWAP_SLOTS", slotA: swapSlot, slotB: slotId });
    setSwapSlot(null);
  };

  const renderCandidateCard = (candidate: {
    player: HaikyuuPlayer;
    claimedByPlayerId: string | null;
  }) => {
    const p = candidate.player;
    const claimedByMe = candidate.claimedByPlayerId === me.id;
    const claimedByOpp =
      candidate.claimedByPlayerId !== null && candidate.claimedByPlayerId !== me.id;
    const bestSlot = findBestAutoSlot(p, view.me.lineup);
    const bestFit = bestSlot ? getPositionFit(p, bestSlot) : null;
    const resonances = getPotentialResonances(p, view.me.lineup);
    const canClaim =
      view.phase === "DRAFT" &&
      candidate.claimedByPlayerId === null &&
      view.me.pendingPlayer === null &&
      !myRoundDone;

    return (
      <div
        key={p.id}
        className={`relative flex flex-col justify-between rounded-lg border p-3 transition-all ${
          claimedByMe
            ? "border-[#f97316] bg-[#211812] shadow-[0_0_18px_rgba(249,115,22,0.2)]"
            : claimedByOpp
              ? "border-rose-500/35 bg-[#191415]/80 opacity-60"
              : canClaim
                ? "border-white/15 bg-[#151715] hover:border-[#f97316]/70"
                : "border-white/10 bg-[#141513] opacity-75"
        }`}
      >
        {claimedByOpp && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/55">
            <span className="rotate-[-6deg] rounded border-2 border-rose-400 bg-[#1a0d0e]/95 px-2.5 py-1 font-mono-tabular text-[11px] font-extrabold tracking-wider text-rose-300">
              DIAMBIL LAWAN
            </span>
          </div>
        )}

        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <JerseyAvatar
                number={p.number}
                primaryColor={p.primaryColor}
                secondaryColor={p.secondaryColor}
                position={p.position}
                tier={p.tier}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#ebe5d8]">{p.name}</p>
                <p className="truncate text-[11px] text-[#9c9689]">
                  {p.schoolLabel} • {p.tier}
                </p>
              </div>
            </div>
            <span className="font-mono-tabular shrink-0 rounded bg-white/8 px-2 py-0.5 text-sm font-extrabold text-[#f97316]">
              {p.ovr}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-5 gap-1 text-center text-[10px]">
            {(
              [
                ["ATK", p.stats.attack],
                ["DEF", p.stats.defense],
                ["SRV", p.stats.serve],
                ["BRN", p.stats.brain],
                ["SPD", p.stats.speed],
              ] as const
            ).map(([label, val]) => (
              <div key={label} className="rounded bg-black/30 py-1">
                <span className="block text-[9px] text-[#8a8478]">{label}</span>
                <span className="font-mono-tabular font-bold text-[#ebe5d8]">{val}</span>
              </div>
            ))}
          </div>

          {bestSlot && bestFit && (
            <p className="mt-2 text-[11px] text-[#cfc8ba]">
              Slot terbaik:{" "}
              <span
                className={`font-mono-tabular font-bold ${
                  bestFit.fit === "PERFECT"
                    ? "text-emerald-400"
                    : bestFit.fit === "FLEX"
                      ? "text-amber-300"
                      : "text-rose-400"
                }`}
              >
                {bestSlot} ({bestFit.fit === "PERFECT" ? "PAS" : `-${bestFit.penalty}`})
              </span>
            </p>
          )}

          {resonances.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {resonances.slice(0, 2).map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 rounded bg-[#f97316]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#fb923c]"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {r.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-1.5">
          {claimedByMe ? (
            <button
              type="button"
              onClick={() =>
                bestSlot && onAction({ type: "PLACE_PLAYER", slotId: bestSlot })
              }
              disabled={!bestSlot}
              className="flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-md bg-[#f97316] px-3 py-1.5 text-xs font-bold text-[#111210] hover:bg-[#fb923c] cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              Taruh di {bestSlot ?? "Slot"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!canClaim}
                onClick={() => onAction({ type: "CLAIM_PLAYER", playerId: p.id })}
                className="min-h-[38px] flex-1 rounded-md bg-[#f97316] px-3 py-1.5 text-xs font-bold text-[#111210] hover:bg-[#fb923c] disabled:cursor-not-allowed disabled:opacity-40 transition-colors cursor-pointer"
              >
                Rebut
              </button>
              {bestSlot && (
                <button
                  type="button"
                  disabled={!canClaim}
                  title={`Langsung rebut & taruh di ${bestSlot}`}
                  onClick={() =>
                    onAction({
                      type: "CLAIM_PLAYER",
                      playerId: p.id,
                      slotId: bestSlot,
                    })
                  }
                  className="min-h-[38px] rounded-md border border-[#f97316]/50 bg-[#f97316]/12 px-2.5 py-1.5 text-[11px] font-bold text-[#fb923c] hover:bg-[#f97316]/25 disabled:cursor-not-allowed disabled:opacity-35 transition-colors cursor-pointer"
                >
                  +{bestSlot}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const mySetsWon = view.setsWon[me.id] ?? 0;
  const oppSetsWon = opponent ? (view.setsWon[opponent.id] ?? 0) : 0;

  return (
    <div className="mx-auto max-w-6xl px-3.5 py-4 sm:px-5 sm:py-6">
      <div className="space-y-4">
        {/* Top Duel Bar + Server-Synced Countdown */}
        <div className="rounded-xl border border-white/12 bg-[#151614] p-3.5 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-[#f97316] uppercase">
                  {view.phase === "DRAFT"
                    ? `Race Draft • Ronde ${view.roundNumber}/${view.totalRounds}`
                    : view.phase === "TACTICS"
                      ? "Tactical Lock-in"
                      : view.phase === "MATCH"
                        ? `Live Match • Best of ${view.bestOf}`
                        : "Duel Selesai"}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-sm font-bold text-[#ebe5d8]">
                  <span>{me.name}</span>
                  <span className="font-mono-tabular text-[#f97316]">
                    {view.me.evaluation.totalOvr.toFixed(1)}
                  </span>
                  <span className="text-[#8a8478]">vs</span>
                  <span className="font-mono-tabular text-[#38bdf8]">
                    {view.opponent.evaluation.totalOvr.toFixed(1)}
                  </span>
                  <span>{opponent?.name ?? "Lawan"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(view.phase === "MATCH" || view.phase === "MATCH_END") && (
                <div className="flex items-center gap-1.5 rounded-md border border-white/12 bg-black/35 px-3 py-1.5">
                  <span className="font-mono-tabular text-base font-extrabold text-[#f97316]">
                    {mySetsWon}
                  </span>
                  <span className="text-xs text-[#8a8478]">-</span>
                  <span className="font-mono-tabular text-base font-extrabold text-[#38bdf8]">
                    {oppSetsWon}
                  </span>
                  <span className="ml-1 text-[10px] text-[#9c9689]">SET</span>
                </div>
              )}

              {view.phaseDeadlineAt && (
                <div
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono-tabular text-sm font-extrabold ${
                    isUrgent
                      ? "animate-pulse border-rose-500/70 bg-rose-500/20 text-rose-300"
                      : "border-[#d4a24c]/40 bg-[#1d1a14] text-[#f3dfb8]"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {remainingSec}s
                </div>
              )}
            </div>
          </div>

          {view.phaseDeadlineAt && view.phaseDurationMs > 0 && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-[width] duration-100 ${
                  isUrgent ? "bg-rose-500" : "bg-[#f97316]"
                }`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          )}
        </div>

        {/* PHASE: DRAFT */}
        {view.phase === "DRAFT" && (
          <div className="rounded-xl border border-white/12 bg-[#151614] p-3.5 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              {view.currentPack && (
                <div className="flex items-center gap-2.5">
                  <span
                    className="rounded px-2 py-1 font-mono-tabular text-xs font-extrabold"
                    style={{
                      backgroundColor: view.currentPack.primaryColor,
                      color:
                        view.currentPack.primaryColor === "#f8fafc" ||
                        view.currentPack.primaryColor === "#f0f9ff" ||
                        view.currentPack.primaryColor === "#eab308"
                          ? "#111210"
                          : "#f8fafc",
                      border: `1px solid ${view.currentPack.secondaryColor}`,
                    }}
                  >
                    {view.currentPack.shortName}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#ebe5d8]">
                      {view.currentPack.name}
                    </p>
                    <p className="text-[11px] text-[#9c9689]">
                      {view.currentPack.motto}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs font-medium text-[#d4a24c]">
                {view.me.pendingPlayer
                  ? `Terklaim: ${view.me.pendingPlayer.name} — klik slot kosong di lapangan!`
                  : myRoundDone
                    ? "Pilihanmu aman! Menunggu lawan menyelesaikan ronde..."
                    : "Cepat rebut 1 pemain sebelum diambil lawan!"}
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {view.candidates.map(renderCandidateCard)}
            </div>
          </div>
        )}

        {/* PHASE: TACTICS OR MATCH */}
        {(view.phase === "TACTICS" || view.phase === "MATCH") && (
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left: Match Scoreboard / Tactics Controls */}
            <div className="space-y-4 lg:col-span-5">
              {view.phase === "MATCH" && (
                <div className="rounded-xl border border-white/12 bg-[#151614] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#f97316]">
                      <Swords className="h-4 w-4" />
                      <span>HASIL SET (BEST OF 3)</span>
                    </div>
                    <span className="text-[11px] text-[#9c9689]">
                      Jeda taktis: atur ulang formasi/posisi
                    </span>
                  </div>

                  {view.tacticalEdgeSummary && (
                    <p className="rounded bg-black/30 px-3 py-2 text-xs text-[#cfc8ba]">
                      {view.tacticalEdgeSummary}
                    </p>
                  )}

                  <div className="divide-y divide-white/8 rounded border border-white/10 bg-[#111210]">
                    {view.setScores.map((s) => {
                      const myScore = s.scores[me.id] ?? 0;
                      const oppScore = opponent ? (s.scores[opponent.id] ?? 0) : 0;
                      const iWon = s.winnerId === me.id;
                      return (
                        <div key={s.setNumber} className="px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono-tabular text-xs font-bold text-[#9c9689]">
                              Set {s.setNumber}
                            </span>
                            <span
                              className={`font-mono-tabular text-sm font-extrabold ${
                                iWon ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {myScore} - {oppScore}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#cfc8ba]">{s.highlight}</p>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(view.readyForNextSet[me.id])}
                    onClick={() => onAction({ type: "READY_NEXT_SET" })}
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-bold text-[#111210] hover:bg-[#fb923c] disabled:opacity-55 cursor-pointer"
                  >
                    {view.readyForNextSet[me.id]
                      ? "✓ Menunggu lawan lanjut set..."
                      : `Siap Mainkan Set ${view.setScores.length + 1}`}
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-white/12 bg-[#151614] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#d4a24c]">
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>FORMASI &amp; SWAP POSISI</span>
                  </div>
                  <span className="text-[11px] text-[#9c9689]">
                    {myCanSwap
                      ? swapSlot
                        ? `Pilih slot tujuan tukar dari ${swapSlot}`
                        : "Klik 2 pemain di lapanganmu untuk tukar"
                      : "Taktik terkunci"}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {KARASUNO_FORMATIONS.map((f) => {
                    const selected = view.me.formationId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        disabled={!myCanSwap}
                        onClick={() => {
                          soundManager.play("click");
                          onAction({ type: "SET_FORMATION", formationId: f.id });
                        }}
                        className={`rounded-lg border p-2.5 text-left transition-colors ${
                          selected
                            ? "border-[#f97316] bg-[#211812]"
                            : "border-white/10 bg-[#111210] hover:border-white/25"
                        } disabled:cursor-default disabled:opacity-75 cursor-pointer`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#ebe5d8]">
                            {f.name}
                          </span>
                          <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono-tabular text-[10px] text-[#fb923c]">
                            {f.styleTag}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#9c9689]">
                          {f.bonusDetail}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {myFormationStatus && (
                  <div className="flex flex-wrap gap-2 rounded bg-black/30 px-3 py-2 text-[11px]">
                    {myFormationStatus.checks.map((c) => (
                      <span
                        key={c.label}
                        className={c.met ? "text-emerald-400" : "text-[#8a8478]"}
                      >
                        {c.met ? "✓" : "○"} {c.label}
                      </span>
                    ))}
                  </div>
                )}

                {view.phase === "TACTICS" && (
                  <button
                    type="button"
                    disabled={view.me.tacticsLocked}
                    onClick={() => onAction({ type: "LOCK_TACTICS" })}
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-[#d4a24c] px-4 py-2 text-sm font-bold text-[#111210] hover:bg-[#dfb263] disabled:opacity-55 cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    {view.me.tacticsLocked
                      ? opponent && view.opponent.tacticsLocked
                        ? "Memulai Set 1..."
                        : "✓ Terkunci • Menunggu lawan..."
                      : "Kunci Lineup & Mulai Match"}
                  </button>
                )}
              </div>
            </div>

            {/* Right: Interactive Court */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCourtTab("mine")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold cursor-pointer ${
                      courtTab === "mine"
                        ? "bg-[#f97316] text-[#111210]"
                        : "bg-white/8 text-[#cfc8ba]"
                    }`}
                  >
                    Tim Saya ({view.me.evaluation.totalOvr.toFixed(1)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourtTab("opponent")}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold cursor-pointer ${
                      courtTab === "opponent"
                        ? "bg-[#38bdf8] text-[#111210]"
                        : "bg-white/8 text-[#cfc8ba]"
                    }`}
                  >
                    Tim Lawan ({view.opponent.evaluation.totalOvr.toFixed(1)})
                  </button>
                </div>

                <span className="text-[11px] text-[#9c9689]">
                  Formasi Lawan:{" "}
                  <strong className="text-[#ebe5d8]">
                    {getFormationName(view.opponent.formationId)}
                  </strong>
                </span>
              </div>

              {courtTab === "mine" ? (
                <VolleyballCourt
                  lineup={view.me.lineup}
                  evaluation={view.me.evaluation}
                  selectedPlayer={null}
                  interactive={myCanSwap}
                  allowFilledSlotClick={myCanSwap}
                  highlightedSlotId={swapSlot}
                  onSlotClick={handleTacticsSlotClick}
                />
              ) : (
                <VolleyballCourt
                  lineup={view.opponent.lineup}
                  evaluation={view.opponent.evaluation}
                  selectedPlayer={null}
                  interactive={false}
                />
              )}
            </div>
          </div>
        )}

        {/* PHASE: MATCH_END */}
        {(room.phase === "MATCH_OVER" || view.phase === "MATCH_END") && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-xl border border-[#d4a24c]/45 bg-[#151614] p-5 text-center"
          >
            <div className="flex flex-col items-center gap-2">
              {view.winnerId === me.id ? (
                <Trophy className="h-8 w-8 text-[#f97316]" />
              ) : (
                <Shield className="h-8 w-8 text-[#9c9689]" />
              )}
              <h2 className="font-display text-2xl text-[#ebe5d8] sm:text-3xl">
                {view.winnerId === me.id
                  ? `Kamu Menang ${mySetsWon}-${oppSetsWon}!`
                  : `${opponent?.name ?? "Lawan"} Menang ${oppSetsWon}-${mySetsWon}`}
              </h2>
              {view.tacticalEdgeSummary && (
                <p className="text-xs text-[#9c9689]">{view.tacticalEdgeSummary}</p>
              )}
              {room.customStake && (
                <p className="text-xs font-medium text-[#d4a24c]">
                  Taruhan: {room.customStake}
                </p>
              )}
            </div>

            <div className="mx-auto max-w-xl divide-y divide-white/8 rounded-lg border border-white/10 bg-[#111210] text-left">
              {view.setScores.map((s) => (
                <div
                  key={s.setNumber}
                  className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-tabular text-xs text-[#9c9689]">
                      Set {s.setNumber}
                    </span>
                    <span
                      className={`font-mono-tabular text-sm font-bold ${
                        s.winnerId === me.id ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {s.scores[me.id] ?? 0} - {opponent ? (s.scores[opponent.id] ?? 0) : 0}
                    </span>
                  </div>
                  <p className="text-xs text-[#cfc8ba]">{s.highlight}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onSetReady(!me.ready)}
                className={`min-h-[42px] rounded-lg border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  me.ready
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                    : "border-white/20 bg-[#171815] text-[#ebe5d8]"
                }`}
              >
                {me.ready ? "✓ Siap" : "Main Lagi"}
              </button>
              <button
                type="button"
                onClick={onStartMatch}
                disabled={!bothReady}
                className="min-h-[42px] rounded-lg bg-[#f97316] px-4 py-2 text-xs font-bold text-[#111210] disabled:opacity-35 cursor-pointer"
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

        {/* DRAFT COURTS + SYNERGY OVERVIEW */}
        {(view.phase === "DRAFT" || view.phase === "MATCH_END") && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#ebe5d8]">
                  Lapangan {me.name} ({myFilledCount}/7)
                </span>
                <span className="font-mono-tabular font-bold text-[#f97316]">
                  OVR {view.me.evaluation.totalOvr.toFixed(1)}
                  {view.me.evaluation.synergyBonus > 0 &&
                    ` (+${view.me.evaluation.synergyBonus.toFixed(1)} Sinergi)`}
                </span>
              </div>
              <VolleyballCourt
                lineup={view.me.lineup}
                evaluation={view.me.evaluation}
                selectedPlayer={view.me.pendingPlayer}
                interactive={view.phase === "DRAFT" && Boolean(view.me.pendingPlayer)}
                onPlaceInSlot={(slotId) => {
                  soundManager.play("card");
                  onAction({ type: "PLACE_PLAYER", slotId });
                }}
              />
              {view.me.evaluation.activeSynergies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {view.me.evaluation.activeSynergies.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded border border-[#f97316]/35 bg-[#f97316]/12 px-2 py-0.5 text-[11px] font-medium text-[#fb923c]"
                    >
                      <Check className="h-3 w-3" />
                      {s.name} (+{s.ovrBonus.toFixed(1)})
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#ebe5d8]">
                  Lapangan {opponent?.name ?? "Lawan"} (
                  {countFilledSlots(view.opponent.lineup)}/7)
                </span>
                <span className="font-mono-tabular font-bold text-[#38bdf8]">
                  OVR {view.opponent.evaluation.totalOvr.toFixed(1)}
                  {view.phase === "MATCH_END" &&
                    view.opponent.formationId &&
                    ` • ${getFormationName(view.opponent.formationId)}`}
                </span>
              </div>
              <VolleyballCourt
                lineup={view.opponent.lineup}
                evaluation={view.opponent.evaluation}
                selectedPlayer={null}
                interactive={false}
              />
              {view.opponent.evaluation.activeSynergies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {view.opponent.evaluation.activeSynergies.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded border border-[#38bdf8]/35 bg-[#38bdf8]/10 px-2 py-0.5 text-[11px] font-medium text-[#7dd3fc]"
                    >
                      <Sparkles className="h-3 w-3" />
                      {s.name} (+{s.ovrBonus.toFixed(1)})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
