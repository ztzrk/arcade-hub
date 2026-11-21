import { describe, expect, it } from "vitest";
import {
  COURT_SLOTS,
  HAIKYUU_PLAYER_BY_ID,
  HAIKYUU_PLAYERS,
  HARUKO_BRACKET,
  SCHOOL_PACKS,
  evaluateTeam,
  getPlayersForSchoolPack,
  getPositionFit,
  getPotentialResonances,
  rollSchoolPack,
  simulateFullTournament,
  simulateHarukoMatch,
  type LineupMap,
} from "@arcade-hub/shared";

function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("Haikyuu Haruko Draft Engine", () => {
  it("has valid unique players, school packs, and court slots", () => {
    expect(COURT_SLOTS).toHaveLength(7);
    expect(SCHOOL_PACKS.length).toBeGreaterThanOrEqual(12);
    expect(HAIKYUU_PLAYERS.length).toBeGreaterThanOrEqual(55);

    const ids = new Set(HAIKYUU_PLAYERS.map((p) => p.id));
    expect(ids.size).toBe(HAIKYUU_PLAYERS.length);

    for (const pack of SCHOOL_PACKS) {
      const players = getPlayersForSchoolPack(pack.id, new Set());
      expect(players.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("evaluates position fit accurately (perfect, flex, and out-of-position)", () => {
    const kageyama = HAIKYUU_PLAYER_BY_ID.get("kageyama")!;
    const hinata = HAIKYUU_PLAYER_BY_ID.get("hinata")!;
    const nishinoya = HAIKYUU_PLAYER_BY_ID.get("nishinoya")!;
    const asahi = HAIKYUU_PLAYER_BY_ID.get("asahi")!;
    const osamu = HAIKYUU_PLAYER_BY_ID.get("osamu")!;

    expect(getPositionFit(kageyama, "S")).toMatchObject({ fit: "PERFECT", penalty: 0 });
    expect(getPositionFit(hinata, "MB1")).toMatchObject({ fit: "PERFECT", penalty: 0 });
    expect(getPositionFit(nishinoya, "L")).toMatchObject({ fit: "PERFECT", penalty: 0 });

    // Wing flex (OH <-> OP)
    expect(getPositionFit(asahi, "OP")).toMatchObject({ fit: "FLEX", penalty: 3 });

    // Versatile setter like Osamu in S
    expect(getPositionFit(osamu, "S")).toMatchObject({ fit: "FLEX", penalty: 4 });

    // Libero forced to play front-row spiker
    expect(getPositionFit(nishinoya, "OH1")).toMatchObject({ fit: "OUT", penalty: 16 });
  });

  it("activates Freak Quick, Karasuno Spirit, and other iconic synergies", () => {
    const lineup: LineupMap = {
      S: HAIKYUU_PLAYER_BY_ID.get("kageyama")!,
      MB1: HAIKYUU_PLAYER_BY_ID.get("hinata")!,
      MB2: HAIKYUU_PLAYER_BY_ID.get("tsukishima")!,
      OH1: HAIKYUU_PLAYER_BY_ID.get("asahi")!,
      OH2: HAIKYUU_PLAYER_BY_ID.get("bokuto")!,
      OP: HAIKYUU_PLAYER_BY_ID.get("ushijima")!,
      L: HAIKYUU_PLAYER_BY_ID.get("nishinoya")!,
    };

    const evalResult = evaluateTeam(lineup, "run-gun");
    const synergyIds = evalResult.activeSynergies.map((s) => s.id);

    expect(synergyIds).toContain("freak-quick");
    expect(synergyIds).toContain("guardian-and-ace");
    expect(synergyIds).toContain("karasuno-spirit");
    expect(evalResult.karasunoCount).toBe(5);
    expect(evalResult.fitPenaltyTotal).toBe(0);
    expect(evalResult.totalOvr).toBeGreaterThan(95);

    const resonancesForHinata = getPotentialResonances(
      HAIKYUU_PLAYER_BY_ID.get("hinata")!,
      { S: HAIKYUU_PLAYER_BY_ID.get("kageyama")! }
    );
    expect(resonancesForHinata.map((r) => r.id)).toContain("freak-quick");
    expect(resonancesForHinata.map((r) => r.id)).toContain("karasuno-spirit");
  });

  it("rolls distinct school packs without repeating already-used packs", () => {
    const rng = createSeededRng(42);
    const usedPacks = new Set<string>();
    const draftedPlayers = new Set<string>();

    for (let round = 0; round < 7; round++) {
      const pack = rollSchoolPack(usedPacks, draftedPlayers, rng);
      expect(usedPacks.has(pack.id)).toBe(false);
      usedPacks.add(pack.id);

      const candidates = getPlayersForSchoolPack(pack.id, draftedPlayers);
      expect(candidates.length).toBeGreaterThan(0);
      draftedPlayers.add(candidates[0]!.id);
    }
  });

  it("simulates volleyball sets with authentic deuce/win-by-2 rules and full Haruko bracket", () => {
    const dreamLineup: LineupMap = {
      S: HAIKYUU_PLAYER_BY_ID.get("kageyama")!,
      MB1: HAIKYUU_PLAYER_BY_ID.get("hinata")!,
      MB2: HAIKYUU_PLAYER_BY_ID.get("hirugami")!,
      OH1: HAIKYUU_PLAYER_BY_ID.get("sakusa")!,
      OH2: HAIKYUU_PLAYER_BY_ID.get("hoshiumi")!,
      OP: HAIKYUU_PLAYER_BY_ID.get("ushijima")!,
      L: HAIKYUU_PLAYER_BY_ID.get("komori")!,
    };

    const evalDream = evaluateTeam(dreamLineup, "cannon-ace");
    const rng = createSeededRng(12345);
    const matchRes = simulateHarukoMatch(evalDream, dreamLineup, HARUKO_BRACKET[0]!, rng);

    expect(matchRes.sets.length).toBeGreaterThanOrEqual(2);
    for (const s of matchRes.sets) {
      const target = s.setNumber === 5 ? 15 : 25;
      expect(Math.max(s.karasuno, s.opponent)).toBeGreaterThanOrEqual(target);
      expect(Math.abs(s.karasuno - s.opponent)).toBeGreaterThanOrEqual(2);
    }

    const fullRun = simulateFullTournament(evalDream, dreamLineup, createSeededRng(999));
    expect(fullRun.matches.length).toBeGreaterThanOrEqual(1);
    if (fullRun.champion) {
      expect(fullRun.matches).toHaveLength(HARUKO_BRACKET.length);
      expect(fullRun.matchesWon).toBe(HARUKO_BRACKET.length);
    }
  });
});
