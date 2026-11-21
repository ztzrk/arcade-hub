import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface SoloGameBoardProps {
  onExit: () => void;
}

export interface RegisteredSoloGame {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  accentColor: string;
  Component: LazyExoticComponent<ComponentType<SoloGameBoardProps>>;
}

const KarasunoHarukoBoard = lazy(() =>
  import("./karasuno-haruko/KarasunoHarukoBoard").then((m) => ({
    default: m.KarasunoHarukoBoard,
  }))
);

export const REGISTERED_SOLO_GAMES: RegisteredSoloGame[] = [
  {
    id: "karasuno-haruko",
    name: "Karasuno: Road to Haruko",
    tagline:
      "Spin sekolah Haikyuu!!, rakit 7 posisi tim Karasuno, & juarai Kejuaraan Musim Semi.",
    badge: "SOLO • TANPA ROOM",
    accentColor: "#f97316",
    Component: KarasunoHarukoBoard,
  },
];

export function getSoloGame(gameId: string): RegisteredSoloGame | null {
  return REGISTERED_SOLO_GAMES.find((g) => g.id === gameId) ?? null;
}
