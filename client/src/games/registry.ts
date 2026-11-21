import type { ComponentType } from "react";
import type { GameMeta } from "@arcade-hub/shared";
import { LiarsDeckBoard, type GameBoardProps } from "./liars-deck/LiarsDeckBoard";
import { TebakKarakterBoard } from "./tebak-karakter/TebakKarakterBoard";
import { TebakKataBoard } from "./tebak-kata/TebakKataBoard";

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
];

export function getGameComponent(gameId: string): ComponentType<GameBoardProps> | null {
  return REGISTERED_GAMES.find((g) => g.id === gameId)?.Component ?? null;
}
