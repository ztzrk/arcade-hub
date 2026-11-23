import { useEffect, useMemo, useRef, useState } from "react";
import { m } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import {
  COURT_SLOTS,
  HAIKYUU_PLAYERS,
  HAIKYUU_SYNERGY_CATALOG,
  HARUKO_BRACKET,
  KARASUNO_FORMATIONS,
  POSITION_LABELS,
  SCHOOL_PACKS,
  computeMatchupEdge,
  createLiveMatchState,
  createSeededRng,
  drawPackCandidates,
  evaluateTeam,
  finalizeLiveMatch,
  getDailyChallengeKey,
  getFormationStatus,
  getPotentialResonances,
  playNextMatchSet,
  rollSchoolPack,
  simulateHarukoMatch,
  type CourtSlotId,
  type FormationId,
  type HaikyuuDraftMode,
  type HaikyuuPlayer,
  type LineupMap,
  type LiveMatchState,
  type SchoolPack,
  type TournamentMatchResult,
} from "@arcade-hub/shared";
import { soundManager } from "../../shared/audio";
import {
  loadKarasunoCollection,
  recordRunToCollection,
  type HaikyuuBadgeMeta,
  type KarasunoCollection,
} from "./collection";
import { JerseyAvatar } from "./JerseyAvatar";
import { NotebookModal } from "./NotebookModal";
import { VolleyballCourt } from "./VolleyballCourt";
import {
  buildVerificationCode,
  buildWhatsAppShareText,
  downloadVerifiedResultCard,
  formatRunTimestamp,
} from "./shareResult";

type GamePhase = "SETUP" | "DRAFT" | "TOURNAMENT" | "SUMMARY";

interface CareerStats {
  runs: number;
  titles: number;
  perfectRuns: number;
  bestOvr: number;
}

const CAREER_STATS_KEY = "arcade-hub:haikyuu-haruko-stats";
const TOTAL_DRAFT_ROUNDS = COURT_SLOTS.length; // 7

const REEL_CARD_WIDTH = 144;
const REEL_CARD_GAP = 10;
const REEL_STRIDE = REEL_CARD_WIDTH + REEL_CARD_GAP;
const REEL_TARGET_INDEX = 14;
const REEL_TOTAL_CARDS = 20;
const REEL_START_X = -(2 * REEL_STRIDE + REEL_CARD_WIDTH / 2);
const REEL_END_X = -(REEL_TARGET_INDEX * REEL_STRIDE + REEL_CARD_WIDTH / 2);

function loadCareerStats(): CareerStats {
  try {
    const raw = localStorage.getItem(CAREER_STATS_KEY);
    if (!raw) return { runs: 0, titles: 0, perfectRuns: 0, bestOvr: 0 };
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      runs: typeof parsed.runs === "number" ? parsed.runs : 0,
      titles: typeof parsed.titles === "number" ? parsed.titles : 0,
      perfectRuns: typeof parsed.perfectRuns === "number" ? parsed.perfectRuns : 0,
      bestOvr: typeof parsed.bestOvr === "number" ? parsed.bestOvr : 0,
    };
  } catch {
    return { runs: 0, titles: 0, perfectRuns: 0, bestOvr: 0 };
  }
}

function saveCareerStats(stats: CareerStats): void {
  try {
    localStorage.setItem(CAREER_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

interface KarasunoHarukoBoardProps {
  onExit?: () => void;
}

export function KarasunoHarukoBoard({ onExit }: KarasunoHarukoBoardProps) {
  const [phase, setPhase] = useState<GamePhase>("SETUP");
  const [mode, setMode] = useState<HaikyuuDraftMode>("classic");
  const [runType, setRunType] = useState<"free" | "daily">("free");
  const [formationId, setFormationId] = useState<FormationId>("run-gun");
  const [career, setCareer] = useState<CareerStats>(() => loadCareerStats());
  const [collection, setCollection] = useState<KarasunoCollection>(() =>
    loadKarasunoCollection()
  );
  const [showNotebook, setShowNotebook] = useState(false);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<HaikyuuBadgeMeta[]>([]);
  const dailyKey = useMemo(() => getDailyChallengeKey(), []);

  // Draft state
  const [round, setRound] = useState(1);
  const [lineup, setLineup] = useState<LineupMap>({});
  const [usedPackIds, setUsedPackIds] = useState<string[]>([]);
  const [currentPack, setCurrentPack] = useState<SchoolPack | null>(null);
  const [packCandidates, setPackCandidates] = useState<HaikyuuPlayer[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [spinLanded, setSpinLanded] = useState(false);
  const [reelItems, setReelItems] = useState<SchoolPack[]>([]);
  const [spinRunKey, setSpinRunKey] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<HaikyuuPlayer | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState(3);

  // Tournament state
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchHistory, setMatchHistory] = useState<TournamentMatchResult[]>([]);
  const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);
  const [currentMatchResult, setCurrentMatchResult] =
    useState<TournamentMatchResult | null>(null);
  const [completedAt, setCompletedAt] = useState<Date>(() => new Date());
  const [copiedShare, setCopiedShare] = useState(false);

  const reelTimersRef = useRef<number[]>([]);
  const statsRecordedRef = useRef(false);
  const draftRngRef = useRef<() => number>(Math.random);
  const matchRngRef = useRef<() => number>(Math.random);

  const clearSpinTimers = () => {
    for (const id of reelTimersRef.current) {
      window.clearTimeout(id);
    }
    reelTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearSpinTimers();
  }, []);

  const draftedPlayerIds = useMemo(
    () =>
      new Set(
        Object.values(lineup)
          .filter((p): p is HaikyuuPlayer => Boolean(p))
          .map((p) => p.id)
      ),
    [lineup]
  );

  const evaluation = useMemo(
    () => evaluateTeam(lineup, formationId),
    [lineup, formationId]
  );

  const formationStatus = useMemo(
    () =>
      getFormationStatus(
        lineup,
        formationId,
        evaluation.stats.defense,
        evaluation.activeSynergies.length
      ),
    [lineup, formationId, evaluation.stats.defense, evaluation.activeSynergies.length]
  );

  const startNewRun = () => {
    clearSpinTimers();
    soundManager.play("reveal");
    statsRecordedRef.current = false;
    setNewlyUnlockedBadges([]);
    draftRngRef.current =
      runType === "daily"
        ? createSeededRng(`haruko-daily-draft:${dailyKey}`)
        : Math.random;
    matchRngRef.current =
      runType === "daily"
        ? createSeededRng(`haruko-daily-match:${dailyKey}`)
        : Math.random;
    setPhase("DRAFT");
    setRound(1);
    setLineup({});
    setUsedPackIds([]);
    setCurrentPack(null);
    setPackCandidates([]);
    setSpinning(false);
    setSpinLanded(false);
    setReelItems([]);
    setSelectedPlayer(null);
    setRerollsLeft(3);
    setMatchIndex(0);
    setMatchHistory([]);
    setLiveMatch(null);
    setCurrentMatchResult(null);
    setCopiedShare(false);
  };

  const triggerSpin = (consumeReroll = false) => {
    if (spinning) return;
    if (consumeReroll && rerollsLeft <= 0) return;

    clearSpinTimers();
    setSelectedPlayer(null);
    if (consumeReroll) {
      setCurrentPack(null);
      setPackCandidates([]);
      setRerollsLeft((r) => Math.max(0, r - 1));
    }
    setSpinLanded(false);
    setSpinning(true);
    setSpinRunKey((k) => k + 1);

    const usedSet = new Set(usedPackIds);
    const rng = draftRngRef.current;
    const chosen = rollSchoolPack(usedSet, draftedPlayerIds, rng);

    const reel: SchoolPack[] = [];
    for (let i = 0; i < REEL_TOTAL_CARDS; i++) {
      if (i === REEL_TARGET_INDEX) {
        reel.push(chosen);
      } else {
        const candidates = SCHOOL_PACKS.filter((p) => p.id !== chosen.id);
        const randomPack =
          candidates[Math.floor(rng() * candidates.length)] ??
          SCHOOL_PACKS[0]!;
        reel.push(randomPack);
      }
    }

    setReelItems(reel);

    const tickDelays = [90, 190, 300, 430, 580, 760, 960];
    for (const delay of tickDelays) {
      const tid = window.setTimeout(() => soundManager.play("click"), delay);
      reelTimersRef.current.push(tid);
    }

    const landTimer = window.setTimeout(() => {
      soundManager.play("reveal");
      setSpinLanded(true);
    }, 1220);
    reelTimersRef.current.push(landTimer);

    const finishTimer = window.setTimeout(() => {
      setSpinning(false);
      setSpinLanded(false);
      setCurrentPack(chosen);
      setPackCandidates(drawPackCandidates(chosen.id, draftedPlayerIds, 3, rng));
      setUsedPackIds((prev) => [...prev, chosen.id]);
    }, 1580);
    reelTimersRef.current.push(finishTimer);
  };

  const handlePlaceInSlot = (slotId: CourtSlotId) => {
    if (!selectedPlayer || lineup[slotId]) return;
    soundManager.play("card");

    const nextLineup: LineupMap = {
      ...lineup,
      [slotId]: selectedPlayer,
    };
    setLineup(nextLineup);
    setSelectedPlayer(null);
    setCurrentPack(null);
    setPackCandidates([]);
    setReelItems([]);

    if (round >= TOTAL_DRAFT_ROUNDS) {
      soundManager.play("whistle");
      setPhase("TOURNAMENT");
      setMatchIndex(0);
      setMatchHistory([]);
      setLiveMatch(null);
      setCurrentMatchResult(null);
    } else {
      setRound((r) => r + 1);
    }
  };

  const recordRunOutcome = (history: TournamentMatchResult[]) => {
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    setCompletedAt(new Date());

    const allWon =
      history.length === HARUKO_BRACKET.length && history.every((m) => m.won);
    const setsLost = history.reduce((acc, m) => acc + m.opponentSets, 0);
    const perfect = allWon && setsLost === 0;

    setCareer((prev) => {
      const updated: CareerStats = {
        runs: prev.runs + 1,
        titles: prev.titles + (allWon ? 1 : 0),
        perfectRuns: prev.perfectRuns + (perfect ? 1 : 0),
        bestOvr: Math.max(prev.bestOvr, evaluation.totalOvr),
      };
      saveCareerStats(updated);
      return updated;
    });

    setCollection((prev) => {
      const { updated, newlyUnlockedBadges: unlocked } = recordRunToCollection(
        prev,
        {
          lineup,
          evaluation,
          matchHistory: history,
          mode,
          dailyKey: runType === "daily" ? dailyKey : null,
        }
      );
      setNewlyUnlockedBadges(unlocked);
      return updated;
    });
  };

  const finalizeMatchIntoHistory = (finishedState: LiveMatchState) => {
    const result = finalizeLiveMatch(finishedState);
    const isFinal = matchIndex === HARUKO_BRACKET.length - 1;
    if (result.won && isFinal) {
      soundManager.play("cheer");
      window.setTimeout(() => soundManager.play("win"), 180);
    } else {
      soundManager.play(result.won ? "win" : "wrong");
    }
    setCurrentMatchResult(result);
    const nextHistory = [...matchHistory, result];
    setMatchHistory(nextHistory);

    if (!result.won || isFinal) {
      recordRunOutcome(nextHistory);
    }
  };

  const playCurrentMatchSet = () => {
    const opponent = HARUKO_BRACKET[matchIndex];
    if (!opponent || currentMatchResult) return;

    const rng = matchRngRef.current;
    const isOpeningSet = !liveMatch;
    const baseState =
      liveMatch ?? createLiveMatchState(evaluation, lineup, opponent, rng);

    const nextState = playNextMatchSet(baseState, rng);
    setLiveMatch(nextState);

    if (nextState.finished) {
      finalizeMatchIntoHistory(nextState);
    } else {
      const lastSet = nextState.sets[nextState.sets.length - 1];
      const kWonSet = lastSet ? lastSet.karasuno > lastSet.opponent : true;
      if (isOpeningSet) {
        soundManager.play("whistle");
      }
      soundManager.play(kWonSet ? "spike" : "click");
    }
  };

  const advanceTournament = () => {
    if (!currentMatchResult) return;
    const isFinal = matchIndex === HARUKO_BRACKET.length - 1;
    if (!currentMatchResult.won || isFinal) {
      setPhase("SUMMARY");
      return;
    }
    setMatchIndex((i) => i + 1);
    setLiveMatch(null);
    setCurrentMatchResult(null);
  };

  const simulateRemainingMatches = () => {
    const history = [...matchHistory];
    let idx = matchIndex;
    let eliminated = currentMatchResult ? !currentMatchResult.won : false;

    const rng = matchRngRef.current;
    if (!currentMatchResult && liveMatch && !liveMatch.finished) {
      let finishing = liveMatch;
      while (!finishing.finished) {
        finishing = playNextMatchSet(finishing, rng);
      }
      const res = finalizeLiveMatch(finishing);
      history.push(res);
      if (!res.won) eliminated = true;
      idx += 1;
    } else if (currentMatchResult) {
      idx += 1;
    }

    while (!eliminated && idx < HARUKO_BRACKET.length) {
      const opp = HARUKO_BRACKET[idx]!;
      const res = simulateHarukoMatch(evaluation, lineup, opp, rng);
      history.push(res);
      if (!res.won) {
        eliminated = true;
      }
      idx += 1;
    }

    const wonAll =
      history.length === HARUKO_BRACKET.length && history.every((m) => m.won);
    if (wonAll) {
      soundManager.play("cheer");
      window.setTimeout(() => soundManager.play("win"), 180);
    } else {
      soundManager.play("wrong");
    }
    setLiveMatch(null);
    setMatchHistory(history);
    recordRunOutcome(history);
    setPhase("SUMMARY");
  };

  const champion =
    matchHistory.length === HARUKO_BRACKET.length &&
    matchHistory.every((m) => m.won);
  const totalSetsWon = matchHistory.reduce((acc, m) => acc + m.karasunoSets, 0);
  const totalSetsLost = matchHistory.reduce((acc, m) => acc + m.opponentSets, 0);
  const perfectRun = champion && totalSetsLost === 0;
  const eliminatedMatch = matchHistory.find((m) => !m.won);

  const shareParams = useMemo(
    () => ({
      mode,
      formationId,
      lineup,
      evaluation,
      matchHistory,
      completedAt,
      dailyKey: runType === "daily" ? dailyKey : null,
    }),
    [mode, formationId, lineup, evaluation, matchHistory, completedAt, runType, dailyKey]
  );

  const verificationCode = useMemo(
    () => buildVerificationCode(shareParams),
    [shareParams]
  );

  const whatsAppText = useMemo(
    () => buildWhatsAppShareText(shareParams, verificationCode),
    [shareParams, verificationCode]
  );

  const whatsAppUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`,
    [whatsAppText]
  );

  const copySummaryText = async () => {
    await navigator.clipboard.writeText(whatsAppText);
    setCopiedShare(true);
    window.setTimeout(() => setCopiedShare(false), 1800);
  };

  /* ------------------------------------------------------------------------ */
  /*  RENDER: SETUP (Matchday Broadsheet & Coach's Clipboard)                 */
  /* ------------------------------------------------------------------------ */
  if (phase === "SETUP") {
    const todayDaily =
      collection.dailyRecord?.dateKey === dailyKey ? collection.dailyRecord : null;

    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        {showNotebook && (
          <NotebookModal
            collection={collection}
            onClose={() => setShowNotebook(false)}
          />
        )}

        {/* Editorial Masthead */}
        <div className="border-b-2 border-[#f97316] pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl tracking-tight text-[#ebe5d8] sm:text-5xl">
                Karasuno <span className="text-[#f97316]">Haruko Draft</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#9c9689]">
                Putar rolet sekolah Haikyuu!!, susun 7 posisi lapangan Karasuno,
                dan tempuh 10 babak dari Kualifikasi Miyagi hingga Final
                Kejuaraan Musim Semi Tokyo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.play("click");
                  setShowNotebook(true);
                }}
                className="flex min-h-[42px] items-center gap-2 rounded-md border border-[#d4a24c]/40 bg-[#181611] px-3.5 py-2 text-xs font-semibold text-[#ebe5d8] hover:border-[#f97316] transition-colors cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-[#f97316]" />
                <span>
                  Notebook ({collection.unlockedPlayerIds.length}/{HAIKYUU_PLAYERS.length} •{" "}
                  {collection.unlockedSynergyIds.length}/{HAIKYUU_SYNERGY_CATALOG.length})
                </span>
              </button>

              {/* Inline Box-Score Career Strip */}
              <div className="flex items-center divide-x divide-white/12 border border-white/12 bg-[#161714]">
                <div className="px-3.5 py-2 text-center">
                  <span className="block text-[10px] text-[#9c9689]">Run</span>
                  <span className="font-mono-tabular text-base font-bold text-[#ebe5d8]">
                    {career.runs}
                  </span>
                </div>
                <div className="px-3.5 py-2 text-center">
                  <span className="block text-[10px] text-[#9c9689]">Juara</span>
                  <span className="font-mono-tabular text-base font-bold text-[#f97316]">
                    {career.titles}
                  </span>
                </div>
                <div className="px-3.5 py-2 text-center">
                  <span className="block text-[10px] text-[#9c9689]">0 Set Kalah</span>
                  <span className="font-mono-tabular text-base font-bold text-[#d4a24c]">
                    {career.perfectRuns}
                  </span>
                </div>
                <div className="px-3.5 py-2 text-center">
                  <span className="block text-[10px] text-[#9c9689]">Best OVR</span>
                  <span className="font-mono-tabular text-base font-bold text-emerald-400">
                    {career.bestOvr > 0 ? career.bestOvr.toFixed(1) : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asymmetric 2-Column Clipboard */}
        <div className="mt-6 grid gap-6 md:grid-cols-[1.35fr_0.9fr]">
          {/* Left: Tactic List */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[#ebe5d8]">
              Taktik Tim Karasuno
            </h2>
            <div className="divide-y divide-white/8 border border-white/12 bg-[#151614]">
              {KARASUNO_FORMATIONS.map((f) => {
                const active = formationId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormationId(f.id)}
                    className={`flex w-full items-start gap-3 border-l-4 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      active
                        ? "border-l-[#f97316] bg-[#1e1813]"
                        : "border-l-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border ${
                        active
                          ? "border-[#f97316] bg-[#f97316]"
                          : "border-white/30 bg-transparent"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-[#ebe5d8]">
                          {f.name}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-[#f97316]">
                          {f.styleTag}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[#9c9689]">{f.tagline}</p>
                      <p className="mt-1 text-[11px] text-[#d4a24c]">{f.bonusDetail}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Mode + Daily Seed + Launch */}
          <div className="flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div>
                <h2 className="mb-2.5 text-sm font-semibold text-[#ebe5d8]">
                  Tantangan Draft
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRunType("free")}
                    className={`rounded-md border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      runType === "free"
                        ? "border-[#f97316] bg-[#1e1813]"
                        : "border-white/12 bg-[#151614] hover:border-white/25"
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#ebe5d8]">Free Draft</p>
                    <p className="mt-0.5 text-[10px] text-[#9c9689]">
                      Spin acak bebas tanpa batas.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunType("daily")}
                    className={`rounded-md border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      runType === "daily"
                        ? "border-[#d4a24c] bg-[#211b10]"
                        : "border-white/12 bg-[#151614] hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-[#ebe5d8]">
                        Daily Seed
                      </p>
                      <Calendar className="h-3.5 w-3.5 text-[#d4a24c]" />
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#9c9689]">
                      {todayDaily
                        ? `Best ${todayDaily.bestOvr.toFixed(1)} • ${todayDaily.champion ? "Juara!" : `${todayDaily.wins}W`}`
                        : `Seed ${dailyKey}`}
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <h2 className="mb-2.5 text-sm font-semibold text-[#ebe5d8]">
                  Mode Pengetahuan
                </h2>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("classic")}
                    className={`flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors cursor-pointer ${
                      mode === "classic"
                        ? "border-[#f97316] bg-[#1e1813]"
                        : "border-white/12 bg-[#151614] hover:border-white/25"
                    }`}
                  >
                    <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                    <div>
                      <p className="text-sm font-semibold text-[#ebe5d8]">Mode Klasik</p>
                      <p className="mt-0.5 text-xs text-[#9c9689]">
                        Posisi, OVR, dan resonansi terlihat + 3x Timeout Ukai.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("blind")}
                    className={`flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-colors cursor-pointer ${
                      mode === "blind"
                        ? "border-[#f97316] bg-[#1e1813]"
                        : "border-white/12 bg-[#151614] hover:border-white/25"
                    }`}
                  >
                    <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[#d4a24c]" />
                    <div>
                      <p className="text-sm font-semibold text-[#ebe5d8]">
                        Mode Blind (Expert)
                      </p>
                      <p className="mt-0.5 text-xs text-[#9c9689]">
                        OVR &amp; posisi asli disembunyikan sampai pemain ditempatkan + 3x Timeout Ukai.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={startNewRun}
                className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-[#f97316] px-6 py-3 text-sm font-bold text-[#111210] hover:bg-[#fb923c] transition-colors cursor-pointer"
              >
                {runType === "daily"
                  ? `Mulai Daily Draft (${dailyKey})`
                  : "Mulai Draft Karasuno"}
              </button>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="min-h-[40px] w-full rounded-md border border-white/12 bg-transparent px-4 py-2 text-xs font-medium text-[#9c9689] hover:text-[#ebe5d8] transition-colors cursor-pointer"
                >
                  Kembali ke Arcade Hub
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  RENDER: DRAFT (7 ROUNDS)                                                */
  /* ------------------------------------------------------------------------ */
  if (phase === "DRAFT") {
    const activeFormation = KARASUNO_FORMATIONS.find((f) => f.id === formationId);

    return (
      <div className="mx-auto max-w-5xl px-3.5 py-4 sm:px-5 sm:py-6">
        {/* Clean Matchday Progress Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/12 pb-3">
          <div className="flex items-center gap-3">
            <span className="font-mono-tabular text-sm font-bold text-[#ebe5d8]">
              Putaran {round}/{TOTAL_DRAFT_ROUNDS}
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_DRAFT_ROUNDS }).map((_, idx) => {
                const done = idx < round - 1;
                const active = idx === round - 1;
                return (
                  <span
                    key={idx}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      done
                        ? "bg-emerald-400"
                        : active
                          ? "bg-[#f97316] ring-2 ring-[#f97316]/35"
                          : "bg-white/15"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!currentPack || spinning || rerollsLeft <= 0}
              onClick={() => triggerSpin(true)}
              className="flex min-h-[34px] items-center gap-1.5 rounded-md border border-[#d4a24c]/40 bg-[#d4a24c]/10 px-2.5 py-1 text-xs font-medium text-[#d4a24c] hover:bg-[#d4a24c]/20 disabled:cursor-not-allowed disabled:opacity-35 transition-colors cursor-pointer"
              title="Ulangi spin sekolah (3x per run)"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Timeout Ukai ({rerollsLeft})
            </button>
            <div className="flex items-baseline gap-1.5 border-l border-white/12 pl-3">
              <span className="text-xs text-[#9c9689]">OVR</span>
              <span className="font-mono-tabular text-lg font-bold text-[#f97316]">
                {evaluation.totalOvr > 0 ? evaluation.totalOvr.toFixed(1) : "--"}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Draft Workspace */}
        <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          {/* LEFT: Spin & School Roster */}
          <div className="space-y-4">
            {!currentPack ? (
              <div className="rounded-lg border border-white/12 bg-[#151614] p-5 text-center">
                <h2 className="font-display text-2xl text-[#ebe5d8]">
                  {spinning ? "Mengundi Sekolah..." : `Spin Sekolah #${round}`}
                </h2>

                {/* Mechanical Reel */}
                <div className="relative my-5 h-[88px] overflow-hidden border-y border-white/15 bg-[#10110f]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#10110f] to-transparent" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#10110f] to-transparent" />

                  <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2">
                    <div className="mx-auto h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#f97316]" />
                    <div className="mx-auto h-full w-0.5 bg-[#f97316]" />
                  </div>

                  {spinning && reelItems.length > 0 ? (
                    <m.div
                      key={spinRunKey}
                      initial={{ x: REEL_START_X }}
                      animate={{ x: REEL_END_X }}
                      transition={{ duration: 1.2, ease: [0.12, 0.85, 0.22, 1] }}
                      className="absolute left-1/2 top-0 flex h-full w-max items-center gap-[10px]"
                    >
                      {reelItems.map((item, idx) => {
                        const isWinner = spinLanded && idx === REEL_TARGET_INDEX;
                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            style={{ width: `${REEL_CARD_WIDTH}px` }}
                            className={`flex shrink-0 flex-col items-center rounded-md border px-3 py-2.5 transition-all ${
                              isWinner
                                ? "scale-105 border-[#f97316] bg-[#2a1b10] shadow-[0_0_16px_rgba(249,115,22,0.35)]"
                                : "border-white/10 bg-[#181a17]"
                            }`}
                          >
                            <span
                              className="h-1.5 w-8 rounded-xs"
                              style={{ backgroundColor: item.secondaryColor }}
                            />
                            <p className="mt-1.5 w-full truncate text-center text-xs font-bold text-[#ebe5d8]">
                              {item.shortName}
                            </p>
                            <p className="w-full truncate text-center text-[10px] text-[#9c9689]">
                              {item.prefecture}
                            </p>
                          </div>
                        );
                      })}
                    </m.div>
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-xs text-[#6b665d]">
                      Siap memutar 14 paket sekolah Haikyuu!!
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => triggerSpin(false)}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-md bg-[#f97316] px-7 py-2.5 text-sm font-bold text-[#111210] hover:bg-[#fb923c] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {spinning ? "Berputar..." : "Putar Sekolah"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* School Header Strip */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/12 border-l-4 bg-[#151614] px-4 py-3"
                  style={{ borderLeftColor: currentPack.secondaryColor }}
                >
                  <div>
                    <h2 className="font-display text-xl text-[#ebe5d8]">
                      {currentPack.name}
                    </h2>
                    <p className="text-xs text-[#9c9689]">
                      {currentPack.eraLabel} • {currentPack.prefecture}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-[#fb923c]">
                    {selectedPlayer
                      ? `Taruh ${selectedPlayer.name} di lapangan →`
                      : "Pilih 1 pemain"}
                  </p>
                </div>

                {/* Trading-Card Roster Grid */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {packCandidates.map((player) => {
                    const isSelected = selectedPlayer?.id === player.id;
                    const blind = mode === "blind";
                    const resonances = blind
                      ? []
                      : getPotentialResonances(player, lineup);
                    const primaryResonance = resonances[0];
                    const hasExactOpenSlot = COURT_SLOTS.some(
                      (s) => s.expectedPosition === player.position && !lineup[s.id]
                    );

                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          soundManager.play("click");
                          setSelectedPlayer(isSelected ? null : player);
                        }}
                        style={{
                          borderLeftColor: isSelected
                            ? "#f97316"
                            : player.secondaryColor,
                        }}
                        className={`flex items-start gap-3 rounded-md border border-l-[3px] p-2.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "border-[#f97316] bg-[#241911]"
                            : primaryResonance
                              ? "border-[#d4a24c]/55 bg-[#1b1812] hover:border-[#f97316]"
                              : "border-white/12 bg-[#151614] hover:border-white/30"
                        }`}
                      >
                        <JerseyAvatar
                          number={player.number}
                          primaryColor={player.primaryColor}
                          secondaryColor={player.secondaryColor}
                          position={player.position}
                          tier={player.tier}
                          blind={blind}
                          size="md"
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-[#ebe5d8]">
                              {player.name}
                            </p>
                            {!blind && (
                              <span
                                className={`font-mono-tabular shrink-0 text-sm font-bold ${
                                  player.ovr >= 92
                                    ? "text-[#fb923c]"
                                    : player.ovr >= 86
                                      ? "text-[#d4a24c]"
                                      : "text-[#cfc8ba]"
                                }`}
                              >
                                {player.ovr}
                              </span>
                            )}
                          </div>

                          {!blind ? (
                            <>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="font-mono-tabular font-semibold text-[#cfc8ba]">
                                  {player.position}
                                </span>
                                <span className="text-[#9c9689]">
                                  {POSITION_LABELS[player.position]}
                                </span>
                                {!hasExactOpenSlot && (
                                  <span className="font-mono-tabular text-[10px] text-amber-300">
                                    (Flex)
                                  </span>
                                )}
                              </div>
                              <div className="font-mono-tabular flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[#9c9689]">
                                <span>ATK {player.stats.attack}</span>
                                <span>DEF {player.stats.defense}</span>
                                <span>SRV {player.stats.serve}</span>
                                <span>BRN {player.stats.brain}</span>
                                <span>SPD {player.stats.speed}</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-[11px] text-[#9c9689]">
                              Posisi & OVR tersembunyi
                            </p>
                          )}

                          {primaryResonance && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-[#fb923c]">
                              <Sparkles className="h-3 w-3 shrink-0 text-[#d4a24c]" />
                              <span className="truncate">
                                {primaryResonance.name} (+{primaryResonance.ovrBonus})
                              </span>
                              {resonances.length > 1 && (
                                <span className="font-mono-tabular shrink-0 text-[10px] text-[#d4a24c]">
                                  +{resonances.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Formation Tracker + Synergy & Stat Breakdown */}
            <div className="space-y-3 border-t border-white/10 pt-3">
              {/* Live Formation Progress */}
              {activeFormation && (
                <div className="rounded-md border border-white/10 bg-[#151614] px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#ebe5d8]">
                      Taktik: {activeFormation.name}
                    </span>
                    <span
                      className={`font-mono-tabular font-bold ${
                        formationStatus.bonus > 0 ? "text-emerald-400" : "text-[#9c9689]"
                      }`}
                    >
                      {formationStatus.bonus > 0
                        ? `+${formationStatus.bonus.toFixed(1)} OVR Aktif`
                        : "Belum aktif"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {formationStatus.checks.map((chk) => (
                      <span
                        key={chk.label}
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          chk.met ? "text-emerald-400" : "text-[#8a8478]"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                        {chk.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.activeSynergies.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#ebe5d8]">
                      Resonansi Aktif
                    </span>
                    <span className="font-mono-tabular font-semibold text-[#fb923c]">
                      +{evaluation.synergyBonus.toFixed(1)} OVR
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.activeSynergies.map((syn) => (
                      <span
                        key={syn.id}
                        title={syn.description}
                        className="inline-flex items-center gap-1 rounded-md border border-[#f97316]/35 bg-[#1e1711] px-2 py-1 text-[11px] text-[#ebe5d8]"
                      >
                        <Sparkles className="h-3 w-3 text-[#f97316]" />
                        {syn.name}
                        <span className="font-mono-tabular font-bold text-emerald-400">
                          +{syn.ovrBonus}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6b665d]">
                  Pasangkan duet ikonik atau pemain Karasuno untuk memicu resonansi OVR.
                </p>
              )}

              {evaluation.totalOvr > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9c9689]">
                    <span>
                      Base{" "}
                      <strong className="font-mono-tabular text-[#ebe5d8]">
                        {evaluation.baseOvr.toFixed(1)}
                      </strong>
                    </span>
                    <span>
                      Penalti{" "}
                      <strong
                        className={`font-mono-tabular ${
                          evaluation.fitPenaltyTotal > 0
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }`}
                      >
                        -{evaluation.fitPenaltyTotal.toFixed(1)}
                      </strong>
                    </span>
                    <span>
                      Resonansi{" "}
                      <strong className="font-mono-tabular text-[#fb923c]">
                        +{evaluation.synergyBonus.toFixed(1)}
                      </strong>
                    </span>
                    <span>
                      Taktik{" "}
                      <strong className="font-mono-tabular text-[#d4a24c]">
                        +{evaluation.formationBonus.toFixed(1)}
                      </strong>
                    </span>
                  </div>

                  {/* Team Average Stat Strip */}
                  <div className="font-mono-tabular flex flex-wrap items-center gap-2 text-[10px] text-[#9c9689]">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      ATK <strong className="text-[#ebe5d8]">{evaluation.stats.attack}</strong>
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      DEF <strong className="text-[#ebe5d8]">{evaluation.stats.defense}</strong>
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      SRV <strong className="text-[#ebe5d8]">{evaluation.stats.serve}</strong>
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      BRN <strong className="text-[#ebe5d8]">{evaluation.stats.brain}</strong>
                    </span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      SPD <strong className="text-[#ebe5d8]">{evaluation.stats.speed}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Haruko Center Court */}
          <div>
            <VolleyballCourt
              lineup={lineup}
              evaluation={evaluation}
              selectedPlayer={selectedPlayer}
              blindMode={mode === "blind"}
              onPlaceInSlot={handlePlaceInSlot}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  RENDER: TOURNAMENT (Gym Flip-Scoreboard)                                */
  /* ------------------------------------------------------------------------ */
  if (phase === "TOURNAMENT") {
    const activeOpponent = HARUKO_BRACKET[matchIndex]!;
    const matchupEdge = computeMatchupEdge(evaluation, activeOpponent);
    const displayedKarasunoSets = currentMatchResult
      ? currentMatchResult.karasunoSets
      : liveMatch
        ? liveMatch.karasunoSets
        : 0;
    const displayedOpponentSets = currentMatchResult
      ? currentMatchResult.opponentSets
      : liveMatch
        ? liveMatch.opponentSets
        : 0;
    const displayedSets = currentMatchResult
      ? currentMatchResult.sets
      : liveMatch
        ? liveMatch.sets
        : [];

    return (
      <div className="mx-auto max-w-4xl px-3.5 py-5 sm:px-5 sm:py-7">
        {/* 10-Match Bracket Stepper */}
        <div className="mb-5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {HARUKO_BRACKET.map((opp, idx) => {
            const done = matchHistory[idx];
            const isCurrent = idx === matchIndex;
            return (
              <div
                key={opp.roundIndex}
                className={`border-b-2 px-2 py-2 text-center text-[11px] ${
                  done
                    ? done.won
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-400 bg-rose-500/10 text-rose-300"
                    : isCurrent
                      ? "border-[#f97316] bg-[#1e1813] text-[#ebe5d8]"
                      : "border-white/10 bg-[#151614] text-[#6b665d]"
                }`}
              >
                <p className="truncate font-semibold">
                  <span className="font-mono-tabular mr-1 opacity-65">
                    {idx + 1}.
                  </span>
                  {opp.shortName}
                </p>
              </div>
            );
          })}
        </div>

        {/* Flip Scoreboard */}
        <div className="rounded-lg border border-white/15 bg-[#151614] p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h2 className="font-display text-xl text-[#ebe5d8] sm:text-2xl">
                {activeOpponent.stageName}
              </h2>
              <p className="text-xs text-[#9c9689]">{activeOpponent.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono-tabular rounded bg-white/6 px-2 py-0.5 text-[11px] font-semibold text-[#cfc8ba]">
                {activeOpponent.playstyleTag}
              </span>
              <span className="font-mono-tabular text-xs font-semibold text-[#d4a24c]">
                Best of {activeOpponent.bestOf}
              </span>
            </div>
          </div>

          {/* Physical Flip-Tile Scoreboard + Rival Head-to-Head */}
          {(() => {
            const karasunoAce = [...Object.values(lineup)]
              .filter((p): p is HaikyuuPlayer => Boolean(p))
              .sort((a, b) => b.ovr - a.ovr)[0];

            return (
              <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {karasunoAce && (
                      <JerseyAvatar
                        number={karasunoAce.number}
                        primaryColor={karasunoAce.primaryColor}
                        secondaryColor={karasunoAce.secondaryColor}
                        position={karasunoAce.position}
                        tier={karasunoAce.tier}
                        size="sm"
                      />
                    )}
                    <div className="text-left">
                      <p className="text-xs font-bold tracking-wider text-[#f97316]">
                        KARASUNO
                      </p>
                      {karasunoAce && (
                        <p className="max-w-[110px] truncate text-[11px] text-[#9c9689]">
                          {karasunoAce.name.split(" ").slice(-1)[0]}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative mx-auto mt-2.5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-[#0e0f0e] shadow-inner sm:h-24 sm:w-24">
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-black/70" />
                    <m.span
                      key={`k-${matchIndex}-${displayedKarasunoSets}`}
                      initial={{ y: -14, opacity: 0.35, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      className="font-mono-tabular text-4xl font-extrabold text-[#ebe5d8] sm:text-5xl"
                    >
                      {displayedKarasunoSets}
                    </m.span>
                  </div>
                  <p className="font-mono-tabular mt-2 text-xs text-[#9c9689]">
                    OVR {evaluation.totalOvr.toFixed(1)}
                  </p>
                </div>

                <div className="font-mono-tabular text-lg font-bold text-[#6b665d]">
                  :
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-right">
                      <p
                        className="text-xs font-bold tracking-wider"
                        style={{
                          color:
                            activeOpponent.secondaryColor === "#18181b"
                              ? "#f87171"
                              : activeOpponent.secondaryColor,
                        }}
                      >
                        {activeOpponent.shortName}
                      </p>
                      <p className="max-w-[110px] truncate text-[11px] text-[#9c9689]">
                        {activeOpponent.starPlayer}
                      </p>
                    </div>
                    <JerseyAvatar
                      number={activeOpponent.starNumber}
                      primaryColor={activeOpponent.primaryColor}
                      secondaryColor={activeOpponent.secondaryColor}
                      position={activeOpponent.starPosition}
                      tier="SSR"
                      size="sm"
                    />
                  </div>
                  <div className="relative mx-auto mt-2.5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-[#0e0f0e] shadow-inner sm:h-24 sm:w-24">
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-black/70" />
                    <m.span
                      key={`o-${matchIndex}-${displayedOpponentSets}`}
                      initial={{ y: -14, opacity: 0.35, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                      className="font-mono-tabular text-4xl font-extrabold text-[#ebe5d8] sm:text-5xl"
                    >
                      {displayedOpponentSets}
                    </m.span>
                  </div>
                  <p className="font-mono-tabular mt-2 text-xs text-[#9c9689]">
                    OVR {activeOpponent.ovr.toFixed(1)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Matchup Scouting Bar */}
          <div className="mb-4 rounded-md border border-white/10 bg-[#111210] px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[#9c9689]">
                Bintang lawan:{" "}
                <strong className="text-[#ebe5d8]">{activeOpponent.starPlayer}</strong>
              </span>
              <span
                className={`font-mono-tabular font-bold ${
                  matchupEdge.deltaOvr >= 0.4
                    ? "text-emerald-400"
                    : matchupEdge.deltaOvr <= -0.4
                      ? "text-rose-400"
                      : "text-[#d4a24c]"
                }`}
              >
                {matchupEdge.advantageLabel} (
                {matchupEdge.deltaOvr >= 0 ? "+" : ""}
                {matchupEdge.deltaOvr.toFixed(1)} OVR)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#8a8478]">
              {activeOpponent.tacticalHint} • {matchupEdge.detail}
            </p>
          </div>

          {/* Played Sets Ledger (Live or Final) */}
          {displayedSets.length > 0 && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              {currentMatchResult && (
                <p
                  className={`text-sm font-semibold ${
                    currentMatchResult.won ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {currentMatchResult.won
                    ? `Menang ${currentMatchResult.karasunoSets}-${currentMatchResult.opponentSets} • MVP: ${currentMatchResult.mvpName}`
                    : `Kalah ${currentMatchResult.karasunoSets}-${currentMatchResult.opponentSets} dari ${activeOpponent.schoolName}`}
                </p>
              )}

              <div className="divide-y divide-white/8 border border-white/10 bg-[#111210]">
                {displayedSets.map((s) => {
                  const kWon = s.karasuno > s.opponent;
                  return (
                    <div
                      key={s.setNumber}
                      className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="font-mono-tabular text-xs text-[#9c9689]">
                          Set {s.setNumber}
                        </span>
                        <span
                          className={`font-mono-tabular text-sm font-bold ${
                            kWon ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {s.karasuno} - {s.opponent}
                        </span>
                      </div>
                      <p className="text-xs text-[#cfc8ba]">{s.highlight}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
            {!currentMatchResult ? (
              <>
                <button
                  type="button"
                  onClick={simulateRemainingMatches}
                  className="min-h-[42px] rounded-md border border-white/12 px-4 py-2 text-xs font-medium text-[#cfc8ba] hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Simulasi Semua Babak
                </button>
                <button
                  type="button"
                  onClick={playCurrentMatchSet}
                  className="min-h-[44px] flex-1 rounded-md bg-[#f97316] px-6 py-2.5 text-sm font-bold text-[#111210] hover:bg-[#fb923c] transition-colors cursor-pointer sm:flex-initial"
                >
                  {liveMatch
                    ? `Mainkan Set ${liveMatch.sets.length + 1}`
                    : "Mulai Pertandingan (Set 1)"}
                </button>
              </>
            ) : (
              <>
                {currentMatchResult.won &&
                  matchIndex < HARUKO_BRACKET.length - 1 && (
                    <button
                      type="button"
                      onClick={simulateRemainingMatches}
                      className="min-h-[42px] rounded-md border border-white/12 px-4 py-2 text-xs font-medium text-[#cfc8ba] hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Simulasi Sisa Babak
                    </button>
                  )}
                <button
                  type="button"
                  onClick={advanceTournament}
                  className="ml-auto min-h-[44px] rounded-md bg-[#d4a24c] px-6 py-2.5 text-sm font-bold text-[#111210] hover:bg-[#e1b361] transition-colors cursor-pointer"
                >
                  {!currentMatchResult.won ||
                  matchIndex === HARUKO_BRACKET.length - 1
                    ? "Lihat Rekap Akhir"
                    : "Babak Berikutnya"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /*  RENDER: SUMMARY (Matchday Front-Page Recap)                             */
  /* ------------------------------------------------------------------------ */
  return (
    <div className="mx-auto max-w-5xl px-3.5 py-5 sm:px-5 sm:py-8">
      <div className="space-y-6">
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border-b-2 pb-6 ${
            champion ? "border-[#f97316]" : "border-white/15"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                {champion ? (
                  <Trophy className="h-6 w-6 text-[#f97316]" />
                ) : (
                  <Shield className="h-6 w-6 text-[#9c9689]" />
                )}
                <h2 className="font-display text-3xl text-[#ebe5d8] sm:text-4xl">
                  {champion
                    ? "Karasuno Juara Nasional"
                    : `Terhenti di ${eliminatedMatch?.opponent.stageName ?? "Haruko"}`}
                </h2>
              </div>

              {perfectRun ? (
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d4a24c]">
                  <Award className="h-4 w-4" />
                  Juara Sempurna — 0 Set Kalah sepanjang turnamen!
                </p>
              ) : (
                <p className="text-sm text-[#9c9689]">
                  {champion
                    ? "Gagak Karasuno menaklukkan Center Court Tokyo."
                    : "Atur ulang komposisi posisi & resonansi untuk menembus final."}
                </p>
              )}
            </div>

            {/* Box Score */}
            <div className="flex items-center divide-x divide-white/12 border border-white/12 bg-[#151614]">
              <div className="px-4 py-2 text-center">
                <span className="block text-[10px] text-[#9c9689]">Team OVR</span>
                <span className="font-mono-tabular text-lg font-bold text-[#f97316]">
                  {evaluation.totalOvr.toFixed(1)}
                </span>
              </div>
              <div className="px-4 py-2 text-center">
                <span className="block text-[10px] text-[#9c9689]">Match</span>
                <span className="font-mono-tabular text-lg font-bold text-[#ebe5d8]">
                  {matchHistory.filter((m) => m.won).length}-
                  {matchHistory.filter((m) => !m.won).length}
                </span>
              </div>
              <div className="px-4 py-2 text-center">
                <span className="block text-[10px] text-[#9c9689]">Set</span>
                <span className="font-mono-tabular text-lg font-bold text-emerald-400">
                  {totalSetsWon}-{totalSetsLost}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-emerald-400">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span className="font-mono-tabular font-semibold">
              Verified Run: {verificationCode}
            </span>
            {runType === "daily" && (
              <span className="rounded bg-[#d4a24c]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#d4a24c]">
                DAILY {dailyKey}
              </span>
            )}
            <span className="text-[#9c9689]">
              • {formatRunTimestamp(completedAt)}
            </span>
          </div>

          {newlyUnlockedBadges.length > 0 && (
            <div className="mt-4 rounded-md border border-[#d4a24c]/45 bg-[#1b170f] px-3.5 py-2.5">
              <p className="text-[11px] font-bold tracking-wider text-[#d4a24c]">
                LENCANA BARU TERBUKA!
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {newlyUnlockedBadges.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded border border-[#d4a24c]/35 bg-black/25 px-2.5 py-1 text-xs font-semibold text-[#ebe5d8]"
                  >
                    <Award className="h-3.5 w-3.5 text-[#d4a24c]" />
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[42px] items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-xs font-bold text-[#0b140f] hover:bg-[#34e073] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Kirim ke WhatsApp
            </a>

            <button
              type="button"
              onClick={copySummaryText}
              className="flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 bg-[#171815] px-4 py-2 text-xs font-semibold text-[#ebe5d8] hover:bg-[#22241f] transition-colors cursor-pointer"
            >
              {copiedShare ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Teks Tersalin
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-[#d4a24c]" />
                  Salin Teks WA
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => downloadVerifiedResultCard(shareParams, verificationCode)}
              className="flex min-h-[42px] items-center gap-2 rounded-md border border-white/15 bg-[#171815] px-4 py-2 text-xs font-semibold text-[#ebe5d8] hover:bg-[#22241f] transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#fb923c]" />
              Simpan Kartu PNG
            </button>

            <button
              type="button"
              onClick={() => setPhase("SETUP")}
              className="ml-auto flex min-h-[42px] items-center gap-2 rounded-md bg-[#f97316] px-5 py-2 text-sm font-bold text-[#111210] hover:bg-[#fb923c] transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Draft Lagi
            </button>
          </div>
        </m.div>

        {/* Court & Match Ledger */}
        <div className="grid gap-5 lg:grid-cols-2">
          <VolleyballCourt
            lineup={lineup}
            evaluation={evaluation}
            selectedPlayer={null}
            interactive={false}
          />

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#ebe5d8]">
              Catatan Pertandingan Haruko
            </h3>
            <div className="divide-y divide-white/8 border border-white/12 bg-[#151614]">
              {matchHistory.map((mResult) => (
                <div key={mResult.opponent.roundIndex} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-[#9c9689]">
                        {mResult.opponent.stageName}
                      </p>
                      <p className="text-sm font-semibold text-[#ebe5d8]">
                        vs {mResult.opponent.schoolName}
                      </p>
                    </div>
                    <span
                      className={`font-mono-tabular text-xs font-bold ${
                        mResult.won ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {mResult.won ? "MENANG" : "KALAH"} {mResult.karasunoSets}-
                      {mResult.opponentSets}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-[#9c9689]">
                    {mResult.sets.map((s) => (
                      <span key={s.setNumber} className="font-mono-tabular">
                        S{s.setNumber} {s.karasuno}-{s.opponent}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
