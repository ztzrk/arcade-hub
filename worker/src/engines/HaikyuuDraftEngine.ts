import {
  COURT_SLOTS,
  HAIKYUU_PLAYERS,
  KARASUNO_FORMATIONS,
  SCHOOL_PACKS,
  drawPackCandidates,
  evaluateTeam,
  findBestAutoSlot,
  getPlayersForSchoolPack,
  getPositionFit,
  rollSchoolPack,
  simulatePvpSet,
  type CourtSlotId,
  type FormationId,
  type GameEvent,
  type HaikyuuDraftAction,
  type HaikyuuDraftCandidate,
  type HaikyuuDraftPhase,
  type HaikyuuDraftView,
  type HaikyuuPlayer,
  type LineupMap,
  type PvpSetScore,
  type SchoolPack,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

export const HAIKYUU_DRAFT_TOTAL_ROUNDS = COURT_SLOTS.length; // 7
export const HAIKYUU_DRAFT_ROUND_MS = 15_000;
export const HAIKYUU_TACTICS_MS = 20_000;
export const HAIKYUU_INTERMISSION_MS = 12_000;
const BEST_OF_SETS = 3;
const SETS_TO_WIN = 2;

const VALID_SLOTS = new Set<CourtSlotId>(COURT_SLOTS.map((s) => s.id));
const VALID_FORMATIONS = new Set<FormationId>(KARASUNO_FORMATIONS.map((f) => f.id));

export interface HaikyuuDraftState {
  playerIds: [string, string];
  phase: HaikyuuDraftPhase;
  roundNumber: number;
  phaseDeadlineAt: number | null;
  phaseDurationMs: number;
  usedPackIds: string[];
  currentPack: SchoolPack | null;
  candidates: HaikyuuDraftCandidate[];
  lineups: Record<string, LineupMap>;
  pendingPicks: Record<string, HaikyuuPlayer | null>;
  formations: Record<string, FormationId>;
  tacticsLocked: Record<string, boolean>;
  setsWon: Record<string, number>;
  setScores: PvpSetScore[];
  readyForNextSet: Record<string, boolean>;
  tacticalEdgeSummary: string | null;
  winnerId: string | null;
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

function countLineupPlayers(lineup: LineupMap): number {
  let count = 0;
  for (const slot of COURT_SLOTS) {
    if (lineup[slot.id]) count += 1;
  }
  return count;
}

function collectDraftedPlayerIds(
  lineups: Record<string, LineupMap>,
  pendingPicks: Record<string, HaikyuuPlayer | null>
): Set<string> {
  const drafted = new Set<string>();
  for (const lineup of Object.values(lineups)) {
    for (const slot of COURT_SLOTS) {
      const player = lineup[slot.id];
      if (player) drafted.add(player.id);
    }
  }
  for (const pending of Object.values(pendingPicks)) {
    if (pending) drafted.add(pending.id);
  }
  return drafted;
}

function rollRoundPackAndCandidates(
  usedPackIds: readonly string[],
  draftedIds: ReadonlySet<string>,
  rng: () => number
): { pack: SchoolPack; candidates: HaikyuuDraftCandidate[] } {
  const usedSet = new Set(usedPackIds);
  const viableUnused = SCHOOL_PACKS.filter(
    (pack) =>
      !usedSet.has(pack.id) &&
      getPlayersForSchoolPack(pack.id, draftedIds).length >= 2
  );

  let pack: SchoolPack;
  if (viableUnused.length > 0) {
    const totalWeight = viableUnused.reduce((sum, p) => sum + p.weight, 0);
    let r = rng() * totalWeight;
    pack = viableUnused[viableUnused.length - 1]!;
    for (const candidatePack of viableUnused) {
      r -= candidatePack.weight;
      if (r <= 0) {
        pack = candidatePack;
        break;
      }
    }
  } else {
    pack = rollSchoolPack(usedSet, draftedIds, rng);
  }

  const drawn = drawPackCandidates(pack.id, draftedIds, 4, rng);
  if (drawn.length < 2) {
    const chosenIds = new Set(drawn.map((p) => p.id));
    const fallbackPool = HAIKYUU_PLAYERS.filter(
      (p) => !draftedIds.has(p.id) && !chosenIds.has(p.id)
    ).sort((a, b) => b.ovr - a.ovr);
    while (drawn.length < 2 && fallbackPool.length > 0) {
      drawn.push(fallbackPool.shift()!);
    }
  }

  return {
    pack,
    candidates: drawn.map((player) => ({
      player,
      claimedByPlayerId: null,
    })),
  };
}

function selectBestCandidateForPlayer(
  candidates: readonly HaikyuuDraftCandidate[],
  lineup: LineupMap
): HaikyuuPlayer | null {
  const available = candidates
    .filter((c) => c.claimedByPlayerId === null)
    .map((c) => c.player);
  if (available.length === 0) return null;

  let bestPlayer = available[0]!;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const player of available) {
    const bestSlot = findBestAutoSlot(player, lineup);
    const penalty = bestSlot ? getPositionFit(player, bestSlot).penalty : 20;
    const score = player.ovr - penalty * 3;
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = player;
    }
  }

  return bestPlayer;
}

function advanceAfterDraftRound(
  state: HaikyuuDraftState,
  now: number,
  rng: () => number
): { nextState: HaikyuuDraftState; events: GameEvent[] } {
  if (state.roundNumber >= HAIKYUU_DRAFT_TOTAL_ROUNDS) {
    const [p1, p2] = state.playerIds;
    const nextState: HaikyuuDraftState = {
      ...state,
      phase: "TACTICS",
      phaseDeadlineAt: now + HAIKYUU_TACTICS_MS,
      phaseDurationMs: HAIKYUU_TACTICS_MS,
      currentPack: null,
      candidates: [],
      tacticsLocked: { [p1]: false, [p2]: false },
    };
    return {
      nextState,
      events: [{ type: "DRAFT_COMPLETED" }],
    };
  }

  const nextRound = state.roundNumber + 1;
  const draftedIds = collectDraftedPlayerIds(state.lineups, state.pendingPicks);
  const { pack, candidates } = rollRoundPackAndCandidates(
    state.usedPackIds,
    draftedIds,
    rng
  );

  const nextState: HaikyuuDraftState = {
    ...state,
    roundNumber: nextRound,
    phaseDeadlineAt: now + HAIKYUU_DRAFT_ROUND_MS,
    phaseDurationMs: HAIKYUU_DRAFT_ROUND_MS,
    usedPackIds: [...state.usedPackIds, pack.id],
    currentPack: pack,
    candidates,
  };
  return {
    nextState,
    events: [
      {
        type: "DRAFT_ROUND_STARTED",
        payload: { roundNumber: nextRound, packId: pack.id },
      },
    ],
  };
}

function runNextSetSimulation(
  state: HaikyuuDraftState,
  now: number,
  rng: () => number
): EngineResult<HaikyuuDraftState> {
  const [p1, p2] = state.playerIds;
  const form1 = state.formations[p1]!;
  const form2 = state.formations[p2]!;
  const lineup1 = state.lineups[p1]!;
  const lineup2 = state.lineups[p2]!;
  const eval1 = evaluateTeam(lineup1, form1);
  const eval2 = evaluateTeam(lineup2, form2);

  const setNumber = state.setScores.length + 1;
  const targetPoints = setNumber === BEST_OF_SETS ? 15 : 25;

  const sim = simulatePvpSet(
    p1,
    "Pemain 1",
    eval1,
    lineup1,
    form1,
    p2,
    "Pemain 2",
    eval2,
    lineup2,
    form2,
    setNumber,
    targetPoints,
    rng
  );

  const nextSetsWon: Record<string, number> = {
    [p1]: (state.setsWon[p1] ?? 0) + (sim.winnerId === p1 ? 1 : 0),
    [p2]: (state.setsWon[p2] ?? 0) + (sim.winnerId === p2 ? 1 : 0),
  };

  const nextSetScores: PvpSetScore[] = [
    ...state.setScores,
    {
      setNumber: sim.setNumber,
      scores: sim.scores,
      winnerId: sim.winnerId,
      highlight: sim.highlight,
    },
  ];

  const matchWinnerId =
    nextSetsWon[p1]! >= SETS_TO_WIN
      ? p1
      : nextSetsWon[p2]! >= SETS_TO_WIN
        ? p2
        : undefined;

  const events: GameEvent[] = [
    {
      type: "SET_COMPLETED",
      payload: {
        setNumber: sim.setNumber,
        winnerId: sim.winnerId,
        scores: sim.scores,
      },
    },
  ];

  if (matchWinnerId) {
    events.push({ type: "MATCH_COMPLETED", payload: { winnerId: matchWinnerId } });
  }

  return {
    newState: {
      ...state,
      phase: matchWinnerId ? "MATCH_END" : "MATCH",
      phaseDeadlineAt: matchWinnerId ? null : now + HAIKYUU_INTERMISSION_MS,
      phaseDurationMs: matchWinnerId ? 0 : HAIKYUU_INTERMISSION_MS,
      setsWon: nextSetsWon,
      setScores: nextSetScores,
      readyForNextSet: { [p1]: false, [p2]: false },
      tacticalEdgeSummary: sim.tacticalSummary,
      winnerId: matchWinnerId ?? null,
    },
    events,
    matchWinnerId,
  };
}

export class HaikyuuDraftEngine
  implements IGameEngine<HaikyuuDraftState, HaikyuuDraftAction, HaikyuuDraftView>
{
  readonly id = "haikyuu-draft";
  readonly name = "Haikyuu!! Race Draft 1v1";
  readonly tagline =
    "Adu cepat rebutan pemain Haikyuu!! tiap 15 detik, racik sinergi & formasi, lalu duel Best of 3!";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string], now = Date.now()): HaikyuuDraftState {
    const [p1, p2] = playerIds;
    const { pack, candidates } = rollRoundPackAndCandidates([], new Set(), this.rng);

    return {
      playerIds,
      phase: "DRAFT",
      roundNumber: 1,
      phaseDeadlineAt: now + HAIKYUU_DRAFT_ROUND_MS,
      phaseDurationMs: HAIKYUU_DRAFT_ROUND_MS,
      usedPackIds: [pack.id],
      currentPack: pack,
      candidates,
      lineups: { [p1]: {}, [p2]: {} },
      pendingPicks: { [p1]: null, [p2]: null },
      formations: { [p1]: "run-gun", [p2]: "run-gun" },
      tacticsLocked: { [p1]: false, [p2]: false },
      setsWon: { [p1]: 0, [p2]: 0 },
      setScores: [],
      readyForNextSet: { [p1]: false, [p2]: false },
      tacticalEdgeSummary: null,
      winnerId: null,
    };
  }

  handleAction(
    state: HaikyuuDraftState,
    playerId: string,
    action: HaikyuuDraftAction,
    now = Date.now()
  ): EngineResult<HaikyuuDraftState> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }

    getOpponentId(state.playerIds, playerId);

    switch (action.type) {
      case "CLAIM_PLAYER":
        return this.handleClaimPlayer(state, playerId, action.playerId, action.slotId, now);
      case "PLACE_PLAYER":
        return this.handlePlacePlayer(state, playerId, action.slotId, now);
      case "SWAP_SLOTS":
        return this.handleSwapSlots(state, playerId, action.slotA, action.slotB);
      case "SET_FORMATION":
        return this.handleSetFormation(state, playerId, action.formationId);
      case "LOCK_TACTICS":
        return this.handleLockTactics(state, playerId, now);
      case "READY_NEXT_SET":
        return this.handleReadyNextSet(state, playerId, now);
      default:
        throw new EngineError("INVALID_ACTION", "Tipe aksi tidak dikenal.");
    }
  }

  getNextTimeoutAt(state: HaikyuuDraftState): number | null {
    if (state.phase === "MATCH_END") return null;
    return state.phaseDeadlineAt;
  }

  handleTimeout(state: HaikyuuDraftState, now: number): EngineResult<HaikyuuDraftState> | null {
    if (state.phase === "MATCH_END" || state.phaseDeadlineAt === null) {
      return null;
    }
    if (now < state.phaseDeadlineAt - 100) {
      return null;
    }

    if (state.phase === "DRAFT") {
      return this.resolveDraftRoundTimeout(state, now);
    }
    if (state.phase === "TACTICS") {
      const [p1, p2] = state.playerIds;
      const lockedState: HaikyuuDraftState = {
        ...state,
        tacticsLocked: { [p1]: true, [p2]: true },
      };
      const simRes = runNextSetSimulation(lockedState, now, this.rng);
      return {
        ...simRes,
        events: [{ type: "TACTICS_AUTO_LOCKED" }, ...simRes.events],
      };
    }
    if (state.phase === "MATCH") {
      return runNextSetSimulation(state, now, this.rng);
    }
    return null;
  }

  getViewForPlayer(state: HaikyuuDraftState, playerId: string): HaikyuuDraftView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    const myLineup = { ...(state.lineups[playerId] ?? {}) };
    const opponentLineup = { ...(state.lineups[opponentId] ?? {}) };
    const myFormation = state.formations[playerId] ?? "run-gun";
    const oppFormation = state.formations[opponentId] ?? "run-gun";
    const hideOpponentFormation = state.phase === "TACTICS";

    return {
      phase: state.phase,
      roundNumber: state.roundNumber,
      totalRounds: HAIKYUU_DRAFT_TOTAL_ROUNDS,
      phaseDeadlineAt: state.phaseDeadlineAt,
      phaseDurationMs: state.phaseDurationMs,
      currentPack: state.currentPack,
      candidates: state.candidates.map((c) => ({ ...c })),
      me: {
        lineup: myLineup,
        pendingPlayer: state.pendingPicks[playerId] ?? null,
        formationId: myFormation,
        tacticsLocked: Boolean(state.tacticsLocked[playerId]),
        evaluation: evaluateTeam(myLineup, myFormation),
      },
      opponent: {
        lineup: opponentLineup,
        pendingPlayer: state.pendingPicks[opponentId] ?? null,
        formationId: hideOpponentFormation ? null : oppFormation,
        tacticsLocked: Boolean(state.tacticsLocked[opponentId]),
        evaluation: evaluateTeam(
          opponentLineup,
          hideOpponentFormation ? "all-out-sync" : oppFormation
        ),
      },
      setsWon: { ...state.setsWon },
      setScores: state.setScores.map((s) => ({ ...s, scores: { ...s.scores } })),
      bestOf: BEST_OF_SETS,
      readyForNextSet: { ...state.readyForNextSet },
      tacticalEdgeSummary:
        state.phase === "MATCH" || state.phase === "MATCH_END"
          ? state.tacticalEdgeSummary
          : null,
      winnerId: state.winnerId,
    };
  }

  private handleClaimPlayer(
    state: HaikyuuDraftState,
    playerId: string,
    targetPlayerId: string,
    slotId: CourtSlotId | undefined,
    now: number
  ): EngineResult<HaikyuuDraftState> {
    if (state.phase !== "DRAFT") {
      throw new EngineError("INVALID_ACTION", "Klaim pemain hanya bisa saat fase draft.");
    }

    const myLineup = state.lineups[playerId] ?? {};
    if (
      state.pendingPicks[playerId] !== null ||
      countLineupPlayers(myLineup) >= state.roundNumber
    ) {
      throw new EngineError("INVALID_ACTION", "Kamu sudah memilih pemain di ronde ini.");
    }

    const idx = state.candidates.findIndex((c) => c.player.id === targetPlayerId);
    if (idx === -1) {
      throw new EngineError("INVALID_ACTION", "Pemain tidak ada dalam pack ronde ini.");
    }

    const candidate = state.candidates[idx]!;
    if (candidate.claimedByPlayerId !== null) {
      throw new EngineError(
        "INVALID_ACTION",
        `${candidate.player.name} sudah direbut lawan!`
      );
    }

    const nextCandidates = state.candidates.map((c, i) =>
      i === idx ? { ...c, claimedByPlayerId: playerId } : c
    );

    let nextLineup = { ...myLineup };
    let nextPending: HaikyuuPlayer | null = candidate.player;

    if (slotId !== undefined) {
      if (!VALID_SLOTS.has(slotId)) {
        throw new EngineError("INVALID_ACTION", "Slot posisi tidak valid.");
      }
      if (nextLineup[slotId]) {
        throw new EngineError("INVALID_ACTION", `Slot ${slotId} sudah terisi.`);
      }
      nextLineup = { ...nextLineup, [slotId]: candidate.player };
      nextPending = null;
    }

    const updatedState: HaikyuuDraftState = {
      ...state,
      candidates: nextCandidates,
      lineups: { ...state.lineups, [playerId]: nextLineup },
      pendingPicks: { ...state.pendingPicks, [playerId]: nextPending },
    };

    const events: GameEvent[] = [
      {
        type: "PLAYER_CLAIMED",
        payload: {
          byPlayerId: playerId,
          claimedPlayerId: candidate.player.id,
          placedSlotId: slotId ?? null,
        },
      },
    ];

    if (this.bothCompletedDraftRound(updatedState)) {
      const advanced = advanceAfterDraftRound(updatedState, now, this.rng);
      return {
        newState: advanced.nextState,
        events: [...events, ...advanced.events],
      };
    }

    return { newState: updatedState, events };
  }

  private handlePlacePlayer(
    state: HaikyuuDraftState,
    playerId: string,
    slotId: CourtSlotId,
    now: number
  ): EngineResult<HaikyuuDraftState> {
    if (state.phase !== "DRAFT") {
      throw new EngineError("INVALID_ACTION", "Penempatan slot hanya berlaku saat draft.");
    }
    const pending = state.pendingPicks[playerId];
    if (!pending) {
      throw new EngineError("INVALID_ACTION", "Pilih pemain dari pack terlebih dahulu.");
    }
    if (!VALID_SLOTS.has(slotId)) {
      throw new EngineError("INVALID_ACTION", "Slot posisi tidak valid.");
    }

    const myLineup = state.lineups[playerId] ?? {};
    if (myLineup[slotId]) {
      throw new EngineError("INVALID_ACTION", `Slot ${slotId} sudah terisi.`);
    }

    const updatedState: HaikyuuDraftState = {
      ...state,
      lineups: {
        ...state.lineups,
        [playerId]: { ...myLineup, [slotId]: pending },
      },
      pendingPicks: {
        ...state.pendingPicks,
        [playerId]: null,
      },
    };

    const events: GameEvent[] = [
      {
        type: "PLAYER_PLACED",
        payload: { byPlayerId: playerId, placedPlayerId: pending.id, slotId },
      },
    ];

    if (this.bothCompletedDraftRound(updatedState)) {
      const advanced = advanceAfterDraftRound(updatedState, now, this.rng);
      return {
        newState: advanced.nextState,
        events: [...events, ...advanced.events],
      };
    }

    return { newState: updatedState, events };
  }

  private handleSwapSlots(
    state: HaikyuuDraftState,
    playerId: string,
    slotA: CourtSlotId,
    slotB: CourtSlotId
  ): EngineResult<HaikyuuDraftState> {
    if (state.phase !== "TACTICS" && state.phase !== "MATCH") {
      throw new EngineError(
        "INVALID_ACTION",
        "Tukar posisi hanya bisa dilakukan di fase taktik atau jeda set."
      );
    }
    if (state.phase === "TACTICS" && state.tacticsLocked[playerId]) {
      throw new EngineError("INVALID_ACTION", "Lineup sudah dikunci.");
    }
    if (state.phase === "MATCH" && state.readyForNextSet[playerId]) {
      throw new EngineError("INVALID_ACTION", "Kamu sudah siap untuk set berikutnya.");
    }
    if (!VALID_SLOTS.has(slotA) || !VALID_SLOTS.has(slotB) || slotA === slotB) {
      throw new EngineError("INVALID_ACTION", "Pilih dua slot yang berbeda.");
    }

    const myLineup = { ...(state.lineups[playerId] ?? {}) };
    const playerA = myLineup[slotA];
    const playerB = myLineup[slotB];
    if (!playerA && !playerB) {
      throw new EngineError("INVALID_ACTION", "Kedua slot kosong.");
    }

    if (playerB) myLineup[slotA] = playerB;
    else delete myLineup[slotA];
    if (playerA) myLineup[slotB] = playerA;
    else delete myLineup[slotB];

    return {
      newState: {
        ...state,
        lineups: { ...state.lineups, [playerId]: myLineup },
      },
      events: [{ type: "SLOTS_SWAPPED", payload: { byPlayerId: playerId } }],
    };
  }

  private handleSetFormation(
    state: HaikyuuDraftState,
    playerId: string,
    formationId: FormationId
  ): EngineResult<HaikyuuDraftState> {
    if (state.phase !== "TACTICS" && state.phase !== "MATCH") {
      throw new EngineError(
        "INVALID_ACTION",
        "Formasi hanya bisa diubah di fase taktik atau jeda set."
      );
    }
    if (state.phase === "TACTICS" && state.tacticsLocked[playerId]) {
      throw new EngineError("INVALID_ACTION", "Lineup sudah dikunci.");
    }
    if (state.phase === "MATCH" && state.readyForNextSet[playerId]) {
      throw new EngineError("INVALID_ACTION", "Kamu sudah siap untuk set berikutnya.");
    }
    if (!VALID_FORMATIONS.has(formationId)) {
      throw new EngineError("INVALID_ACTION", "Formasi tidak valid.");
    }

    return {
      newState: {
        ...state,
        formations: { ...state.formations, [playerId]: formationId },
      },
      events: [],
    };
  }

  private handleLockTactics(
    state: HaikyuuDraftState,
    playerId: string,
    now: number
  ): EngineResult<HaikyuuDraftState> {
    if (state.phase !== "TACTICS") {
      throw new EngineError("INVALID_ACTION", "Bukan fase penguncian taktik.");
    }
    if (state.tacticsLocked[playerId]) {
      throw new EngineError("INVALID_ACTION", "Taktik sudah dikunci.");
    }

    const nextLocked: Record<string, boolean> = {
      ...state.tacticsLocked,
      [playerId]: true,
    };

    const nextState: HaikyuuDraftState = {
      ...state,
      tacticsLocked: nextLocked,
    };

    const [p1, p2] = state.playerIds;
    if (nextLocked[p1] && nextLocked[p2]) {
      return runNextSetSimulation(nextState, now, this.rng);
    }

    return {
      newState: nextState,
      events: [{ type: "PLAYER_TACTICS_LOCKED", payload: { byPlayerId: playerId } }],
    };
  }

  private handleReadyNextSet(
    state: HaikyuuDraftState,
    playerId: string,
    now: number
  ): EngineResult<HaikyuuDraftState> {
    if (state.phase !== "MATCH") {
      throw new EngineError("INVALID_ACTION", "Pertandingan tidak dalam jeda set.");
    }
    if (state.readyForNextSet[playerId]) {
      throw new EngineError("INVALID_ACTION", "Kamu sudah siap untuk set berikutnya.");
    }

    const nextReady: Record<string, boolean> = {
      ...state.readyForNextSet,
      [playerId]: true,
    };

    const [p1, p2] = state.playerIds;
    if (nextReady[p1] && nextReady[p2]) {
      return runNextSetSimulation(
        { ...state, readyForNextSet: nextReady },
        now,
        this.rng
      );
    }

    return {
      newState: {
        ...state,
        readyForNextSet: nextReady,
      },
      events: [],
    };
  }

  private resolveDraftRoundTimeout(
    state: HaikyuuDraftState,
    now: number
  ): EngineResult<HaikyuuDraftState> {
    const [p1, p2] = state.playerIds;
    const order: [string, string] =
      (state.roundNumber - 1) % 2 === 0 ? [p1, p2] : [p2, p1];

    let candidates = state.candidates.map((c) => ({ ...c }));
    const lineups: Record<string, LineupMap> = {
      [p1]: { ...(state.lineups[p1] ?? {}) },
      [p2]: { ...(state.lineups[p2] ?? {}) },
    };
    const pendingPicks: Record<string, HaikyuuPlayer | null> = {
      [p1]: state.pendingPicks[p1] ?? null,
      [p2]: state.pendingPicks[p2] ?? null,
    };

    for (const pid of order) {
      const lineup = lineups[pid]!;
      if (countLineupPlayers(lineup) >= state.roundNumber) continue;

      let playerToPlace = pendingPicks[pid];
      if (!playerToPlace) {
        playerToPlace = selectBestCandidateForPlayer(candidates, lineup);
        if (playerToPlace) {
          candidates = candidates.map((c) =>
            c.player.id === playerToPlace!.id
              ? { ...c, claimedByPlayerId: pid }
              : c
          );
        }
      }

      if (playerToPlace) {
        const autoSlot = findBestAutoSlot(playerToPlace, lineup);
        if (autoSlot) {
          lineups[pid] = { ...lineup, [autoSlot]: playerToPlace };
        }
      }
      pendingPicks[pid] = null;
    }

    const resolvedState: HaikyuuDraftState = {
      ...state,
      candidates,
      lineups,
      pendingPicks,
    };
    const advanced = advanceAfterDraftRound(resolvedState, now, this.rng);
    return {
      newState: advanced.nextState,
      events: [
        { type: "DRAFT_ROUND_TIMEOUT", payload: { roundNumber: state.roundNumber } },
        ...advanced.events,
      ],
    };
  }

  private bothCompletedDraftRound(state: HaikyuuDraftState): boolean {
    const [p1, p2] = state.playerIds;
    return (
      state.pendingPicks[p1] === null &&
      state.pendingPicks[p2] === null &&
      countLineupPlayers(state.lineups[p1] ?? {}) >= state.roundNumber &&
      countLineupPlayers(state.lineups[p2] ?? {}) >= state.roundNumber
    );
  }
}

export const haikyuuDraftEngine = new HaikyuuDraftEngine();
