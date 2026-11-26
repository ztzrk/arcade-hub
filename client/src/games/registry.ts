import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { GameMeta } from "@arcade-hub/shared";
import type { GameBoardProps } from "./liars-deck/LiarsDeckBoard";

export interface RegisteredGame extends GameMeta {
  Component: LazyExoticComponent<ComponentType<GameBoardProps>>;
}

const BattleshipBoard = lazy(() =>
  import("./battleship/BattleshipBoard").then((m) => ({
    default: m.BattleshipBoard,
  }))
);

const HaikyuuDraftBoard = lazy(() =>
  import("./haikyuu-draft/HaikyuuDraftBoard").then((m) => ({
    default: m.HaikyuuDraftBoard,
  }))
);

const LiarsDeckBoard = lazy(() =>
  import("./liars-deck/LiarsDeckBoard").then((m) => ({
    default: m.LiarsDeckBoard,
  }))
);

const TebakKataBoard = lazy(() =>
  import("./tebak-kata/TebakKataBoard").then((m) => ({
    default: m.TebakKataBoard,
  }))
);

const TebakKarakterBoard = lazy(() =>
  import("./tebak-karakter/TebakKarakterBoard").then((m) => ({
    default: m.TebakKarakterBoard,
  }))
);

const Susun4Board = lazy(() =>
  import("./susun-4/Susun4Board").then((m) => ({
    default: m.Susun4Board,
  }))
);

const UlarTanggaBoard = lazy(() =>
  import("./ular-tangga/UlarTanggaBoard").then((m) => ({
    default: m.UlarTanggaBoard,
  }))
);

const UnoNoMercyBoard = lazy(() =>
  import("./uno-no-mercy/UnoNoMercyBoard").then((m) => ({
    default: m.UnoNoMercyBoard,
  }))
);

export const REGISTERED_GAMES: RegisteredGame[] = [
  {
    id: "battleship",
    name: "Battleship Taktis",
    tagline:
      "Perang kapal 1v1 dengan 2 Ranjau Laut, skill kapal aktif (Sonar, Cross Strike, Geser Kapal), & hit-streak!",
    minPlayers: 2,
    maxPlayers: 2,
    Component: BattleshipBoard,
  },
  {
    id: "haikyuu-draft",
    name: "Haikyuu!! Race Draft 1v1",
    tagline:
      "Adu cepat rebutan pemain Haikyuu!! tiap 15 detik, racik sinergi & formasi, lalu duel Best of 3!",
    minPlayers: 2,
    maxPlayers: 2,
    Component: HaikyuuDraftBoard,
  },
  {
    id: "liars-deck",
    name: "Liar's Deck",
    tagline: "Adu gertakan kartu & keberanian di meja Russian Roulette 1v1.",
    minPlayers: 2,
    maxPlayers: 2,
    Component: LiarsDeckBoard,
  },
  {
    id: "tebak-kata",
    name: "Tebak Kata",
    tagline: "Isi kata rahasia & adu cepat menebak frasa lawan.",
    minPlayers: 2,
    maxPlayers: 2,
    Component: TebakKataBoard,
  },
  {
    id: "tebak-karakter",
    name: "Tebak Karakter",
    tagline: "Pilih karakter rahasia, ngobrol bebas untuk eliminasi papan, lalu kunci tebakan bersama.",
    minPlayers: 2,
    maxPlayers: 2,
    Component: TebakKarakterBoard,
  },
  {
    id: "susun-4",
    name: "Susun 4 Putar",
    tagline: "Susun 4 koin segaris — hati-hati, isi kolom bisa tiba-tiba terbalik!",
    minPlayers: 2,
    maxPlayers: 2,
    Component: Susun4Board,
  },
  {
    id: "ular-tangga",
    name: "Ular Tangga Taktis",
    tagline:
      "Lomba ke petak 100 dengan perisai anti-ular, bom jebakan, tukar posisi & dadu spesial.",
    minPlayers: 2,
    maxPlayers: 2,
    Component: UlarTanggaBoard,
  },
  {
    id: "uno-no-mercy",
    name: "UNO: No Mercy",
    tagline:
      "Stacking +2/+4/+6/+10, tukar tangan kartu 0, aturan KO 20 kartu, & tantangan UNO!",
    minPlayers: 2,
    maxPlayers: 2,
    Component: UnoNoMercyBoard,
  },
];

export function getGameComponent(
  gameId: string
): LazyExoticComponent<ComponentType<GameBoardProps>> | null {
  return REGISTERED_GAMES.find((g) => g.id === gameId)?.Component ?? null;
}
