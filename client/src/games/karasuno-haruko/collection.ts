import {
  HARUKO_BRACKET,
  type HaikyuuDraftMode,
  type LineupMap,
  type TeamEvaluation,
  type TournamentMatchResult,
} from "@arcade-hub/shared";

const COLLECTION_KEY = "arcade-hub:haikyuu-haruko-collection";

export interface HaikyuuBadgeMeta {
  id: string;
  name: string;
  description: string;
}

export const HAIKYUU_BADGES: readonly HaikyuuBadgeMeta[] = [
  {
    id: "first-title",
    name: "Juara Nasional Haruko",
    description: "Tumbangkan Itachiyama di Final Kejuaraan Musim Semi.",
  },
  {
    id: "perfect-haruko",
    name: "Dominasi Tanpa Celah",
    description: "Juara Haruko tanpa kehilangan satu set pun (0 set kalah).",
  },
  {
    id: "blind-master",
    name: "Insting Pelatih Blind",
    description: "Raih gelar juara nasional di Mode Blind (Expert).",
  },
  {
    id: "karasuno-core",
    name: "Gagak Karasuno Sejati",
    description: "Juara Haruko dengan minimal 4 pemain asli Karasuno.",
  },
  {
    id: "synergy-architect",
    name: "Arsitek Resonansi",
    description: "Aktifkan minimal 4 resonansi berbeda dalam satu lineup.",
  },
  {
    id: "daily-champion",
    name: "Penakluk Daily Draft",
    description: "Menangkan trofi Haruko pada mode Daily Challenge.",
  },
  {
    id: "comeback-king",
    name: "Raja Set Penentuan",
    description: "Menangkan duel Best of 5 lewat Set 5 yang menentukan.",
  },
  {
    id: "dream-team",
    name: "Skuad 95+ OVR",
    description: "Rakit komposisi tim dengan Total OVR mencapai 95.0 atau lebih.",
  },
] as const;

export interface DailyChallengeRecord {
  dateKey: string;
  bestOvr: number;
  wins: number;
  champion: boolean;
}

export interface KarasunoCollection {
  unlockedPlayerIds: string[];
  unlockedSynergyIds: string[];
  unlockedBadgeIds: string[];
  dailyRecord: DailyChallengeRecord | null;
}

const EMPTY_COLLECTION: KarasunoCollection = {
  unlockedPlayerIds: [],
  unlockedSynergyIds: [],
  unlockedBadgeIds: [],
  dailyRecord: null,
};

export function loadKarasunoCollection(): KarasunoCollection {
  try {
    const raw = localStorage.getItem(COLLECTION_KEY);
    if (!raw) return EMPTY_COLLECTION;
    const parsed = JSON.parse(raw) as Partial<KarasunoCollection>;
    return {
      unlockedPlayerIds: Array.isArray(parsed.unlockedPlayerIds)
        ? parsed.unlockedPlayerIds.filter((x): x is string => typeof x === "string")
        : [],
      unlockedSynergyIds: Array.isArray(parsed.unlockedSynergyIds)
        ? parsed.unlockedSynergyIds.filter((x): x is string => typeof x === "string")
        : [],
      unlockedBadgeIds: Array.isArray(parsed.unlockedBadgeIds)
        ? parsed.unlockedBadgeIds.filter((x): x is string => typeof x === "string")
        : [],
      dailyRecord:
        parsed.dailyRecord && typeof parsed.dailyRecord.dateKey === "string"
          ? parsed.dailyRecord
          : null,
    };
  } catch {
    return EMPTY_COLLECTION;
  }
}

export function saveKarasunoCollection(collection: KarasunoCollection): void {
  try {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
  } catch {
    // ignore storage errors
  }
}

export interface RecordRunCollectionInput {
  lineup: LineupMap;
  evaluation: TeamEvaluation;
  matchHistory: TournamentMatchResult[];
  mode: HaikyuuDraftMode;
  dailyKey: string | null;
}

export function recordRunToCollection(
  prev: KarasunoCollection,
  input: RecordRunCollectionInput
): { updated: KarasunoCollection; newlyUnlockedBadges: HaikyuuBadgeMeta[] } {
  const { lineup, evaluation, matchHistory, mode, dailyKey } = input;
  const playerSet = new Set(prev.unlockedPlayerIds);
  for (const p of Object.values(lineup)) {
    if (p) playerSet.add(p.id);
  }

  const synergySet = new Set(prev.unlockedSynergyIds);
  for (const syn of evaluation.activeSynergies) {
    synergySet.add(syn.id);
  }

  const champion =
    matchHistory.length === HARUKO_BRACKET.length &&
    matchHistory.every((m) => m.won);
  const setsLost = matchHistory.reduce((acc, m) => acc + m.opponentSets, 0);
  const wins = matchHistory.filter((m) => m.won).length;
  const hasFiveSetWin = matchHistory.some(
    (m) => m.won && m.karasunoSets === 3 && m.opponentSets === 2
  );

  const earnedIds: string[] = [];
  if (champion) earnedIds.push("first-title");
  if (champion && setsLost === 0) earnedIds.push("perfect-haruko");
  if (champion && mode === "blind") earnedIds.push("blind-master");
  if (champion && evaluation.karasunoCount >= 4) earnedIds.push("karasuno-core");
  if (evaluation.activeSynergies.length >= 4) earnedIds.push("synergy-architect");
  if (champion && Boolean(dailyKey)) earnedIds.push("daily-champion");
  if (hasFiveSetWin) earnedIds.push("comeback-king");
  if (evaluation.totalOvr >= 95.0) earnedIds.push("dream-team");

  const badgeSet = new Set(prev.unlockedBadgeIds);
  const newlyUnlockedIds = earnedIds.filter((id) => !badgeSet.has(id));
  for (const id of earnedIds) badgeSet.add(id);

  let dailyRecord = prev.dailyRecord;
  if (dailyKey) {
    const prevSameDay = dailyRecord?.dateKey === dailyKey ? dailyRecord : null;
    dailyRecord = {
      dateKey: dailyKey,
      bestOvr: Math.max(prevSameDay?.bestOvr ?? 0, evaluation.totalOvr),
      wins: Math.max(prevSameDay?.wins ?? 0, wins),
      champion: Boolean(prevSameDay?.champion || champion),
    };
  }

  const updated: KarasunoCollection = {
    unlockedPlayerIds: Array.from(playerSet),
    unlockedSynergyIds: Array.from(synergySet),
    unlockedBadgeIds: Array.from(badgeSet),
    dailyRecord,
  };
  saveKarasunoCollection(updated);

  const newlyUnlockedBadges = HAIKYUU_BADGES.filter((b) =>
    newlyUnlockedIds.includes(b.id)
  );
  return { updated, newlyUnlockedBadges };
}
