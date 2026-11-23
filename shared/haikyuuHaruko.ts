export type VolleyPosition = "S" | "OP" | "OH" | "MB" | "L";

export type CourtSlotId = "OH1" | "MB1" | "OP" | "S" | "MB2" | "OH2" | "L";

export type FormationId = "run-gun" | "total-defense" | "cannon-ace" | "all-out-sync";

export type HaikyuuDraftMode = "classic" | "blind";

export type PlayerTier = "SSR" | "SR" | "R" | "N";

export type FitQuality = "PERFECT" | "FLEX" | "OUT";

export interface CourtSlotMeta {
  id: CourtSlotId;
  label: string;
  shortLabel: string;
  row: "FRONT" | "BACK" | "LIBERO";
  expectedPosition: VolleyPosition;
  description: string;
}

export const COURT_SLOTS: readonly CourtSlotMeta[] = [
  {
    id: "OH1",
    label: "Outside Hitter 1",
    shortLabel: "OH1",
    row: "FRONT",
    expectedPosition: "OH",
    description: "Sayap kiri depan • Tembakan cross & terima serve",
  },
  {
    id: "MB1",
    label: "Middle Blocker 1",
    shortLabel: "MB1",
    row: "FRONT",
    expectedPosition: "MB",
    description: "Tembok tengah depan • Quick attack & read block",
  },
  {
    id: "OP",
    label: "Opposite Hitter",
    shortLabel: "OP",
    row: "FRONT",
    expectedPosition: "OP",
    description: "Sayap kanan • Meriam utama & stabilitas pertahanan",
  },
  {
    id: "OH2",
    label: "Outside Hitter 2",
    shortLabel: "OH2",
    row: "BACK",
    expectedPosition: "OH",
    description: "Sayap belakang • Back-row pipe & receive solid",
  },
  {
    id: "MB2",
    label: "Middle Blocker 2",
    shortLabel: "MB2",
    row: "BACK",
    expectedPosition: "MB",
    description: "Blocker rotasi 2 • Penutup celah & decoy",
  },
  {
    id: "S",
    label: "Setter",
    shortLabel: "S",
    row: "BACK",
    expectedPosition: "S",
    description: "Otak serangan • Pengatur tempo & dump shot",
  },
  {
    id: "L",
    label: "Libero",
    shortLabel: "L",
    row: "LIBERO",
    expectedPosition: "L",
    description: "Dewa penjaga lantai • Dig keras & floor defense",
  },
] as const;

export const POSITION_LABELS: Record<VolleyPosition, string> = {
  S: "Setter",
  OP: "Opposite",
  OH: "Outside Hitter",
  MB: "Middle Blocker",
  L: "Libero",
};

export interface FormationMeta {
  id: FormationId;
  name: string;
  styleTag: string;
  tagline: string;
  bonusDetail: string;
}

export const KARASUNO_FORMATIONS: readonly FormationMeta[] = [
  {
    id: "run-gun",
    name: "Serangan Cepat Total",
    styleTag: "TEMPO KILAT",
    tagline: "Tempo gila ala Gagak Karasuno yang membuat blocker kewalahan.",
    bonusDetail: "+1.8 OVR jika Setter (Speed >= 87) & MB (Speed >= 88) aktif",
  },
  {
    id: "total-defense",
    name: "Tembok & Lantai Baja",
    styleTag: "PERTAHANAN TOTAL",
    tagline: "Pantang membiarkan bola menyentuh lantai sebelum serangan balik.",
    bonusDetail: "+1.8 OVR jika Libero OVR >= 88 & rata-rata Defense >= 85",
  },
  {
    id: "cannon-ace",
    name: "Tumpuan Ace Mutlak",
    styleTag: "MERIAM ACE",
    tagline: "Umpan tinggi penuh keyakinan untuk ditembakkan oleh Ace utama.",
    bonusDetail: "+1.8 OVR jika ada Spiker (OH/OP) dengan OVR >= 92",
  },
  {
    id: "all-out-sync",
    name: "Sinkronisasi Gagak",
    styleTag: "SERANGAN 5 ORANG",
    tagline: "Semua pemain bergerak menyerang serentak dari berbagai sudut.",
    bonusDetail: "+0.6 OVR per sinergi aktif (maks +2.0 OVR)",
  },
] as const;

export interface SchoolPack {
  id: string;
  name: string;
  eraLabel: string;
  shortName: string;
  prefecture: string;
  motto: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  weight: number;
}

export const SCHOOL_PACKS: readonly SchoolPack[] = [
  {
    id: "karasuno-spring",
    name: "Karasuno High",
    eraLabel: "Kejuaraan Musim Semi",
    shortName: "KARASUNO",
    prefecture: "Miyagi",
    motto: "Terbanglah!",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    accentColor: "#fb923c",
    weight: 1.35,
  },
  {
    id: "karasuno-qualifiers",
    name: "Karasuno High",
    eraLabel: "Kualifikasi Prefektur",
    shortName: "KARASUNO",
    prefecture: "Miyagi",
    motto: "Gagak Tanpa Sayap Terbang Kembali",
    primaryColor: "#27272a",
    secondaryColor: "#ea580c",
    accentColor: "#fdba74",
    weight: 1.25,
  },
  {
    id: "aoba-johsai",
    name: "Aoba Johsai High",
    eraLabel: "Kastil Terkuat Miyagi",
    shortName: "SEIJOH",
    prefecture: "Miyagi",
    motto: "Kuasai Lapangan",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    accentColor: "#5eead4",
    weight: 1.0,
  },
  {
    id: "nekoma",
    name: "Nekoma High",
    eraLabel: "Pertarungan Tempat Sampah",
    shortName: "NEKOMA",
    prefecture: "Tokyo",
    motto: "Jadilah Darah yang Mengalirkan Oksigen",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    accentColor: "#f87171",
    weight: 1.0,
  },
  {
    id: "shiratorizawa",
    name: "Shiratorizawa Academy",
    eraLabel: "Raja Absolut Miyagi",
    shortName: "SHIRATORI",
    prefecture: "Miyagi",
    motto: "Kekuatan yang Tak Terbantahkan",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    accentColor: "#c084fc",
    weight: 0.9,
  },
  {
    id: "fukurodani",
    name: "Fukurodani Academy",
    eraLabel: "Top 4 Tokyo",
    shortName: "FUKURO",
    prefecture: "Tokyo",
    motto: "Satu Bola dengan Jiwa Penuh",
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    accentColor: "#fde047",
    weight: 0.95,
  },
  {
    id: "inarizaki",
    name: "Inarizaki High",
    eraLabel: "Runner-up Interhigh",
    shortName: "INARIZAKI",
    prefecture: "Hyogo",
    motto: "Tak Butuh Kenangan",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    accentColor: "#fb7185",
    weight: 0.9,
  },
  {
    id: "date-tech",
    name: "Date Tech High",
    eraLabel: "Tembok Besi Baru",
    shortName: "DATE TECH",
    prefecture: "Miyagi",
    motto: "Tembok Besi Date",
    primaryColor: "#f8fafc",
    secondaryColor: "#0f766e",
    accentColor: "#2dd4bf",
    weight: 0.95,
  },
  {
    id: "kamomedai",
    name: "Kamomedai High",
    eraLabel: "Langit & Tembok Nagano",
    shortName: "KAMOMEDAI",
    prefecture: "Nagano",
    motto: "Kebiasaan Adalah Sifat Kedua",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    accentColor: "#38bdf8",
    weight: 0.85,
  },
  {
    id: "itachiyama",
    name: "Itachiyama Institute",
    eraLabel: "Juara Bertahan Nasional",
    shortName: "ITACHIYAMA",
    prefecture: "Tokyo",
    motto: "Standar Juara Jepang",
    primaryColor: "#14532d",
    secondaryColor: "#a3e635",
    accentColor: "#bef264",
    weight: 0.72,
  },
  {
    id: "mujinazaka",
    name: "Mujinazaka High",
    eraLabel: "Unggulan 8 Besar",
    shortName: "MUJINAZAKA",
    prefecture: "Oita",
    motto: "Tegar Menopang Langit",
    primaryColor: "#334155",
    secondaryColor: "#f59e0b",
    accentColor: "#fbbf24",
    weight: 0.85,
  },
  {
    id: "johzenji",
    name: "Johzenji High",
    eraLabel: "Kuda Hitam Miyagi",
    shortName: "JOHZENJI",
    prefecture: "Miyagi",
    motto: "Kesederhanaan & Bermain Bebas",
    primaryColor: "#eab308",
    secondaryColor: "#27272a",
    accentColor: "#fef08a",
    weight: 0.75,
  },
  {
    id: "nohebi",
    name: "Nohebi Academy",
    eraLabel: "Taktik Licik Tokyo",
    shortName: "NOHEBI",
    prefecture: "Tokyo",
    motto: "Kemenangan Tanpa Celah",
    primaryColor: "#14532d",
    secondaryColor: "#18181b",
    accentColor: "#4ade80",
    weight: 0.75,
  },
  {
    id: "challengers",
    name: "Wakutani & Tsubakihara",
    eraLabel: "Para Penantang Tangguh",
    shortName: "CHALLENGER",
    prefecture: "Miyagi / Kanagawa",
    motto: "Keajaiban Raksasa Kecil",
    primaryColor: "#1e3a8a",
    secondaryColor: "#e2e8f0",
    accentColor: "#93c5fd",
    weight: 0.8,
  },
] as const;

export interface HaikyuuPlayerStats {
  attack: number;
  defense: number;
  serve: number;
  brain: number;
  speed: number;
}

export interface HaikyuuPlayer {
  id: string;
  name: string;
  schoolPackIds: string[];
  schoolLabel: string;
  primaryColor: string;
  secondaryColor: string;
  number: number;
  position: VolleyPosition;
  ovr: number;
  tier: PlayerTier;
  roleTitle: string;
  stats: HaikyuuPlayerStats;
  tags: string[];
  versatileSetter?: boolean;
}

export const HAIKYUU_PLAYERS: readonly HaikyuuPlayer[] = [
  // KARASUNO
  {
    id: "kageyama",
    name: "Tobio Kageyama",
    schoolPackIds: ["karasuno-spring", "karasuno-qualifiers"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 9,
    position: "S",
    ovr: 95,
    tier: "SSR",
    roleTitle: "Raja Lapangan",
    stats: { attack: 86, defense: 83, serve: 94, brain: 93, speed: 95 },
    tags: ["karasuno", "jump-serve", "freak-quick"],
  },
  {
    id: "hinata",
    name: "Shoyo Hinata",
    schoolPackIds: ["karasuno-spring", "karasuno-qualifiers"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 10,
    position: "MB",
    ovr: 89,
    tier: "SR",
    roleTitle: "Umpan Terkuat",
    stats: { attack: 91, defense: 81, serve: 76, brain: 82, speed: 99 },
    tags: ["karasuno", "decoy", "freak-quick", "little-giant"],
  },
  {
    id: "nishinoya",
    name: "Yu Nishinoya",
    schoolPackIds: ["karasuno-spring", "karasuno-qualifiers"],
    schoolLabel: "Karasuno",
    primaryColor: "#f97316",
    secondaryColor: "#18181b",
    number: 4,
    position: "L",
    ovr: 93,
    tier: "SSR",
    roleTitle: "Dewa Penjaga",
    stats: { attack: 62, defense: 97, serve: 60, brain: 86, speed: 95 },
    tags: ["karasuno", "guardian"],
  },
  {
    id: "asahi",
    name: "Asahi Azumane",
    schoolPackIds: ["karasuno-qualifiers", "karasuno-spring"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 3,
    position: "OH",
    ovr: 89,
    tier: "SR",
    roleTitle: "Ace Karasuno",
    stats: { attack: 93, defense: 80, serve: 90, brain: 81, speed: 83 },
    tags: ["karasuno", "ace", "jump-serve"],
  },
  {
    id: "tsukishima",
    name: "Kei Tsukishima",
    schoolPackIds: ["karasuno-spring", "karasuno-qualifiers"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 11,
    position: "MB",
    ovr: 89,
    tier: "SR",
    roleTitle: "Read Blocker Cerdas",
    stats: { attack: 83, defense: 92, serve: 80, brain: 95, speed: 80 },
    tags: ["karasuno", "read-block", "brain"],
  },
  {
    id: "tanaka",
    name: "Ryunosuke Tanaka",
    schoolPackIds: ["karasuno-spring", "karasuno-qualifiers"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 5,
    position: "OH",
    ovr: 86,
    tier: "SR",
    roleTitle: "Ultra-Sharp Cross",
    stats: { attack: 90, defense: 81, serve: 82, brain: 79, speed: 86 },
    tags: ["karasuno", "clutch"],
  },
  {
    id: "daichi",
    name: "Daichi Sawamura",
    schoolPackIds: ["karasuno-qualifiers", "karasuno-spring"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 1,
    position: "OP",
    ovr: 86,
    tier: "SR",
    roleTitle: "Kapten Pondasi Tim",
    stats: { attack: 82, defense: 92, serve: 81, brain: 89, speed: 84 },
    tags: ["karasuno", "captain", "receive"],
  },
  {
    id: "sugawara",
    name: "Koshi Sugawara",
    schoolPackIds: ["karasuno-qualifiers"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 2,
    position: "S",
    ovr: 81,
    tier: "R",
    roleTitle: "Setter Taktis & Penenang",
    stats: { attack: 75, defense: 82, serve: 80, brain: 91, speed: 78 },
    tags: ["karasuno", "brain"],
  },
  {
    id: "yamaguchi",
    name: "Tadashi Yamaguchi",
    schoolPackIds: ["karasuno-spring"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 12,
    position: "MB",
    ovr: 77,
    tier: "N",
    roleTitle: "Pinch Jump-Float Server",
    stats: { attack: 74, defense: 75, serve: 90, brain: 80, speed: 76 },
    tags: ["karasuno", "jump-float"],
  },
  {
    id: "ennoshita",
    name: "Chikara Ennoshita",
    schoolPackIds: ["karasuno-qualifiers", "karasuno-spring"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 6,
    position: "OH",
    ovr: 82,
    tier: "R",
    roleTitle: "Kapten Masa Depan",
    stats: { attack: 80, defense: 85, serve: 79, brain: 87, speed: 81 },
    tags: ["karasuno", "captain", "receive"],
  },
  {
    id: "kinoshita",
    name: "Hisashi Kinoshita",
    schoolPackIds: ["karasuno-spring"],
    schoolLabel: "Karasuno",
    primaryColor: "#18181b",
    secondaryColor: "#f97316",
    number: 7,
    position: "OH",
    ovr: 76,
    tier: "N",
    roleTitle: "Jump-Float Server",
    stats: { attack: 74, defense: 77, serve: 88, brain: 79, speed: 75 },
    tags: ["karasuno", "jump-float"],
  },

  // AOBA JOHSAI
  {
    id: "oikawa",
    name: "Toru Oikawa",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 1,
    position: "S",
    ovr: 95,
    tier: "SSR",
    roleTitle: "Grand King",
    stats: { attack: 88, defense: 86, serve: 98, brain: 96, speed: 90 },
    tags: ["seijoh", "captain", "jump-serve"],
  },
  {
    id: "iwaizumi",
    name: "Hajime Iwaizumi",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 4,
    position: "OH",
    ovr: 90,
    tier: "SR",
    roleTitle: "Ace Seijoh",
    stats: { attack: 92, defense: 89, serve: 87, brain: 86, speed: 88 },
    tags: ["seijoh", "ace"],
  },
  {
    id: "kyotani",
    name: "Kentaro Kyotani",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 16,
    position: "OP",
    ovr: 86,
    tier: "SR",
    roleTitle: "Mad Dog Spike",
    stats: { attack: 93, defense: 76, serve: 88, brain: 74, speed: 88 },
    tags: ["seijoh", "power"],
  },
  {
    id: "matsukawa",
    name: "Issei Matsukawa",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 2,
    position: "MB",
    ovr: 84,
    tier: "R",
    roleTitle: "Funnel Block Specialist",
    stats: { attack: 82, defense: 87, serve: 80, brain: 86, speed: 81 },
    tags: ["seijoh"],
  },
  {
    id: "hanamaki",
    name: "Takahiro Hanamaki",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 3,
    position: "OH",
    ovr: 84,
    tier: "R",
    roleTitle: "All-Rounder Wing",
    stats: { attack: 83, defense: 86, serve: 82, brain: 87, speed: 83 },
    tags: ["seijoh"],
    versatileSetter: true,
  },
  {
    id: "watari",
    name: "Shinji Watari",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#14b8a6",
    secondaryColor: "#f8fafc",
    number: 7,
    position: "L",
    ovr: 82,
    tier: "R",
    roleTitle: "Libero Umpan Balik",
    stats: { attack: 60, defense: 86, serve: 60, brain: 84, speed: 85 },
    tags: ["seijoh"],
  },
  {
    id: "kindaichi",
    name: "Yutaro Kindaichi",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 12,
    position: "MB",
    ovr: 85,
    tier: "R",
    roleTitle: "Turn Attack Tinggi",
    stats: { attack: 87, defense: 83, serve: 81, brain: 82, speed: 86 },
    tags: ["seijoh", "kitagawa"],
  },
  {
    id: "kunimi",
    name: "Akira Kunimi",
    schoolPackIds: ["aoba-johsai"],
    schoolLabel: "Aoba Johsai",
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    number: 13,
    position: "OP",
    ovr: 85,
    tier: "R",
    roleTitle: "Efisiensi Energi Mutlak",
    stats: { attack: 84, defense: 85, serve: 81, brain: 89, speed: 82 },
    tags: ["seijoh", "kitagawa", "brain"],
  },

  // NEKOMA
  {
    id: "yaku",
    name: "Morisuke Yaku",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#18181b",
    secondaryColor: "#dc2626",
    number: 3,
    position: "L",
    ovr: 94,
    tier: "SSR",
    roleTitle: "Libero Terbaik Tokyo",
    stats: { attack: 60, defense: 98, serve: 60, brain: 91, speed: 94 },
    tags: ["nekoma", "guardian"],
  },
  {
    id: "kuroo",
    name: "Tetsuro Kuroo",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 1,
    position: "MB",
    ovr: 92,
    tier: "SSR",
    roleTitle: "Kapten & Blok Cerdas",
    stats: { attack: 88, defense: 94, serve: 89, brain: 94, speed: 88 },
    tags: ["nekoma", "captain", "read-block"],
  },
  {
    id: "kenma",
    name: "Kenma Kozume",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 5,
    position: "S",
    ovr: 90,
    tier: "SR",
    roleTitle: "Otak Nekoma",
    stats: { attack: 78, defense: 84, serve: 80, brain: 99, speed: 83 },
    tags: ["nekoma", "brain"],
  },
  {
    id: "yamamoto",
    name: "Taketora Yamamoto",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 4,
    position: "OH",
    ovr: 86,
    tier: "SR",
    roleTitle: "Ace Pantang Menyerah",
    stats: { attack: 88, defense: 87, serve: 84, brain: 82, speed: 86 },
    tags: ["nekoma", "ace"],
  },
  {
    id: "fukunaga",
    name: "Shohei Fukunaga",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 6,
    position: "OH",
    ovr: 85,
    tier: "R",
    roleTitle: "Penempatan Bola Presisi",
    stats: { attack: 86, defense: 87, serve: 81, brain: 86, speed: 85 },
    tags: ["nekoma"],
  },
  {
    id: "kai",
    name: "Nobuyuki Kai",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 2,
    position: "OP",
    ovr: 84,
    tier: "R",
    roleTitle: "Receive Tenang Tanpa Celah",
    stats: { attack: 80, defense: 90, serve: 80, brain: 86, speed: 82 },
    tags: ["nekoma", "receive"],
  },
  {
    id: "lev",
    name: "Lev Haiba",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 11,
    position: "MB",
    ovr: 83,
    tier: "R",
    roleTitle: "Menara 194cm",
    stats: { attack: 88, defense: 82, serve: 76, brain: 74, speed: 89 },
    tags: ["nekoma"],
  },
  {
    id: "inuoka",
    name: "So Inuoka",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    number: 7,
    position: "OP",
    ovr: 83,
    tier: "R",
    roleTitle: "Pelari & Blocker Cepat",
    stats: { attack: 84, defense: 83, serve: 77, brain: 78, speed: 91 },
    tags: ["nekoma"],
  },
  {
    id: "shibayama",
    name: "Yuki Shibayama",
    schoolPackIds: ["nekoma"],
    schoolLabel: "Nekoma",
    primaryColor: "#18181b",
    secondaryColor: "#dc2626",
    number: 12,
    position: "L",
    ovr: 79,
    tier: "N",
    roleTitle: "Libero Penerus Nekoma",
    stats: { attack: 55, defense: 84, serve: 55, brain: 80, speed: 84 },
    tags: ["nekoma"],
  },

  // SHIRATORIZAWA
  {
    id: "ushijima",
    name: "Wakatoshi Ushijima",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 1,
    position: "OP",
    ovr: 97,
    tier: "SSR",
    roleTitle: "Top 3 Ace Nasional",
    stats: { attack: 99, defense: 88, serve: 96, brain: 90, speed: 91 },
    tags: ["shiratorizawa", "top3-ace", "ace", "jump-serve", "captain"],
  },
  {
    id: "tendou",
    name: "Satori Tendou",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 5,
    position: "MB",
    ovr: 90,
    tier: "SR",
    roleTitle: "Guess Monster",
    stats: { attack: 86, defense: 93, serve: 82, brain: 92, speed: 89 },
    tags: ["shiratorizawa", "blocker"],
  },
  {
    id: "reon",
    name: "Reon Ohira",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 4,
    position: "OH",
    ovr: 87,
    tier: "SR",
    roleTitle: "Sayap Serba Solid",
    stats: { attack: 88, defense: 88, serve: 85, brain: 86, speed: 85 },
    tags: ["shiratorizawa"],
  },
  {
    id: "goshiki",
    name: "Tsutomu Goshiki",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 8,
    position: "OH",
    ovr: 86,
    tier: "SR",
    roleTitle: "Calon Ace Masa Depan",
    stats: { attack: 89, defense: 83, serve: 86, brain: 82, speed: 88 },
    tags: ["shiratorizawa", "jump-serve"],
  },
  {
    id: "shirabu",
    name: "Kenjiro Shirabu",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 10,
    position: "S",
    ovr: 84,
    tier: "R",
    roleTitle: "Pelayan Ace Terkuat",
    stats: { attack: 78, defense: 82, serve: 83, brain: 87, speed: 83 },
    tags: ["shiratorizawa"],
  },
  {
    id: "yamagata",
    name: "Hayato Yamagata",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#7e22ce",
    secondaryColor: "#f8fafc",
    number: 14,
    position: "L",
    ovr: 85,
    tier: "R",
    roleTitle: "Refleks Gesit",
    stats: { attack: 58, defense: 89, serve: 58, brain: 82, speed: 88 },
    tags: ["shiratorizawa"],
  },
  {
    id: "semi",
    name: "Eita Semi",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 3,
    position: "S",
    ovr: 87,
    tier: "SR",
    roleTitle: "Pinch Server & Setter Agresif",
    stats: { attack: 83, defense: 82, serve: 93, brain: 86, speed: 85 },
    tags: ["shiratorizawa", "jump-serve"],
  },
  {
    id: "kawanishi",
    name: "Taichi Kawanishi",
    schoolPackIds: ["shiratorizawa"],
    schoolLabel: "Shiratorizawa",
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    number: 12,
    position: "MB",
    ovr: 84,
    tier: "R",
    roleTitle: "Blocker Fleksibel",
    stats: { attack: 83, defense: 87, serve: 80, brain: 85, speed: 82 },
    tags: ["shiratorizawa", "read-block"],
  },

  // FUKURODANI
  {
    id: "bokuto",
    name: "Kotaro Bokuto",
    schoolPackIds: ["fukurodani"],
    schoolLabel: "Fukurodani",
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    number: 4,
    position: "OH",
    ovr: 95,
    tier: "SSR",
    roleTitle: "Top 5 Ace Nasional",
    stats: { attack: 98, defense: 86, serve: 93, brain: 85, speed: 94 },
    tags: ["fukurodani", "ace", "captain", "jump-serve"],
  },
  {
    id: "akaashi",
    name: "Keiji Akaashi",
    schoolPackIds: ["fukurodani"],
    schoolLabel: "Fukurodani",
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    number: 5,
    position: "S",
    ovr: 90,
    tier: "SR",
    roleTitle: "Setter Penjinak Ace",
    stats: { attack: 83, defense: 86, serve: 86, brain: 95, speed: 87 },
    tags: ["fukurodani", "brain"],
  },
  {
    id: "washio",
    name: "Tatsuki Washio",
    schoolPackIds: ["fukurodani"],
    schoolLabel: "Fukurodani",
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    number: 2,
    position: "MB",
    ovr: 88,
    tier: "SR",
    roleTitle: "Blocker Kokoh Tokyo",
    stats: { attack: 87, defense: 90, serve: 88, brain: 85, speed: 86 },
    tags: ["fukurodani", "jump-serve"],
  },
  {
    id: "konoha",
    name: "Akinori Konoha",
    schoolPackIds: ["fukurodani"],
    schoolLabel: "Fukurodani",
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    number: 7,
    position: "OP",
    ovr: 86,
    tier: "SR",
    roleTitle: "Mr. Versatile",
    stats: { attack: 85, defense: 87, serve: 84, brain: 89, speed: 85 },
    tags: ["fukurodani", "versatile"],
    versatileSetter: true,
  },
  {
    id: "komi",
    name: "Haruki Komi",
    schoolPackIds: ["fukurodani"],
    schoolLabel: "Fukurodani",
    primaryColor: "#eab308",
    secondaryColor: "#1e293b",
    number: 11,
    position: "L",
    ovr: 86,
    tier: "SR",
    roleTitle: "Libero Lincah",
    stats: { attack: 60, defense: 90, serve: 60, brain: 84, speed: 90 },
    tags: ["fukurodani"],
  },
  {
    id: "sarukui",
    name: "Yamato Sarukui",
    schoolPackIds: ["fukurodani"],
    schoolLabel: "Fukurodani",
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    number: 3,
    position: "OH",
    ovr: 85,
    tier: "R",
    roleTitle: "Wing Konsisten",
    stats: { attack: 86, defense: 85, serve: 83, brain: 84, speed: 85 },
    tags: ["fukurodani"],
  },

  // INARIZAKI
  {
    id: "atsumu",
    name: "Atsumu Miya",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 7,
    position: "S",
    ovr: 96,
    tier: "SSR",
    roleTitle: "Setter #1 SMA Jepang",
    stats: { attack: 90, defense: 87, serve: 98, brain: 95, speed: 93 },
    tags: ["inarizaki", "miya", "jump-serve"],
  },
  {
    id: "osamu",
    name: "Osamu Miya",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 11,
    position: "OP",
    ovr: 90,
    tier: "SR",
    roleTitle: "Kembaran Serbabisa",
    stats: { attack: 91, defense: 88, serve: 89, brain: 90, speed: 91 },
    tags: ["inarizaki", "miya"],
    versatileSetter: true,
  },
  {
    id: "aran",
    name: "Aran Ojiro",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 4,
    position: "OH",
    ovr: 92,
    tier: "SSR",
    roleTitle: "Top 5 Ace Nasional",
    stats: { attack: 95, defense: 87, serve: 92, brain: 87, speed: 90 },
    tags: ["inarizaki", "ace", "jump-serve"],
  },
  {
    id: "suna",
    name: "Rintaro Suna",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 10,
    position: "MB",
    ovr: 90,
    tier: "SR",
    roleTitle: "Core Turn Spike",
    stats: { attack: 93, defense: 87, serve: 83, brain: 90, speed: 89 },
    tags: ["inarizaki"],
  },
  {
    id: "kita",
    name: "Shinsuke Kita",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 1,
    position: "OH",
    ovr: 86,
    tier: "SR",
    roleTitle: "Kapten Disiplin Mutlak",
    stats: { attack: 80, defense: 95, serve: 82, brain: 94, speed: 84 },
    tags: ["inarizaki", "captain", "receive"],
  },
  {
    id: "akagi",
    name: "Michinari Akagi",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#9f1239",
    secondaryColor: "#18181b",
    number: 15,
    position: "L",
    ovr: 87,
    tier: "SR",
    roleTitle: "Penyelamat Bola Mustahil",
    stats: { attack: 58, defense: 92, serve: 58, brain: 84, speed: 91 },
    tags: ["inarizaki"],
  },
  {
    id: "omimi",
    name: "Ren Omimi",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 2,
    position: "MB",
    ovr: 88,
    tier: "SR",
    roleTitle: "Tembok Tengah 191cm",
    stats: { attack: 86, defense: 91, serve: 84, brain: 88, speed: 85 },
    tags: ["inarizaki", "read-block"],
  },
  {
    id: "ginjima",
    name: "Hitoshi Ginjima",
    schoolPackIds: ["inarizaki"],
    schoolLabel: "Inarizaki",
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    number: 5,
    position: "OH",
    ovr: 87,
    tier: "SR",
    roleTitle: "Meriam Sayap Inarizaki",
    stats: { attack: 89, defense: 84, serve: 88, brain: 83, speed: 87 },
    tags: ["inarizaki", "jump-serve"],
  },

  // DATE TECH
  {
    id: "aone",
    name: "Takanobu Aone",
    schoolPackIds: ["date-tech"],
    schoolLabel: "Date Tech",
    primaryColor: "#f8fafc",
    secondaryColor: "#0f766e",
    number: 1,
    position: "MB",
    ovr: 90,
    tier: "SR",
    roleTitle: "Tembok Besi Tanpa Wajah",
    stats: { attack: 87, defense: 96, serve: 86, brain: 84, speed: 88 },
    tags: ["date-tech", "iron-wall", "jump-serve"],
  },
  {
    id: "futakuchi",
    name: "Kenji Futakuchi",
    schoolPackIds: ["date-tech"],
    schoolLabel: "Date Tech",
    primaryColor: "#f8fafc",
    secondaryColor: "#0f766e",
    number: 2,
    position: "OH",
    ovr: 87,
    tier: "SR",
    roleTitle: "Kapten & Tembok Sayap",
    stats: { attack: 87, defense: 90, serve: 86, brain: 87, speed: 85 },
    tags: ["date-tech", "iron-wall", "captain"],
  },
  {
    id: "koganegawa",
    name: "Kanji Koganegawa",
    schoolPackIds: ["date-tech"],
    schoolLabel: "Date Tech",
    primaryColor: "#f8fafc",
    secondaryColor: "#0f766e",
    number: 7,
    position: "S",
    ovr: 81,
    tier: "R",
    roleTitle: "Setter Raksasa 191cm",
    stats: { attack: 82, defense: 86, serve: 79, brain: 76, speed: 80 },
    tags: ["date-tech", "iron-wall"],
  },
  {
    id: "obara",
    name: "Yutaka Obara",
    schoolPackIds: ["date-tech"],
    schoolLabel: "Date Tech",
    primaryColor: "#f8fafc",
    secondaryColor: "#0f766e",
    number: 3,
    position: "OH",
    ovr: 82,
    tier: "R",
    roleTitle: "Pilar Sayap Tembok Besi",
    stats: { attack: 82, defense: 85, serve: 80, brain: 82, speed: 81 },
    tags: ["date-tech"],
  },
  {
    id: "sakunami",
    name: "Kosuke Sakunami",
    schoolPackIds: ["date-tech"],
    schoolLabel: "Date Tech",
    primaryColor: "#0f766e",
    secondaryColor: "#f8fafc",
    number: 13,
    position: "L",
    ovr: 82,
    tier: "R",
    roleTitle: "Libero Pengawal Tembok",
    stats: { attack: 56, defense: 87, serve: 56, brain: 81, speed: 84 },
    tags: ["date-tech"],
  },
  {
    id: "moniwa",
    name: "Kaname Moniwa",
    schoolPackIds: ["date-tech"],
    schoolLabel: "Date Tech",
    primaryColor: "#f8fafc",
    secondaryColor: "#0f766e",
    number: 2,
    position: "S",
    ovr: 82,
    tier: "R",
    roleTitle: "Setter Penjaga Tembok",
    stats: { attack: 75, defense: 84, serve: 79, brain: 87, speed: 81 },
    tags: ["date-tech", "captain"],
  },

  // KAMOMEDAI
  {
    id: "hoshiumi",
    name: "Korai Hoshiumi",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    number: 5,
    position: "OH",
    ovr: 96,
    tier: "SSR",
    roleTitle: "Raksasa Kecil Sejati",
    stats: { attack: 96, defense: 94, serve: 94, brain: 93, speed: 98 },
    tags: ["kamomedai", "little-giant", "jump-serve"],
    versatileSetter: true,
  },
  {
    id: "hirugami",
    name: "Sachiro Hirugami",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    number: 6,
    position: "MB",
    ovr: 93,
    tier: "SSR",
    roleTitle: "Immovable Read Blocker",
    stats: { attack: 88, defense: 97, serve: 89, brain: 95, speed: 87 },
    tags: ["kamomedai", "read-block"],
  },
  {
    id: "hakuba",
    name: "Gao Hakuba",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    number: 10,
    position: "OP",
    ovr: 87,
    tier: "SR",
    roleTitle: "Raksasa 203cm",
    stats: { attack: 91, defense: 88, serve: 84, brain: 81, speed: 82 },
    tags: ["kamomedai"],
  },
  {
    id: "mami",
    name: "Nozomu Mami",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    number: 8,
    position: "MB",
    ovr: 85,
    tier: "R",
    roleTitle: "Bunch Shift Specialist",
    stats: { attack: 84, defense: 88, serve: 82, brain: 85, speed: 83 },
    tags: ["kamomedai"],
  },
  {
    id: "kanbayashi",
    name: "Keisuke Kanbayashi",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#0284c7",
    secondaryColor: "#f0f9ff",
    number: 13,
    position: "L",
    ovr: 86,
    tier: "SR",
    roleTitle: "Libero Penopang Tembok",
    stats: { attack: 58, defense: 90, serve: 58, brain: 85, speed: 88 },
    tags: ["kamomedai"],
  },
  {
    id: "suwa",
    name: "Aikichi Suwa",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    number: 1,
    position: "S",
    ovr: 88,
    tier: "SR",
    roleTitle: "Kapten Pengatur Tempo",
    stats: { attack: 82, defense: 88, serve: 87, brain: 92, speed: 86 },
    tags: ["kamomedai", "captain"],
  },
  {
    id: "nozawa",
    name: "Izuru Nozawa",
    schoolPackIds: ["kamomedai"],
    schoolLabel: "Kamomedai",
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    number: 4,
    position: "OH",
    ovr: 86,
    tier: "SR",
    roleTitle: "Penjaga Receive & Blok",
    stats: { attack: 84, defense: 90, serve: 83, brain: 86, speed: 84 },
    tags: ["kamomedai", "receive"],
  },

  // ITACHIYAMA
  {
    id: "sakusa",
    name: "Kiyoomi Sakusa",
    schoolPackIds: ["itachiyama"],
    schoolLabel: "Itachiyama",
    primaryColor: "#14532d",
    secondaryColor: "#a3e635",
    number: 10,
    position: "OH",
    ovr: 97,
    tier: "SSR",
    roleTitle: "Top 3 Ace • Spin Pergelangan",
    stats: { attack: 98, defense: 94, serve: 94, brain: 95, speed: 92 },
    tags: ["itachiyama", "top3-ace", "ace"],
  },
  {
    id: "komori",
    name: "Motoya Komori",
    schoolPackIds: ["itachiyama"],
    schoolLabel: "Itachiyama",
    primaryColor: "#a3e635",
    secondaryColor: "#14532d",
    number: 13,
    position: "L",
    ovr: 96,
    tier: "SSR",
    roleTitle: "Libero #1 SMA Jepang",
    stats: { attack: 64, defense: 99, serve: 60, brain: 94, speed: 97 },
    tags: ["itachiyama", "guardian"],
  },
  {
    id: "iizuna",
    name: "Tsukasa Iizuna",
    schoolPackIds: ["itachiyama"],
    schoolLabel: "Itachiyama",
    primaryColor: "#14532d",
    secondaryColor: "#a3e635",
    number: 1,
    position: "S",
    ovr: 91,
    tier: "SSR",
    roleTitle: "Kapten Juara Nasional",
    stats: { attack: 85, defense: 89, serve: 89, brain: 94, speed: 89 },
    tags: ["itachiyama", "captain"],
  },

  // MUJINAZAKA
  {
    id: "kiryu",
    name: "Wakatsu Kiryu",
    schoolPackIds: ["mujinazaka"],
    schoolLabel: "Mujinazaka",
    primaryColor: "#334155",
    secondaryColor: "#f59e0b",
    number: 1,
    position: "OH",
    ovr: 96,
    tier: "SSR",
    roleTitle: "Top 3 Ace • Meriam Semua Umpan",
    stats: { attack: 98, defense: 90, serve: 94, brain: 90, speed: 92 },
    tags: ["mujinazaka", "top3-ace", "ace", "captain"],
  },
  {
    id: "usuri",
    name: "Michiru Usuri",
    schoolPackIds: ["mujinazaka"],
    schoolLabel: "Mujinazaka",
    primaryColor: "#334155",
    secondaryColor: "#f59e0b",
    number: 10,
    position: "S",
    ovr: 86,
    tier: "SR",
    roleTitle: "Setter Taktis Manipulatif",
    stats: { attack: 81, defense: 84, serve: 84, brain: 93, speed: 83 },
    tags: ["mujinazaka", "brain"],
  },
  {
    id: "unnan",
    name: "Keisuke Unnan",
    schoolPackIds: ["mujinazaka"],
    schoolLabel: "Mujinazaka",
    primaryColor: "#334155",
    secondaryColor: "#f59e0b",
    number: 4,
    position: "MB",
    ovr: 86,
    tier: "SR",
    roleTitle: "Blocker Disiplin",
    stats: { attack: 85, defense: 89, serve: 82, brain: 86, speed: 83 },
    tags: ["mujinazaka"],
  },
  {
    id: "chigaya",
    name: "Eikichi Chigaya",
    schoolPackIds: ["mujinazaka"],
    schoolLabel: "Mujinazaka",
    primaryColor: "#334155",
    secondaryColor: "#f59e0b",
    number: 12,
    position: "MB",
    ovr: 85,
    tier: "R",
    roleTitle: "Blocker Kidal Timnas U-19",
    stats: { attack: 85, defense: 87, serve: 81, brain: 84, speed: 85 },
    tags: ["mujinazaka"],
  },

  // JOHZENJI
  {
    id: "terushima",
    name: "Yuji Terushima",
    schoolPackIds: ["johzenji"],
    schoolLabel: "Johzenji",
    primaryColor: "#eab308",
    secondaryColor: "#27272a",
    number: 1,
    position: "OH",
    ovr: 83,
    tier: "R",
    roleTitle: "Asobi • Gaya Main Liar",
    stats: { attack: 85, defense: 79, serve: 83, brain: 78, speed: 90 },
    tags: ["johzenji", "captain"],
  },
  {
    id: "futamata",
    name: "Takeharu Futamata",
    schoolPackIds: ["johzenji"],
    schoolLabel: "Johzenji",
    primaryColor: "#eab308",
    secondaryColor: "#27272a",
    number: 3,
    position: "S",
    ovr: 79,
    tier: "N",
    roleTitle: "Setter Improvisasi",
    stats: { attack: 77, defense: 78, serve: 78, brain: 80, speed: 83 },
    tags: ["johzenji"],
  },
  {
    id: "bobata",
    name: "Kazuma Bobata",
    schoolPackIds: ["johzenji"],
    schoolLabel: "Johzenji",
    primaryColor: "#eab308",
    secondaryColor: "#27272a",
    number: 2,
    position: "MB",
    ovr: 79,
    tier: "N",
    roleTitle: "Blocker Atletis",
    stats: { attack: 80, defense: 79, serve: 76, brain: 75, speed: 84 },
    tags: ["johzenji"],
  },
  {
    id: "tsuchiyu",
    name: "Arata Tsuchiyu",
    schoolPackIds: ["johzenji"],
    schoolLabel: "Johzenji",
    primaryColor: "#27272a",
    secondaryColor: "#eab308",
    number: 11,
    position: "L",
    ovr: 78,
    tier: "N",
    roleTitle: "Libero Reaksi Cepat",
    stats: { attack: 55, defense: 82, serve: 55, brain: 76, speed: 83 },
    tags: ["johzenji"],
  },

  // NOHEBI
  {
    id: "daisho",
    name: "Suguru Daisho",
    schoolPackIds: ["nohebi"],
    schoolLabel: "Nohebi",
    primaryColor: "#14532d",
    secondaryColor: "#18181b",
    number: 1,
    position: "OH",
    ovr: 85,
    tier: "R",
    roleTitle: "Trik Cerdik & Mental Warfare",
    stats: { attack: 85, defense: 84, serve: 85, brain: 91, speed: 84 },
    tags: ["nohebi", "captain", "brain"],
  },
  {
    id: "kuguri",
    name: "Naoyasu Kuguri",
    schoolPackIds: ["nohebi"],
    schoolLabel: "Nohebi",
    primaryColor: "#14532d",
    secondaryColor: "#18181b",
    number: 12,
    position: "OH",
    ovr: 82,
    tier: "R",
    roleTitle: "Formasi Spike Tanpa Telegrap",
    stats: { attack: 85, defense: 79, serve: 80, brain: 82, speed: 83 },
    tags: ["nohebi"],
  },
  {
    id: "hiroo",
    name: "Kazuki Hiroo",
    schoolPackIds: ["nohebi"],
    schoolLabel: "Nohebi",
    primaryColor: "#14532d",
    secondaryColor: "#18181b",
    number: 4,
    position: "MB",
    ovr: 81,
    tier: "R",
    roleTitle: "Blocker Disiplin",
    stats: { attack: 80, defense: 84, serve: 79, brain: 83, speed: 80 },
    tags: ["nohebi"],
  },
  {
    id: "akama",
    name: "Sakai Akama",
    schoolPackIds: ["nohebi"],
    schoolLabel: "Nohebi",
    primaryColor: "#18181b",
    secondaryColor: "#14532d",
    number: 13,
    position: "L",
    ovr: 80,
    tier: "R",
    roleTitle: "Libero Pengawal",
    stats: { attack: 55, defense: 84, serve: 55, brain: 80, speed: 82 },
    tags: ["nohebi"],
  },
  {
    id: "numai",
    name: "Kazuma Numai",
    schoolPackIds: ["nohebi"],
    schoolLabel: "Nohebi",
    primaryColor: "#14532d",
    secondaryColor: "#18181b",
    number: 4,
    position: "OH",
    ovr: 84,
    tier: "R",
    roleTitle: "Ace Ular Berbisa",
    stats: { attack: 87, defense: 81, serve: 85, brain: 82, speed: 84 },
    tags: ["nohebi", "ace"],
  },

  // CHALLENGERS (WAKUTANI & TSUBAKIHARA)
  {
    id: "nakashima",
    name: "Takeru Nakashima",
    schoolPackIds: ["challengers"],
    schoolLabel: "Wakutani",
    primaryColor: "#1e3a8a",
    secondaryColor: "#e2e8f0",
    number: 1,
    position: "OH",
    ovr: 87,
    tier: "SR",
    roleTitle: "Raksasa Kecil Miyagi",
    stats: { attack: 87, defense: 88, serve: 83, brain: 89, speed: 91 },
    tags: ["little-giant", "captain"],
  },
  {
    id: "teradomari",
    name: "Motoki Teradomari",
    schoolPackIds: ["challengers"],
    schoolLabel: "Tsubakihara",
    primaryColor: "#1e3a8a",
    secondaryColor: "#e2e8f0",
    number: 1,
    position: "OH",
    ovr: 85,
    tier: "R",
    roleTitle: "Ace Tinggi 190cm",
    stats: { attack: 89, defense: 81, serve: 87, brain: 82, speed: 82 },
    tags: ["ace"],
  },
  {
    id: "himekawa",
    name: "Aoi Himekawa",
    schoolPackIds: ["challengers"],
    schoolLabel: "Tsubakihara",
    primaryColor: "#1e3a8a",
    secondaryColor: "#e2e8f0",
    number: 10,
    position: "OP",
    ovr: 80,
    tier: "R",
    roleTitle: "Ceiling Serve Specialist",
    stats: { attack: 78, defense: 81, serve: 89, brain: 84, speed: 78 },
    tags: ["serve"],
  },
  {
    id: "echigo",
    name: "Sakae Echigo",
    schoolPackIds: ["challengers"],
    schoolLabel: "Tsubakihara",
    primaryColor: "#1e3a8a",
    secondaryColor: "#e2e8f0",
    number: 2,
    position: "S",
    ovr: 82,
    tier: "R",
    roleTitle: "Kapten Pengatur Tempo",
    stats: { attack: 76, defense: 82, serve: 81, brain: 87, speed: 81 },
    tags: ["captain"],
  },
  {
    id: "hyakuzawa",
    name: "Yudai Hyakuzawa",
    schoolPackIds: ["challengers"],
    schoolLabel: "Kakugawa",
    primaryColor: "#451a03",
    secondaryColor: "#fde68a",
    number: 9,
    position: "OH",
    ovr: 84,
    tier: "R",
    roleTitle: "Raksasa Kakugawa 201cm",
    stats: { attack: 89, defense: 81, serve: 79, brain: 78, speed: 81 },
    tags: ["miyagi-camp"],
  },
] as const;

export const HAIKYUU_PLAYER_BY_ID = new Map<string, HaikyuuPlayer>(
  HAIKYUU_PLAYERS.map((p) => [p.id, p])
);

export const SCHOOL_PACK_BY_ID = new Map<string, SchoolPack>(
  SCHOOL_PACKS.map((s) => [s.id, s])
);

export interface PositionFitResult {
  fit: FitQuality;
  penalty: number;
  label: string;
}

export function getPositionFit(
  player: HaikyuuPlayer,
  slotId: CourtSlotId
): PositionFitResult {
  const slot = COURT_SLOTS.find((s) => s.id === slotId);
  if (!slot) {
    return { fit: "OUT", penalty: 15, label: "Salah Posisi" };
  }
  const expected = slot.expectedPosition;
  const pos = player.position;

  if (pos === expected) {
    return { fit: "PERFECT", penalty: 0, label: "Pas 100%" };
  }

  // Libero cannot easily play front-row spiker or setter
  if (pos === "L" && expected !== "L") {
    return { fit: "OUT", penalty: 16, label: "Out of Pos (-16)" };
  }
  if (expected === "L") {
    if (pos === "OH" || pos === "OP") {
      return { fit: "OUT", penalty: 8, label: "Darurat Libero (-8)" };
    }
    return { fit: "OUT", penalty: 14, label: "Out of Pos (-14)" };
  }

  // Setter slot
  if (expected === "S") {
    if (player.versatileSetter) {
      return { fit: "FLEX", penalty: 4, label: "Flex Setter (-4)" };
    }
    if (pos === "OP") {
      return { fit: "OUT", penalty: 9, label: "Darurat Setter (-9)" };
    }
    return { fit: "OUT", penalty: 13, label: "Out of Pos (-13)" };
  }

  // Wing flex: OH <-> OP
  if ((pos === "OH" && expected === "OP") || (pos === "OP" && expected === "OH")) {
    return { fit: "FLEX", penalty: 3, label: "Flex Sayap (-3)" };
  }

  // S -> OP (strong attacking setters can play OP decently)
  if (pos === "S" && expected === "OP") {
    return { fit: "FLEX", penalty: 6, label: "Flex OP (-6)" };
  }

  // OH/OP <-> MB
  if (
    ((pos === "OH" || pos === "OP") && expected === "MB") ||
    (pos === "MB" && (expected === "OP" || expected === "OH"))
  ) {
    return { fit: "FLEX", penalty: pos === "MB" && expected === "OH" ? 7 : 5, label: pos === "MB" && expected === "OH" ? "Flex (-7)" : "Flex (-5)" };
  }

  return { fit: "OUT", penalty: 11, label: "Out of Pos (-11)" };
}

export interface ActiveSynergy {
  id: string;
  name: string;
  description: string;
  ovrBonus: number;
  involvedPlayerIds: string[];
}

export interface SynergyCatalogEntry {
  id: string;
  name: string;
  hint: string;
  category: "DUO" | "SEKOLAH" | "SPESIAL";
}

export const HAIKYUU_SYNERGY_CATALOG: readonly SynergyCatalogEntry[] = [
  { id: "freak-quick", name: "Serangan Cepat Eksentrik", hint: "Pasangkan Hinata & Kageyama", category: "DUO" },
  { id: "miya-twins", name: "Kembar Miya", hint: "Pasangkan Atsumu & Osamu Miya", category: "DUO" },
  { id: "atsumu-hinata", name: "Umpan Sang Penantang", hint: "Pasangkan Hinata & Atsumu Miya", category: "DUO" },
  { id: "garbage-dump-brains", name: "Otak & Gagak Terbang", hint: "Pasangkan Hinata & Kenma Kozume", category: "DUO" },
  { id: "seijoh-duo", name: "Kepercayaan 6 Tahun", hint: "Pasangkan Oikawa & Iwaizumi", category: "DUO" },
  { id: "owl-and-setter", name: "Burung Hantu & Penjinaknya", hint: "Pasangkan Bokuto & Akaashi", category: "DUO" },
  { id: "itachiyama-champs", name: "Pilar Juara Itachiyama", hint: "Pasangkan Sakusa & Komori", category: "DUO" },
  { id: "kamomedai-wings", name: "Sayap & Tembok Kamomedai", hint: "Pasangkan Hoshiumi & Hirugami", category: "DUO" },
  { id: "shiratori-duo", name: "Meriam & Monster Tebakan", hint: "Pasangkan Ushijima & Tendou", category: "DUO" },
  { id: "iron-wall", name: "Tembok Besi Date Tech", hint: "Pasangkan Aone & Futakuchi", category: "DUO" },
  { id: "mentor-block", name: "Guru & Murid Read Block", hint: "Pasangkan Kuroo & Tsukishima", category: "DUO" },
  { id: "guardian-and-ace", name: "Dewa Penjaga & Sang Ace", hint: "Pasangkan Nishinoya & Asahi", category: "DUO" },
  { id: "kitagawa-rivals", name: "Rival Kitagawa Daiichi", hint: "Pasangkan Oikawa & Kageyama", category: "DUO" },
  { id: "miyagi-dream", name: "Andai Kau di Shiratorizawa", hint: "Pasangkan Oikawa & Ushijima", category: "DUO" },
  { id: "nekoma-spine", name: "Otak & Jantung Nekoma", hint: "Pasangkan Kuroo & Kenma", category: "DUO" },
  { id: "yaku-lev", name: "Mentor Libero & Menara", hint: "Pasangkan Yaku & Lev Haiba", category: "DUO" },
  { id: "owl-disciple", name: "Murid #1 Burung Hantu", hint: "Pasangkan Bokuto & Hinata", category: "DUO" },
  { id: "tokyo-captains", name: "Kucing & Burung Hantu", hint: "Pasangkan Kuroo & Bokuto", category: "DUO" },
  { id: "tokyo-brains", name: "Duo Otak Tokyo", hint: "Pasangkan Akaashi & Kenma", category: "DUO" },
  { id: "inarizaki-middle", name: "Core Turn Inarizaki", hint: "Pasangkan Atsumu & Suna Rintaro", category: "DUO" },
  { id: "karasuno-hype", name: "Api Semangat Karasuno", hint: "Pasangkan Tanaka & Nishinoya", category: "DUO" },
  { id: "precision-and-wall", name: "Presisi & Read Block", hint: "Pasangkan Kageyama & Tsukishima", category: "DUO" },
  { id: "kita-discipline", name: "Disiplin Kapten Kita", hint: "Kita Shinsuke + minimal 1 pemain Inarizaki", category: "SEKOLAH" },
  { id: "karasuno-seniors", name: "Pilar Tahun Ketiga", hint: "2+ dari Daichi, Sugawara, atau Asahi", category: "SEKOLAH" },
  { id: "karasuno-spirit", name: "Jiwa Gagak Karasuno", hint: "2+ pemain Karasuno dalam satu tim", category: "SEKOLAH" },
  { id: "all-japan-youth", name: "Kamp Timnas U-19", hint: "2+ anggota Kamp Timnas (Kageyama, Atsumu, Sakusa, Komori, Hoshiumi, Chigaya)", category: "SPESIAL" },
  { id: "little-giants", name: "Duel Raksasa Kecil", hint: "2+ pemain bertag Raksasa Kecil (Hinata, Hoshiumi, Nakashima)", category: "SPESIAL" },
  { id: "national-block-wall", name: "Benteng Blok Nasional", hint: "2+ blocker elit (Tsukishima, Kuroo, Aone, Hirugami, Tendou)", category: "SPESIAL" },
  { id: "serve-barrage", name: "Hujan Jump Serve", hint: "3+ spesialis jump serve dalam satu tim", category: "SPESIAL" },
  { id: "captains-aura", name: "Karisma Para Kapten", hint: "3+ kapten sekolah dalam satu tim", category: "SPESIAL" },
  { id: "top3-aces", name: "Meriam Top 3 Nasional", hint: "2+ Ace Top 3 Nasional (Ushijima, Sakusa, Kiryu)", category: "SPESIAL" },
  { id: "kitagawa-turn", name: "Ikatan Kitagawa Daiichi", hint: "2+ dari Kindaichi, Kunimi, dan Kageyama (min. 1 dari Kindaichi/Kunimi)", category: "DUO" },
  { id: "jump-float-duo", name: "Duo Jump-Float Karasuno", hint: "Pasangkan Yamaguchi & Kinoshita", category: "DUO" },
  { id: "kamomedai-command", name: "Komando Elit Kamomedai", hint: "Aikichi Suwa + Hoshiumi atau Hirugami", category: "SEKOLAH" },
  { id: "shiratori-clash", name: "Gaya Kontras Shiratorizawa", hint: "Pasangkan Eita Semi & Ushijima", category: "DUO" },
  { id: "miyagi-rookies", name: "Kamp Pemula Miyagi", hint: "3+ pemain angkatan pertama Miyagi (Hinata, Tsukishima, Goshiki, Kindaichi, Kunimi, Koganegawa, Hyakuzawa)", category: "SPESIAL" },
] as const;

export type LineupMap = Partial<Record<CourtSlotId, HaikyuuPlayer>>;

export interface FormationCheckItem {
  label: string;
  met: boolean;
}

export interface FormationStatus {
  satisfied: boolean;
  bonus: number;
  checks: FormationCheckItem[];
}

export interface TeamEvaluation {
  baseOvr: number;
  fitPenaltyTotal: number;
  synergyBonus: number;
  formationBonus: number;
  totalOvr: number;
  karasunoCount: number;
  activeSynergies: ActiveSynergy[];
  stats: HaikyuuPlayerStats;
  slotScores: Partial<Record<CourtSlotId, { effectiveOvr: number; fit: PositionFitResult }>>;
}

export function computeActiveSynergies(
  players: readonly HaikyuuPlayer[]
): ActiveSynergy[] {
  const draftedIds = new Set(players.map((p) => p.id));
  const activeSynergies: ActiveSynergy[] = [];

  const hasAll = (...ids: string[]) => ids.every((id) => draftedIds.has(id));

  if (hasAll("hinata", "kageyama")) {
    activeSynergies.push({
      id: "freak-quick",
      name: "Serangan Cepat Eksentrik",
      description: "Hinata & Kageyama: Minus-tempo combo yang mustahil dibaca!",
      ovrBonus: 2.5,
      involvedPlayerIds: ["hinata", "kageyama"],
    });
  }
  if (hasAll("atsumu", "osamu")) {
    activeSynergies.push({
      id: "miya-twins",
      name: "Kembar Miya",
      description: "Atsumu & Osamu: Serangan kembar tercepat Inarizaki!",
      ovrBonus: 2.2,
      involvedPlayerIds: ["atsumu", "osamu"],
    });
  }
  if (hasAll("hinata", "atsumu")) {
    activeSynergies.push({
      id: "atsumu-hinata",
      name: "Umpan Sang Penantang",
      description: "Hinata & Atsumu: Set agresif yang memancing potensi penuh!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["hinata", "atsumu"],
    });
  }
  if (hasAll("hinata", "kenma")) {
    activeSynergies.push({
      id: "garbage-dump-brains",
      name: "Otak & Gagak Terbang",
      description: "Hinata & Kenma: Umpan presisi untuk pergerakan bebas!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["hinata", "kenma"],
    });
  }
  if (hasAll("oikawa", "iwaizumi")) {
    activeSynergies.push({
      id: "seijoh-duo",
      name: "Kepercayaan 6 Tahun",
      description: "Oikawa & Iwaizumi: Koneksi insting tanpa kata!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["oikawa", "iwaizumi"],
    });
  }
  if (hasAll("bokuto", "akaashi")) {
    activeSynergies.push({
      id: "owl-and-setter",
      name: "Burung Hantu & Penjinaknya",
      description: "Bokuto & Akaashi: Mode Ace selalu stabil di puncak!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["bokuto", "akaashi"],
    });
  }
  if (hasAll("sakusa", "komori")) {
    activeSynergies.push({
      id: "itachiyama-champs",
      name: "Pilar Juara Itachiyama",
      description: "Sakusa & Komori: Standar elit bertahan & menyerang!",
      ovrBonus: 2.2,
      involvedPlayerIds: ["sakusa", "komori"],
    });
  }
  if (hasAll("hoshiumi", "hirugami")) {
    activeSynergies.push({
      id: "kamomedai-wings",
      name: "Sayap & Tembok Kamomedai",
      description: "Hoshiumi & Hirugami: Kombinasi blok & lompatan tanpa cela!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["hoshiumi", "hirugami"],
    });
  }
  if (hasAll("ushijima", "tendou")) {
    activeSynergies.push({
      id: "shiratori-duo",
      name: "Meriam & Monster Tebakan",
      description: "Ushijima & Tendou: Tekanan serangan dan blok psikologis!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["ushijima", "tendou"],
    });
  }
  if (hasAll("aone", "futakuchi")) {
    activeSynergies.push({
      id: "iron-wall",
      name: "Tembok Besi Date Tech",
      description: "Aone & Futakuchi: Triple block yang membekukan Ace lawan!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["aone", "futakuchi"],
    });
  }
  if (hasAll("kuroo", "tsukishima")) {
    activeSynergies.push({
      id: "mentor-block",
      name: "Guru & Murid Read Block",
      description: "Kuroo & Tsukishima: Penutupan jalur spike paling cerdas!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["kuroo", "tsukishima"],
    });
  }
  if (hasAll("nishinoya", "asahi")) {
    activeSynergies.push({
      id: "guardian-and-ace",
      name: "Dewa Penjaga & Sang Ace",
      description: "Nishinoya & Asahi: Punggungmu aman, tembakkan bola!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["nishinoya", "asahi"],
    });
  }
  if (hasAll("oikawa", "kageyama")) {
    activeSynergies.push({
      id: "kitagawa-rivals",
      name: "Rival Kitagawa Daiichi",
      description: "Oikawa & Kageyama: Dua setter jenius saling memacu presisi tertinggi!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["oikawa", "kageyama"],
    });
  }
  if (hasAll("oikawa", "ushijima")) {
    activeSynergies.push({
      id: "miyagi-dream",
      name: "Andai Kau di Shiratorizawa",
      description: "Oikawa & Ushijima: Umpan terbaik Miyagi untuk meriam terkuat!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["oikawa", "ushijima"],
    });
  }
  if (hasAll("kuroo", "kenma")) {
    activeSynergies.push({
      id: "nekoma-spine",
      name: "Otak & Jantung Nekoma",
      description: "Kuroo & Kenma: Koneksi sahabat masa kecil yang menyambung segalanya!",
      ovrBonus: 1.8,
      involvedPlayerIds: ["kuroo", "kenma"],
    });
  }
  if (hasAll("yaku", "lev")) {
    activeSynergies.push({
      id: "yaku-lev",
      name: "Mentor Libero & Menara",
      description: "Yaku & Lev: Tendangan disiplin mengubah tinggi badan jadi senjata blok!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["yaku", "lev"],
    });
  }
  if (hasAll("bokuto", "hinata")) {
    activeSynergies.push({
      id: "owl-disciple",
      name: "Murid #1 Burung Hantu",
      description: "Bokuto & Hinata: Feint & cross shot ajaran sang Ace Tokyo!",
      ovrBonus: 1.6,
      involvedPlayerIds: ["bokuto", "hinata"],
    });
  }
  if (hasAll("kuroo", "bokuto")) {
    activeSynergies.push({
      id: "tokyo-captains",
      name: "Kucing & Burung Hantu",
      description: "Kuroo & Bokuto: Rekan latihan abadi dari kamp Tokyo!",
      ovrBonus: 1.6,
      involvedPlayerIds: ["kuroo", "bokuto"],
    });
  }
  if (hasAll("akaashi", "kenma")) {
    activeSynergies.push({
      id: "tokyo-brains",
      name: "Duo Otak Tokyo",
      description: "Akaashi & Kenma: Strategi tenang membaca celah pertahanan lawan!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["akaashi", "kenma"],
    });
  }
  if (hasAll("atsumu", "suna")) {
    activeSynergies.push({
      id: "inarizaki-middle",
      name: "Core Turn Inarizaki",
      description: "Atsumu & Suna: Umpan agresif yang memaksimalkan sudut spike tengah!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["atsumu", "suna"],
    });
  }
  if (hasAll("tanaka", "nishinoya")) {
    activeSynergies.push({
      id: "karasuno-hype",
      name: "Api Semangat Karasuno",
      description: "Tanaka & Nishinoya: Energi pantang menyerah yang mengangkat moral tim!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["tanaka", "nishinoya"],
    });
  }
  if (hasAll("kageyama", "tsukishima")) {
    activeSynergies.push({
      id: "precision-and-wall",
      name: "Presisi & Read Block",
      description: "Kageyama & Tsukishima: Set tinggi tepat sasaran dan dinding blok cerdas!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["kageyama", "tsukishima"],
    });
  }

  const kitaPresent = draftedIds.has("kita");
  const inarizakiPartners = players.filter(
    (p) => p.tags.includes("inarizaki") && p.id !== "kita"
  );
  if (kitaPresent && inarizakiPartners.length >= 1) {
    activeSynergies.push({
      id: "kita-discipline",
      name: "Disiplin Kapten Kita",
      description: "Kita Shinsuke menjaga konsistensi penuh rekan Inarizaki!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["kita", ...inarizakiPartners.map((p) => p.id)],
    });
  }

  const karasunoSeniors = players.filter((p) =>
    ["daichi", "sugawara", "asahi"].includes(p.id)
  );
  if (karasunoSeniors.length >= 2) {
    activeSynergies.push({
      id: "karasuno-seniors",
      name: `Pilar Tahun Ketiga (${karasunoSeniors.length})`,
      description: "Para senior Karasuno menjaga ketenangan di situasi genting!",
      ovrBonus: karasunoSeniors.length >= 3 ? 2.0 : 1.4,
      involvedPlayerIds: karasunoSeniors.map((p) => p.id),
    });
  }

  const youthCampIds = ["kageyama", "atsumu", "sakusa", "komori", "hoshiumi", "chigaya"];
  const youthCampPlayers = players.filter((p) => youthCampIds.includes(p.id));
  if (youthCampPlayers.length >= 2) {
    activeSynergies.push({
      id: "all-japan-youth",
      name: `Kamp Timnas U-19 (${youthCampPlayers.length})`,
      description: "Para talenta undangan kamp nasional bermain dalam satu tim!",
      ovrBonus: youthCampPlayers.length >= 3 ? 2.0 : 1.4,
      involvedPlayerIds: youthCampPlayers.map((p) => p.id),
    });
  }

  const littleGiants = players.filter((p) => p.tags.includes("little-giant"));
  if (littleGiants.length >= 2) {
    activeSynergies.push({
      id: "little-giants",
      name: "Duel Raksasa Kecil",
      description: "Dua pemain bertubuh mungil menguasai pertarungan di atas net!",
      ovrBonus: 1.6,
      involvedPlayerIds: littleGiants.map((p) => p.id),
    });
  }

  const eliteBlockers = players.filter((p) =>
    ["tsukishima", "kuroo", "aone", "hirugami", "tendou"].includes(p.id)
  );
  if (eliteBlockers.length >= 2) {
    activeSynergies.push({
      id: "national-block-wall",
      name: `Benteng Blok Nasional (${eliteBlockers.length})`,
      description: "Kombinasi middle blocker elit yang menutup jalur spike lawan!",
      ovrBonus: eliteBlockers.length >= 3 ? 2.0 : 1.4,
      involvedPlayerIds: eliteBlockers.map((p) => p.id),
    });
  }

  const jumpServers = players.filter((p) => p.tags.includes("jump-serve"));
  if (jumpServers.length >= 3) {
    activeSynergies.push({
      id: "serve-barrage",
      name: `Hujan Jump Serve (${jumpServers.length})`,
      description: "Rotasi servis mematikan yang meruntuhkan penerimaan bola lawan!",
      ovrBonus: 1.5,
      involvedPlayerIds: jumpServers.map((p) => p.id),
    });
  }

  const captains = players.filter((p) => p.tags.includes("captain"));
  if (captains.length >= 3) {
    activeSynergies.push({
      id: "captains-aura",
      name: `Karisma Para Kapten (${captains.length})`,
      description: "Kepemimpinan kuat di setiap lini menjaga stabilitas poin deuce!",
      ovrBonus: 1.4,
      involvedPlayerIds: captains.map((p) => p.id),
    });
  }

  const top3Aces = players.filter((p) => p.tags.includes("top3-ace"));
  if (top3Aces.length >= 2) {
    activeSynergies.push({
      id: "top3-aces",
      name: "Meriam Top 3 Nasional",
      description: "Dua Ace Top 3 Nasional bermain dalam satu lapangan!",
      ovrBonus: 1.8,
      involvedPlayerIds: top3Aces.map((p) => p.id),
    });
  }

  const karasunoPlayers = players.filter((p) => p.tags.includes("karasuno"));
  const karasunoCount = karasunoPlayers.length;
  if (karasunoCount >= 2) {
    const kBonus = karasunoCount >= 4 ? 2.2 : karasunoCount === 3 ? 1.5 : 0.8;
    activeSynergies.push({
      id: "karasuno-spirit",
      name: `Jiwa Gagak Karasuno (${karasunoCount})`,
      description:
        karasunoCount >= 4
          ? "Inti Karasuno mendominasi! Kekompakan dan daya juang meledak."
          : "Chemistry sesama pemain Karasuno menjaga ritme tim.",
      ovrBonus: kBonus,
      involvedPlayerIds: karasunoPlayers.map((p) => p.id),
    });
  }

  const kitagawaJuniors = players.filter((p) =>
    ["kindaichi", "kunimi"].includes(p.id)
  );
  const kitagawaCore = players.filter((p) =>
    ["kindaichi", "kunimi", "kageyama"].includes(p.id)
  );
  if (kitagawaJuniors.length >= 1 && kitagawaCore.length >= 2) {
    activeSynergies.push({
      id: "kitagawa-turn",
      name: `Ikatan Kitagawa Daiichi (${kitagawaCore.length})`,
      description: "Reuni mantan rekan SMP Kitagawa Daiichi yang memacu kombinasi serangan!",
      ovrBonus: kitagawaCore.length >= 3 ? 1.8 : 1.4,
      involvedPlayerIds: kitagawaCore.map((p) => p.id),
    });
  }

  if (hasAll("yamaguchi", "kinoshita")) {
    activeSynergies.push({
      id: "jump-float-duo",
      name: "Duo Jump-Float Karasuno",
      description: "Yamaguchi & Kinoshita: Servis mengambang beruntun pengacau receive lawan!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["yamaguchi", "kinoshita"],
    });
  }

  const suwaPresent = draftedIds.has("suwa");
  const kamomedaiStars = players.filter((p) =>
    ["hoshiumi", "hirugami"].includes(p.id)
  );
  if (suwaPresent && kamomedaiStars.length >= 1) {
    activeSynergies.push({
      id: "kamomedai-command",
      name: "Komando Elit Kamomedai",
      description: "Suwa menjaga ketenangan ritme blok dan serangan Kamomedai!",
      ovrBonus: 1.5,
      involvedPlayerIds: ["suwa", ...kamomedaiStars.map((p) => p.id)],
    });
  }

  if (hasAll("semi", "ushijima")) {
    activeSynergies.push({
      id: "shiratori-clash",
      name: "Gaya Kontras Shiratorizawa",
      description: "Semi & Ushijima: Servis agresif & umpan berani untuk sang Meriam!",
      ovrBonus: 1.4,
      involvedPlayerIds: ["semi", "ushijima"],
    });
  }

  const miyagiRookieIds = [
    "hinata",
    "tsukishima",
    "goshiki",
    "kindaichi",
    "kunimi",
    "koganegawa",
    "hyakuzawa",
  ];
  const miyagiRookies = players.filter((p) => miyagiRookieIds.includes(p.id));
  if (miyagiRookies.length >= 3) {
    activeSynergies.push({
      id: "miyagi-rookies",
      name: `Kamp Pemula Miyagi (${miyagiRookies.length})`,
      description: "Bintang tahun pertama Prefektur Miyagi saling mendorong melampaui batas!",
      ovrBonus: miyagiRookies.length >= 4 ? 2.0 : 1.6,
      involvedPlayerIds: miyagiRookies.map((p) => p.id),
    });
  }

  return activeSynergies;
}

export function getPotentialResonances(
  candidate: HaikyuuPlayer,
  lineup: LineupMap
): ActiveSynergy[] {
  const currentPlayers = Object.values(lineup).filter((p): p is HaikyuuPlayer =>
    Boolean(p)
  );
  if (currentPlayers.some((p) => p.id === candidate.id)) return [];

  const before = computeActiveSynergies(currentPlayers);
  const beforeMap = new Map(before.map((s) => [s.id, s]));
  const after = computeActiveSynergies([...currentPlayers, candidate]);

  return after
    .filter((s) => {
      if (!s.involvedPlayerIds.includes(candidate.id)) return false;
      const prev = beforeMap.get(s.id);
      return !prev || s.ovrBonus > prev.ovrBonus;
    })
    .sort((a, b) => b.ovrBonus - a.ovrBonus);
}

export function getFormationStatus(
  lineup: LineupMap,
  formationId: FormationId,
  avgDefense = 0,
  synergyCount = 0
): FormationStatus {
  const entries = Object.entries(lineup) as [CourtSlotId, HaikyuuPlayer | undefined][];
  const filled = entries.filter((entry): entry is [CourtSlotId, HaikyuuPlayer] =>
    Boolean(entry[1])
  );

  if (formationId === "run-gun") {
    const setter = lineup.S;
    const mb1 = lineup.MB1;
    const mb2 = lineup.MB2;
    const setterOk = Boolean(setter && setter.stats.speed >= 87);
    const mbOk = Boolean(
      (mb1 && mb1.stats.speed >= 88) || (mb2 && mb2.stats.speed >= 88)
    );
    const satisfied = setterOk && mbOk;
    return {
      satisfied,
      bonus: satisfied ? 1.8 : 0,
      checks: [
        { label: "Setter Speed ≥ 87", met: setterOk },
        { label: "Min. 1 MB Speed ≥ 88", met: mbOk },
      ],
    };
  }

  if (formationId === "total-defense") {
    const libero = lineup.L;
    const liberoOk = Boolean(libero && libero.ovr >= 88);
    const defOk = avgDefense >= 85;
    const satisfied = liberoOk && defOk;
    return {
      satisfied,
      bonus: satisfied ? 1.8 : 0,
      checks: [
        { label: "Libero OVR ≥ 88", met: liberoOk },
        { label: "Rata-rata Defense ≥ 85", met: defOk },
      ],
    };
  }

  if (formationId === "cannon-ace") {
    const hasEliteAce = filled.some(
      ([slotId, p]) =>
        (slotId === "OH1" || slotId === "OH2" || slotId === "OP") && p.ovr >= 92
    );
    return {
      satisfied: hasEliteAce,
      bonus: hasEliteAce ? 1.8 : 0,
      checks: [{ label: "Spiker (OH/OP) OVR ≥ 92", met: hasEliteAce }],
    };
  }

  const bonus = Number(Math.min(2.0, synergyCount * 0.6).toFixed(1));
  return {
    satisfied: synergyCount >= 1,
    bonus,
    checks: [
      { label: `Resonansi Aktif (${Math.min(synergyCount, 4)}/3+ maks)`, met: synergyCount >= 3 },
    ],
  };
}

export function evaluateTeam(
  lineup: LineupMap,
  formationId: FormationId
): TeamEvaluation {
  const entries = Object.entries(lineup) as [CourtSlotId, HaikyuuPlayer | undefined][];
  const filled = entries.filter((entry): entry is [CourtSlotId, HaikyuuPlayer] =>
    Boolean(entry[1])
  );

  if (filled.length === 0) {
    return {
      baseOvr: 0,
      fitPenaltyTotal: 0,
      synergyBonus: 0,
      formationBonus: 0,
      totalOvr: 0,
      karasunoCount: 0,
      activeSynergies: [],
      stats: { attack: 0, defense: 0, serve: 0, brain: 0, speed: 0 },
      slotScores: {},
    };
  }

  const slotScores: Partial<
    Record<CourtSlotId, { effectiveOvr: number; fit: PositionFitResult }>
  > = {};
  let sumBase = 0;
  let sumPenalty = 0;
  let sumAtk = 0;
  let sumDef = 0;
  let sumSrv = 0;
  let sumBrn = 0;
  let sumSpd = 0;

  for (const [slotId, player] of filled) {
    const fit = getPositionFit(player, slotId);
    const effective = Math.max(55, player.ovr - fit.penalty);
    slotScores[slotId] = { effectiveOvr: effective, fit };
    sumBase += player.ovr;
    sumPenalty += fit.penalty;
    sumAtk += Math.max(45, player.stats.attack - fit.penalty * 0.6);
    sumDef += Math.max(45, player.stats.defense - fit.penalty * 0.6);
    sumSrv += player.stats.serve;
    sumBrn += Math.max(45, player.stats.brain - fit.penalty * 0.5);
    sumSpd += player.stats.speed;
  }

  const count = filled.length;
  const baseOvr = Number((sumBase / count).toFixed(1));
  const avgPenalty = Number((sumPenalty * 0.25).toFixed(1));
  const stats: HaikyuuPlayerStats = {
    attack: Math.round(sumAtk / count),
    defense: Math.round(sumDef / count),
    serve: Math.round(sumSrv / count),
    brain: Math.round(sumBrn / count),
    speed: Math.round(sumSpd / count),
  };

  const filledPlayers = filled.map(([, p]) => p);
  const activeSynergies = computeActiveSynergies(filledPlayers);
  const karasunoCount = filledPlayers.filter((p) => p.tags.includes("karasuno")).length;

  const rawSynergyBonus = activeSynergies.reduce((acc, s) => acc + s.ovrBonus, 0);
  const synergyBonus = Number(Math.min(5.0, rawSynergyBonus).toFixed(1));

  const formationStatus = getFormationStatus(
    lineup,
    formationId,
    stats.defense,
    activeSynergies.length
  );
  const formationBonus = Number(formationStatus.bonus.toFixed(1));

  const totalOvr = Number(
    Math.min(
      99.9,
      Math.max(
        50,
        baseOvr - avgPenalty + synergyBonus + formationBonus
      )
    ).toFixed(1)
  );

  return {
    baseOvr,
    fitPenaltyTotal: avgPenalty,
    synergyBonus,
    formationBonus,
    totalOvr,
    karasunoCount,
    activeSynergies,
    stats,
    slotScores,
  };
}

export interface HarukoOpponent {
  roundIndex: number;
  stageName: string;
  schoolName: string;
  shortName: string;
  subtitle: string;
  ovr: number;
  bestOf: 3 | 5;
  primaryColor: string;
  secondaryColor: string;
  starPlayer: string;
  starNumber: number;
  starPosition: VolleyPosition;
  playstyleTag: string;
  tacticalHint: string;
  favoredStat: keyof HaikyuuPlayerStats;
  counterStat: keyof HaikyuuPlayerStats;
  statThreshold: number;
}

export const HARUKO_BRACKET: readonly HarukoOpponent[] = [
  {
    roundIndex: 0,
    stageName: "Putaran 2 Miyagi",
    schoolName: "Johzenji High",
    shortName: "JOHZENJI",
    subtitle: "Kualifikasi Miyagi • Gaya Main Bebas",
    ovr: 81.5,
    bestOf: 3,
    primaryColor: "#eab308",
    secondaryColor: "#27272a",
    starPlayer: "Yuji Terushima",
    starNumber: 1,
    starPosition: "OH",
    playstyleTag: "MAIN BEBAS",
    tacticalHint: "Serangan improvisasi Johzenji mudah dipatahkan tim ber-Brain tinggi.",
    favoredStat: "speed",
    counterStat: "brain",
    statThreshold: 82,
  },
  {
    roundIndex: 1,
    stageName: "Perempat Final Miyagi",
    schoolName: "Wakutani South High",
    shortName: "WAKUTANI",
    subtitle: "Kualifikasi Miyagi • Raksasa Kecil vs Raksasa Kecil",
    ovr: 83.5,
    bestOf: 3,
    primaryColor: "#1e3a8a",
    secondaryColor: "#e2e8f0",
    starPlayer: "Takeru Nakashima",
    starNumber: 1,
    starPosition: "OH",
    playstyleTag: "WIPEOUT & GIGIH",
    tacticalHint: "Pukulan wipeout Nakashima menguji Defense; balas lewat Serve tajam.",
    favoredStat: "defense",
    counterStat: "serve",
    statThreshold: 83,
  },
  {
    roundIndex: 2,
    stageName: "Semifinal Miyagi",
    schoolName: "Aoba Johsai High",
    shortName: "SEIJOH",
    subtitle: "Kualifikasi Miyagi • Balas Dendam Interhigh",
    ovr: 85.5,
    bestOf: 3,
    primaryColor: "#f8fafc",
    secondaryColor: "#14b8a6",
    starPlayer: "Toru Oikawa",
    starNumber: 1,
    starPosition: "S",
    playstyleTag: "SERVIS & KOMANDO",
    tacticalHint: "Jump serve Oikawa menekan receive; Speed tinggi mengacaukan bacaan bloknya.",
    favoredStat: "defense",
    counterStat: "speed",
    statThreshold: 85,
  },
  {
    roundIndex: 3,
    stageName: "Final Prefektur Miyagi",
    schoolName: "Shiratorizawa Academy",
    shortName: "SHIRATORI",
    subtitle: "Perebutan Tiket ke Tokyo • Best of 5",
    ovr: 87.5,
    bestOf: 5,
    primaryColor: "#f8fafc",
    secondaryColor: "#7e22ce",
    starPlayer: "Wakatoshi Ushijima",
    starNumber: 1,
    starPosition: "OP",
    playstyleTag: "MERIAM KIRI",
    tacticalHint: "Spike kidal Ushijima menguji Defense total; serang cepat (Speed) jadi celah.",
    favoredStat: "defense",
    counterStat: "speed",
    statThreshold: 86,
  },
  {
    roundIndex: 4,
    stageName: "Putaran 1 Nasional",
    schoolName: "Tsubakihara Academy",
    shortName: "TSUBAKIHARA",
    subtitle: "Debut Tokyo Metropolitan Gym",
    ovr: 86.5,
    bestOf: 3,
    primaryColor: "#1e3a8a",
    secondaryColor: "#93c5fd",
    starPlayer: "Motoki Teradomari",
    starNumber: 3,
    starPosition: "OH",
    playstyleTag: "TEMBAKAN TINGGI",
    tacticalHint: "Servis langit-langit & spike tinggi Tsubakihara rentan ditekan Attack solid.",
    favoredStat: "defense",
    counterStat: "attack",
    statThreshold: 86,
  },
  {
    roundIndex: 5,
    stageName: "Putaran 2 Nasional",
    schoolName: "Inarizaki High",
    shortName: "INARIZAKI",
    subtitle: "Tokyo Metropolitan Gym • Court B",
    ovr: 89.0,
    bestOf: 3,
    primaryColor: "#18181b",
    secondaryColor: "#9f1239",
    starPlayer: "Si Kembar Miya",
    starNumber: 7,
    starPosition: "S",
    playstyleTag: "AGRESIF & KEMBAR",
    tacticalHint: "Tekanan servis Miya butuh Brain tenang dan Defense matang agar tak terbawa ritme.",
    favoredStat: "defense",
    counterStat: "brain",
    statThreshold: 87,
  },
  {
    roundIndex: 6,
    stageName: "Putaran 3 Nasional",
    schoolName: "Nekoma High",
    shortName: "NEKOMA",
    subtitle: "Pertarungan di Tempat Sampah!",
    ovr: 90.0,
    bestOf: 3,
    primaryColor: "#dc2626",
    secondaryColor: "#18181b",
    starPlayer: "Kuroo & Kenma",
    starNumber: 1,
    starPosition: "MB",
    playstyleTag: "LANTAI TERHUBUNG",
    tacticalHint: "Pertahanan Nekoma hampir tak tembus—butuh Attack & Serve keras untuk memutus reli.",
    favoredStat: "brain",
    counterStat: "attack",
    statThreshold: 89,
  },
  {
    roundIndex: 7,
    stageName: "Perempat Final Nasional",
    schoolName: "Kamomedai High",
    shortName: "KAMOMEDAI",
    subtitle: "Raksasa Kecil & Tembok Tak Tergoyahkan",
    ovr: 91.5,
    bestOf: 3,
    primaryColor: "#f0f9ff",
    secondaryColor: "#0284c7",
    starPlayer: "Korai Hoshiumi",
    starNumber: 5,
    starPosition: "OH",
    playstyleTag: "BUNCH READ BLOCK",
    tacticalHint: "Blok terstruktur Kamomedai hanya bisa dipecah oleh Speed tempo ekstrem & umpan cerdas.",
    favoredStat: "attack",
    counterStat: "speed",
    statThreshold: 90,
  },
  {
    roundIndex: 8,
    stageName: "Semifinal • Center Court",
    schoolName: "Fukurodani Academy",
    shortName: "FUKURODANI",
    subtitle: "Lapangan Oranye • Best of 5",
    ovr: 92.5,
    bestOf: 5,
    primaryColor: "#1e293b",
    secondaryColor: "#eab308",
    starPlayer: "Kotaro Bokuto",
    starNumber: 4,
    starPosition: "OH",
    playstyleTag: "ACE TIGA SUDUT",
    tacticalHint: "Serangan tajam Bokuto butuh tim ber-Serve menekan agar aliran umpan Akaashi terganggu.",
    favoredStat: "defense",
    counterStat: "serve",
    statThreshold: 89,
  },
  {
    roundIndex: 9,
    stageName: "FINAL KEJUARAAN MUSIM SEMI",
    schoolName: "Itachiyama Institute",
    shortName: "ITACHIYAMA",
    subtitle: "Perebutan Gelar Juara Nasional!",
    ovr: 94.0,
    bestOf: 5,
    primaryColor: "#14532d",
    secondaryColor: "#a3e635",
    starPlayer: "Sakusa & Komori",
    starNumber: 10,
    starPosition: "OH",
    playstyleTag: "STANDAR JUARA",
    tacticalHint: "Juara bertahan lengkap di segala lini—butuh Brain & eksekusi set tanpa celah.",
    favoredStat: "defense",
    counterStat: "brain",
    statThreshold: 91,
  },
] as const;

const STAT_LABELS_ID: Record<keyof HaikyuuPlayerStats, string> = {
  attack: "Attack",
  defense: "Defense",
  serve: "Serve",
  brain: "Brain",
  speed: "Speed",
};

export interface MatchupEdge {
  deltaOvr: number;
  advantageLabel: string;
  detail: string;
}

export function computeMatchupEdge(
  teamEval: TeamEvaluation,
  opponent: HarukoOpponent
): MatchupEdge {
  const counterVal = teamEval.stats[opponent.counterStat];
  const favoredVal = teamEval.stats[opponent.favoredStat];

  const counterDiff = (counterVal - opponent.statThreshold) * 0.14;
  const stabilityDiff = (favoredVal - (opponent.statThreshold - 2)) * 0.08;
  const rawDelta = Math.max(-1.4, Math.min(1.6, counterDiff + stabilityDiff));
  const deltaOvr = Number(rawDelta.toFixed(1));

  const cLabel = STAT_LABELS_ID[opponent.counterStat];
  const fLabel = STAT_LABELS_ID[opponent.favoredStat];

  if (deltaOvr >= 0.4) {
    return {
      deltaOvr,
      advantageLabel: "Unggul Taktis",
      detail: `${cLabel} tim (${counterVal}) efektif menekan gaya ${opponent.playstyleTag}.`,
    };
  }
  if (deltaOvr <= -0.4) {
    return {
      deltaOvr,
      advantageLabel: "Tertekan Gaya Lawan",
      detail: `${fLabel} (${favoredVal}) & ${cLabel} (${counterVal}) masih di bawah target lawan (${opponent.statThreshold}).`,
    };
  }
  return {
    deltaOvr,
    advantageLabel: "Berimbang",
    detail: `Matchup ${cLabel} vs ${opponent.playstyleTag} berjalan seimbang.`,
  };
}

export interface SetScore {
  setNumber: number;
  karasuno: number;
  opponent: number;
  highlight: string;
}

export interface TournamentMatchResult {
  opponent: HarukoOpponent;
  won: boolean;
  karasunoSets: number;
  opponentSets: number;
  sets: SetScore[];
  mvpName: string;
  matchupDelta?: number;
}

export interface LiveMatchState {
  opponent: HarukoOpponent;
  teamEval: TeamEvaluation;
  lineup: LineupMap;
  matchupEdge: MatchupEdge;
  effectiveBaseOvr: number;
  karasunoSets: number;
  opponentSets: number;
  sets: SetScore[];
  finished: boolean;
  won: boolean;
}

export interface TournamentRunSummary {
  champion: boolean;
  perfectRun: boolean;
  eliminatedAtStage: string | null;
  matchesWon: number;
  totalSetsWon: number;
  totalSetsLost: number;
  matches: TournamentMatchResult[];
}

export function getPlayersForSchoolPack(
  packId: string,
  excludePlayerIds: ReadonlySet<string>
): HaikyuuPlayer[] {
  return HAIKYUU_PLAYERS.filter(
    (p) => p.schoolPackIds.includes(packId) && !excludePlayerIds.has(p.id)
  );
}

export function drawPackCandidates(
  packId: string,
  excludePlayerIds: ReadonlySet<string>,
  maxCount = 3,
  rng: () => number = Math.random
): HaikyuuPlayer[] {
  const pool = [...getPlayersForSchoolPack(packId, excludePlayerIds)];
  // Fisher-Yates shuffle so spins don't guarantee the highest OVR star every time
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, maxCount).sort((a, b) => b.ovr - a.ovr);
}

export function rollSchoolPack(
  usedPackIds: ReadonlySet<string>,
  excludePlayerIds: ReadonlySet<string>,
  rng: () => number = Math.random
): SchoolPack {
  const candidates = SCHOOL_PACKS.filter(
    (pack) =>
      !usedPackIds.has(pack.id) &&
      getPlayersForSchoolPack(pack.id, excludePlayerIds).length > 0
  );

  const pool =
    candidates.length > 0
      ? candidates
      : SCHOOL_PACKS.filter(
          (pack) => getPlayersForSchoolPack(pack.id, excludePlayerIds).length > 0
        );

  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let r = rng() * totalWeight;
  for (const pack of pool) {
    r -= pack.weight;
    if (r <= 0) return pack;
  }
  return pool[pool.length - 1] ?? SCHOOL_PACKS[0]!;
}

function buildSetHighlight(
  karasunoWon: boolean,
  lineup: LineupMap,
  opponent: HarukoOpponent,
  setNumber: number,
  kScore: number,
  oScore: number,
  rng: () => number
): string {
  const drafted = Object.values(lineup).filter((p): p is HaikyuuPlayer => Boolean(p));
  const setter = lineup.S;
  const libero = lineup.L;
  const spikers = [lineup.OH1, lineup.OH2, lineup.OP, lineup.MB1, lineup.MB2].filter(
    (p): p is HaikyuuPlayer => Boolean(p)
  );
  const star =
    spikers.sort((a, b) => b.ovr - a.ovr)[0] ?? drafted[0] ?? HAIKYUU_PLAYERS[0]!;

  if (karasunoWon) {
    if (kScore >= 26 || (setNumber === 5 && kScore >= 16)) {
      return `Deuce menegangkan (${kScore}-${oScore})! ${star.name} menutup set lewat spike keras tak terbendung.`;
    }
    const templates = [
      `${setter ? setter.name : "Setter"} melepas umpan presisi untuk ${star.name} menembus blok ${opponent.shortName}.`,
      `${libero ? libero.name : "Libero"} melakukan penyelamatan mustahil, dibalas quick spike cepat Karasuno!`,
      `Service ace beruntun mengguncang penerimaan bola ${opponent.shortName} di Set ${setNumber}.`,
      `Blok rapat barisan depan Karasuno menghentikan serangan ${opponent.starPlayer}!`,
    ];
    return templates[Math.floor(rng() * templates.length)]!;
  }

  const lossTemplates = [
    `${opponent.starPlayer} tampil dominan dan memecah pertahanan Karasuno di poin-poin krusial.`,
    `Receive Karasuno sempat goyah menghadapi tekanan jump serve ${opponent.shortName} di Set ${setNumber}.`,
    `Duel reli panjang berakhir untuk keunggulan tipis ${opponent.shortName} (${oScore}-${kScore}).`,
  ];
  return lossTemplates[Math.floor(rng() * lossTemplates.length)]!;
}

function simulateSingleSet(
  karasunoOvr: number,
  opponentOvr: number,
  targetPoints: number,
  rng: () => number
): { karasuno: number; opponent: number } {
  // Per-set momentum & form variance (+/- 2.0 OVR) so sets stay competitive
  const setFormSwing = (rng() - 0.5) * 4.0;
  const diff = karasunoOvr + setFormSwing - opponentOvr;
  // Calibrated rally win probability: +3 OVR gives ~53.4% rally edge (~68% set win), keeping 2-0 sweeps earned
  const rallyProb = Math.min(0.68, Math.max(0.32, 1 / (1 + Math.exp(-diff * 0.045))));

  let k = 0;
  let o = 0;
  while (true) {
    const kWinsPoint = rng() < rallyProb;
    if (kWinsPoint) k += 1;
    else o += 1;

    if ((k >= targetPoints || o >= targetPoints) && Math.abs(k - o) >= 2) {
      return { karasuno: k, opponent: o };
    }
    // Safety cap for marathon deuce
    if (k >= targetPoints + 12 || o >= targetPoints + 12) {
      return { karasuno: k, opponent: o };
    }
  }
}

export function createLiveMatchState(
  teamEval: TeamEvaluation,
  lineup: LineupMap,
  opponent: HarukoOpponent,
  rng: () => number = Math.random
): LiveMatchState {
  const matchupEdge = computeMatchupEdge(teamEval, opponent);
  // Match-level tactical variance (+/- 1.5 OVR) + matchup edge
  const momentumShift = (rng() - 0.5) * 3.0;
  const effectiveBaseOvr = teamEval.totalOvr + matchupEdge.deltaOvr + momentumShift;

  return {
    opponent,
    teamEval,
    lineup,
    matchupEdge,
    effectiveBaseOvr,
    karasunoSets: 0,
    opponentSets: 0,
    sets: [],
    finished: false,
    won: false,
  };
}

export function playNextMatchSet(
  state: LiveMatchState,
  rng: () => number = Math.random
): LiveMatchState {
  if (state.finished) return state;

  const setsToWin = state.opponent.bestOf === 5 ? 3 : 2;
  const setNumber = state.sets.length + 1;
  const targetPoints = state.opponent.bestOf === 5 && setNumber === 5 ? 15 : 25;

  const score = simulateSingleSet(
    state.effectiveBaseOvr,
    state.opponent.ovr,
    targetPoints,
    rng
  );
  const kWon = score.karasuno > score.opponent;
  const karasunoSets = state.karasunoSets + (kWon ? 1 : 0);
  const opponentSets = state.opponentSets + (kWon ? 0 : 1);
  const finished = karasunoSets >= setsToWin || opponentSets >= setsToWin;

  const nextSet: SetScore = {
    setNumber,
    karasuno: score.karasuno,
    opponent: score.opponent,
    highlight: buildSetHighlight(
      kWon,
      state.lineup,
      state.opponent,
      setNumber,
      score.karasuno,
      score.opponent,
      rng
    ),
  };

  return {
    ...state,
    karasunoSets,
    opponentSets,
    sets: [...state.sets, nextSet],
    finished,
    won: karasunoSets > opponentSets,
  };
}

export function finalizeLiveMatch(state: LiveMatchState): TournamentMatchResult {
  const drafted = Object.values(state.lineup).filter((p): p is HaikyuuPlayer => Boolean(p));
  const sortedByImpact = [...drafted].sort((a, b) => b.ovr - a.ovr);
  const mvpName = sortedByImpact[0]?.name ?? "Tim Karasuno";

  return {
    opponent: state.opponent,
    won: state.karasunoSets > state.opponentSets,
    karasunoSets: state.karasunoSets,
    opponentSets: state.opponentSets,
    sets: state.sets,
    mvpName,
    matchupDelta: state.matchupEdge.deltaOvr,
  };
}

export function simulateHarukoMatch(
  teamEval: TeamEvaluation,
  lineup: LineupMap,
  opponent: HarukoOpponent,
  rng: () => number = Math.random
): TournamentMatchResult {
  let state = createLiveMatchState(teamEval, lineup, opponent, rng);
  while (!state.finished) {
    state = playNextMatchSet(state, rng);
  }
  return finalizeLiveMatch(state);
}

export function simulateFullTournament(
  teamEval: TeamEvaluation,
  lineup: LineupMap,
  rng: () => number = Math.random
): TournamentRunSummary {
  const matches: TournamentMatchResult[] = [];
  let totalSetsWon = 0;
  let totalSetsLost = 0;
  let eliminatedAtStage: string | null = null;

  for (const opponent of HARUKO_BRACKET) {
    const result = simulateHarukoMatch(teamEval, lineup, opponent, rng);
    matches.push(result);
    totalSetsWon += result.karasunoSets;
    totalSetsLost += result.opponentSets;
    if (!result.won) {
      eliminatedAtStage = opponent.stageName;
      break;
    }
  }

  const champion = eliminatedAtStage === null && matches.length === HARUKO_BRACKET.length;
  const perfectRun = champion && totalSetsLost === 0;

  return {
    champion,
    perfectRun,
    eliminatedAtStage,
    matchesWon: matches.filter((m) => m.won).length,
    totalSetsWon,
    totalSetsLost,
    matches,
  };
}

export function hashSeedString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createSeededRng(seedInput: number | string): () => number {
  let s =
    typeof seedInput === "number" ? seedInput >>> 0 : hashSeedString(seedInput);
  if (s === 0) s = 0x6d2b79f5;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailyChallengeKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
