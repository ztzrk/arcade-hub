import type { GameMeta } from "@arcade-hub/shared";
import type { IGameEngine } from "./IGameEngine.ts";
import { haikyuuDraftEngine } from "./HaikyuuDraftEngine.ts";
import { liarsDeckEngine } from "./LiarsDeckEngine.ts";
import { susun4Engine } from "./Susun4Engine.ts";
import { tebakKarakterEngine } from "./TebakKarakterEngine.ts";
import { tebakKataEngine } from "./TebakKataEngine.ts";
import { ularTanggaEngine } from "./UlarTanggaEngine.ts";
import { unoNoMercyEngine } from "./UnoNoMercyEngine.ts";

const engines = new Map<string, IGameEngine<any, any, any>>([
  [haikyuuDraftEngine.id, haikyuuDraftEngine],
  [liarsDeckEngine.id, liarsDeckEngine],
  [tebakKataEngine.id, tebakKataEngine],
  [tebakKarakterEngine.id, tebakKarakterEngine],
  [susun4Engine.id, susun4Engine],
  [ularTanggaEngine.id, ularTanggaEngine],
  [unoNoMercyEngine.id, unoNoMercyEngine],
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
