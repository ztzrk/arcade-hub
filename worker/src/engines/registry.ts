import type { GameMeta } from "@arcade-hub/shared";
import type { IGameEngine } from "./IGameEngine.ts";
import { liarsDeckEngine } from "./LiarsDeckEngine.ts";
import { tebakKataEngine } from "./TebakKataEngine.ts";

const engines = new Map<string, IGameEngine<any, any, any>>([
  [liarsDeckEngine.id, liarsDeckEngine],
  [tebakKataEngine.id, tebakKataEngine],
]);

export function getEngine(gameId: string): IGameEngine<any, any, any> | undefined {
  return engines.get(gameId);
}

export const GAME_CATALOG: GameMeta[] = Array.from(engines.values()).map((engine) => ({
  id: engine.id,
  name: engine.name,
  tagline: engine.tagline,
  minPlayers: engine.minPlayers,
  maxPlayers: engine.maxPlayers,
}));
