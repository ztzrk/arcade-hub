import type { ComponentType } from "react";
import type { GameMeta } from "@arcade-hub/shared";
import { LiarsDeckBoard, type GameBoardProps } from "./liars-deck/LiarsDeckBoard";

export interface RegisteredGame extends GameMeta {
  Component: ComponentType<GameBoardProps>;
}

export const REGISTERED_GAMES: RegisteredGame[] = [
  {
    id: "liars-deck",
    name: "Liar's Deck",
    tagline: "Adu gertakan kartu & keberanian di meja Russian Roulette 1v1.",
    minPlayers: 2,
    maxPlayers: 2,
    Component: LiarsDeckBoard,
  },
];

export function getGameComponent(gameId: string): ComponentType<GameBoardProps> | null {
  return REGISTERED_GAMES.find((g) => g.id === gameId)?.Component ?? null;
}
