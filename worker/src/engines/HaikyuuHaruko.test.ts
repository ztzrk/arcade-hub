import { describe, expect, it } from "vitest";
import {
  COURT_SLOTS,
  HAIKYUU_PLAYER_BY_ID,
  HAIKYUU_PLAYERS,
  HAIKYUU_SYNERGY_CATALOG,
  HARUKO_BRACKET,
  SCHOOL_PACKS,
  computeActiveSynergies,
  computeMatchupEdge,
  createLiveMatchState,
  createSeededRng as sharedSeededRng,
  drawPackCandidates,
  evaluateTeam,
  finalizeLiveMatch,
  getDailyChallengeKey,
  getFormationStatus,
  getPlayersForSchoolPack,
  getPositionFit,
  getPotentialResonances,
  playNextMatchSet,
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

    const crossSchoolEval = evaluateTeam(
      {
        S: HAIKYUU_PLAYER_BY_ID.get("oikawa")!,
        OP: HAIKYUU_PLAYER_BY_ID.get("ushijima")!,
        OH1: HAIKYUU_PLAYER_BY_ID.get("bokuto")!,
        OH2: HAIKYUU_PLAYER_BY_ID.get("hoshiumi")!,
        MB1: HAIKYUU_PLAYER_BY_ID.get("kuroo")!,
        MB2: HAIKYUU_PLAYER_BY_ID.get("hirugami")!,
        L: HAIKYUU_PLAYER_BY_ID.get("komori")!,
      },
      "all-out-sync"
    );
    const crossIds = crossSchoolEval.activeSynergies.map((s) => s.id);
    expect(crossIds).toContain("miyagi-dream");
    expect(crossIds).toContain("tokyo-captains");
    expect(crossIds).toContain("national-block-wall");
    expect(crossIds).toContain("all-japan-youth");
  });

  it("rolls distinct school packs without repeating already-used packs", () => {
    const rng = createSeededRng(42);
    const usedPacks = new Set<string>();
    const draftedPlayers = new Set<string>();

    for (let round = 0; round < 7; round++) {
      const pack = rollSchoolPack(usedPacks, draftedPlayers, rng);
      expect(usedPacks.has(pack.id)).toBe(false);
      usedPacks.add(pack.id);

      const candidates = drawPackCandidates(pack.id, draftedPlayers, 3, rng);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.length).toBeLessThanOrEqual(3);
      draftedPlayers.add(candidates[0]!.id);
    }
  });

  it("keeps match outcomes competitive so 2-0 sweeps are not automatic", () => {
    const midLineup: LineupMap = {
      S: HAIKYUU_PLAYER_BY_ID.get("akaashi")!, // 90
      MB1: HAIKYUU_PLAYER_BY_ID.get("tsukishima")!, // 89
      MB2: HAIKYUU_PLAYER_BY_ID.get("matsukawa")!, // 84
      OH1: HAIKYUU_PLAYER_BY_ID.get("tanaka")!, // 86
      OH2: HAIKYUU_PLAYER_BY_ID.get("goshiki")!, // 86
      OP: HAIKYUU_PLAYER_BY_ID.get("daichi")!, // 86
      L: HAIKYUU_PLAYER_BY_ID.get("akagi")!, // 87
    };
    const evalMid = evaluateTeam(midLineup, "total-defense");
    expect(evalMid.totalOvr).toBeLessThan(91);

    expect(HARUKO_BRACKET).toHaveLength(10);

    const rng = createSeededRng(777);
    let lostSets = 0;
    let sweeps = 0;
    for (let i = 0; i < 40; i++) {
      const m = simulateHarukoMatch(evalMid, midLineup, HARUKO_BRACKET[5]!, rng);
      lostSets += m.opponentSets;
      if (m.won && m.opponentSets === 0) sweeps += 1;
    }
    expect(lostSets).toBeGreaterThan(10);
    expect(sweeps).toBeLessThan(25);
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

  it("tracks formation status, tactical matchups, and set-by-set live matches", () => {
    const lineup: LineupMap = {
      S: HAIKYUU_PLAYER_BY_ID.get("kageyama")!,
      MB1: HAIKYUU_PLAYER_BY_ID.get("hinata")!,
      MB2: HAIKYUU_PLAYER_BY_ID.get("hirugami")!,
      OH1: HAIKYUU_PLAYER_BY_ID.get("sakusa")!,
      OH2: HAIKYUU_PLAYER_BY_ID.get("hoshiumi")!,
      OP: HAIKYUU_PLAYER_BY_ID.get("ushijima")!,
      L: HAIKYUU_PLAYER_BY_ID.get("komori")!,
    };

    const evalDream = evaluateTeam(lineup, "run-gun");

    const fStatus = getFormationStatus(
      lineup,
      "run-gun",
      evalDream.stats.defense,
      evalDream.activeSynergies.length
    );
    expect(fStatus.satisfied).toBe(true);
    expect(fStatus.bonus).toBe(1.8);
    expect(fStatus.checks.every((c) => c.met)).toBe(true);

    const edge = computeMatchupEdge(evalDream, HARUKO_BRACKET[7]!); // Kamomedai
    expect(edge.deltaOvr).toBeGreaterThanOrEqual(-1.4);
    expect(edge.deltaOvr).toBeLessThanOrEqual(1.6);

    const rng = createSeededRng(2026);
    let live = createLiveMatchState(evalDream, lineup, HARUKO_BRACKET[3]!, rng); // Best of 5
    expect(live.finished).toBe(false);
    live = playNextMatchSet(live, rng);
    expect(live.sets).toHaveLength(1);

    while (!live.finished) {
      live = playNextMatchSet(live, rng);
    }
    const finalRes = finalizeLiveMatch(live);
    expect(Math.max(finalRes.karasunoSets, finalRes.opponentSets)).toBe(3);

    // Synergy catalog coverage
    const catalogIds = new Set(HAIKYUU_SYNERGY_CATALOG.map((c) => c.id));
    for (const syn of evalDream.activeSynergies) {
      expect(catalogIds.has(syn.id)).toBe(true);
    }
  });

  it("produces deterministic sequences with shared seeded RNG and valid daily keys", () => {
    const key = getDailyChallengeKey(new Date(2026, 10, 23));
    expect(key).toBe("2026-11-23");

    const rngA = sharedSeededRng(`haruko-daily-draft:${key}`);
    const rngB = sharedSeededRng(`haruko-daily-draft:${key}`);

    const packA = rollSchoolPack(new Set(), new Set(), rngA);
    const packB = rollSchoolPack(new Set(), new Set(), rngB);
    expect(packA.id).toBe(packB.id);

    const candA = drawPackCandidates(packA.id, new Set(), 3, rngA).map((p) => p.id);
    const candB = drawPackCandidates(packB.id, new Set(), 3, rngB).map((p) => p.id);
    expect(candA).toEqual(candB);
  });

  it("includes expanded key school players and activates their new synergies", () => {
    expect(HAIKYUU_PLAYERS.length).toBe(84);

    const catalogIds = new Set(HAIKYUU_SYNERGY_CATALOG.map((c) => c.id));
    const evalKitagawa = evaluateTeam(
      {
        S: HAIKYUU_PLAYER_BY_ID.get("suwa")!,
        MB1: HAIKYUU_PLAYER_BY_ID.get("kindaichi")!,
        MB2: HAIKYUU_PLAYER_BY_ID.get("hirugami")!,
        OP: HAIKYUU_PLAYER_BY_ID.get("kunimi")!,
        OH1: HAIKYUU_PLAYER_BY_ID.get("hyakuzawa")!,
        OH2: HAIKYUU_PLAYER_BY_ID.get("kinoshita")!,
        L: HAIKYUU_PLAYER_BY_ID.get("shibayama")!,
      },
      "all-out-sync"
    );
    const synIds = evalKitagawa.activeSynergies.map((s) => s.id);
    expect(synIds).toContain("kitagawa-turn");
    expect(synIds).toContain("kamomedai-command");
    expect(synIds).toContain("miyagi-rookies");
    for (const id of synIds) {
      expect(catalogIds.has(id)).toBe(true);
    }

    const evalShiratoriFloat = evaluateTeam(
      {
        S: HAIKYUU_PLAYER_BY_ID.get("semi")!,
        OP: HAIKYUU_PLAYER_BY_ID.get("ushijima")!,
        MB1: HAIKYUU_PLAYER_BY_ID.get("yamaguchi")!,
        OH1: HAIKYUU_PLAYER_BY_ID.get("kinoshita")!,
      },
      "cannon-ace"
    );
    const synIds2 = evalShiratoriFloat.activeSynergies.map((s) => s.id);
    expect(synIds2).toContain("shiratori-clash");
    expect(synIds2).toContain("jump-float-duo");
    for (const id of synIds2) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it("ensures every 85+ OVR player has at least one synergy and catalog stays in sync", () => {
    const allSynergies = computeActiveSynergies(HAIKYUU_PLAYERS);
    const catalogIds = new Set(HAIKYUU_SYNERGY_CATALOG.map((c) => c.id));
    const activeIds = new Set(allSynergies.map((s) => s.id));

    expect(activeIds.size).toBe(catalogIds.size);
    for (const id of activeIds) {
      expect(catalogIds.has(id)).toBe(true);
    }

    const coveredPlayers = new Set(allSynergies.flatMap((s) => s.involvedPlayerIds));
    const uncovered85Plus = HAIKYUU_PLAYERS.filter(
      (p) => p.ovr >= 85 && !coveredPlayers.has(p.id)
    );
    expect(uncovered85Plus).toEqual([]);
  });
});
