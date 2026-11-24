import {
  ULAR_TANGGA_CARDS,
  ULAR_TANGGA_LADDERS,
  ULAR_TANGGA_MAX_HAND,
  ULAR_TANGGA_MAX_TILE,
  ULAR_TANGGA_POWER_TILES,
  ULAR_TANGGA_SNAKES,
  ULAR_TANGGA_TRAP_PENALTY,
  isTrapTileEligible,
  type GameEvent,
  type UlarTanggaAction,
  type UlarTanggaCardEffect,
  type UlarTanggaCardId,
  type UlarTanggaDiceBuff,
  type UlarTanggaLastMove,
  type UlarTanggaPhase,
  type UlarTanggaTrap,
  type UlarTanggaView,
} from "@arcade-hub/shared";
import { EngineError, type EngineResult, type IGameEngine } from "./IGameEngine.ts";

const LADDER_MAP = new Map<number, number>(
  ULAR_TANGGA_LADDERS.map((l) => [l.from, l.to])
);
const SNAKE_MAP = new Map<number, number>(
  ULAR_TANGGA_SNAKES.map((s) => [s.from, s.to])
);
const POWER_TILE_SET = new Set<number>(ULAR_TANGGA_POWER_TILES);

const CARD_POOL: readonly UlarTanggaCardId[] = Object.keys(
  ULAR_TANGGA_CARDS
) as UlarTanggaCardId[];
const TOTAL_CARD_WEIGHT = CARD_POOL.reduce(
  (sum, id) => sum + ULAR_TANGGA_CARDS[id].weight,
  0
);

export interface UlarTanggaState {
  playerIds: [string, string];
  phase: UlarTanggaPhase;
  turnNumber: number;
  currentTurnPlayerId: string;
  positions: Record<string, number>;
  shielded: Record<string, boolean>;
  miniCursed: Record<string, boolean>;
  hands: Record<string, UlarTanggaCardId[]>;
  activeDiceBuff: UlarTanggaDiceBuff | null;
  cardPlayedThisTurn: boolean;
  usedBonusRollThisTurn: boolean;
  traps: UlarTanggaTrap[];
  moveNonce: number;
  effectNonce: number;
  lastMove: UlarTanggaLastMove | null;
  lastCardEffect: UlarTanggaCardEffect | null;
  winnerId: string | null;
}

function getOpponentId(playerIds: [string, string], playerId: string): string {
  if (playerIds[0] === playerId) return playerIds[1];
  if (playerIds[1] === playerId) return playerIds[0];
  throw new EngineError("INVALID_ACTION", "Pemain tidak terdaftar di match ini.");
}

function drawWeightedCard(rng: () => number): UlarTanggaCardId {
  let cursor = rng() * TOTAL_CARD_WEIGHT;
  for (const id of CARD_POOL) {
    cursor -= ULAR_TANGGA_CARDS[id].weight;
    if (cursor < 0) return id;
  }
  return CARD_POOL[CARD_POOL.length - 1]!;
}

function rollDie(sides: number, rng: () => number): number {
  return (Math.floor(rng() * sides) % sides) + 1;
}

/**
 * Modern 10x10 Snakes & Ladders engine with tactical power-up cards,
 * shields, traps, position swaps, and precision/turbo dice.
 */
export class UlarTanggaEngine
  implements IGameEngine<UlarTanggaState, UlarTanggaAction, UlarTanggaView>
{
  readonly id = "ular-tangga";
  readonly name = "Ular Tangga Taktis";
  readonly tagline =
    "Lomba ke petak 100 dengan perisai anti-ular, bom jebakan, tukar posisi & dadu spesial.";
  readonly minPlayers = 2;
  readonly maxPlayers = 2;

  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  initState(playerIds: [string, string]): UlarTanggaState {
    const [p1, p2] = playerIds;
    const starterIndex = this.rng() < 0.5 ? 0 : 1;
    const p1StartCard = drawWeightedCard(this.rng);
    const p2StartCard = drawWeightedCard(this.rng);

    return {
      playerIds,
      phase: "PLAYING",
      turnNumber: 1,
      currentTurnPlayerId: playerIds[starterIndex]!,
      positions: { [p1]: 0, [p2]: 0 },
      shielded: { [p1]: false, [p2]: false },
      miniCursed: { [p1]: false, [p2]: false },
      hands: { [p1]: [p1StartCard], [p2]: [p2StartCard] },
      activeDiceBuff: null,
      cardPlayedThisTurn: false,
      usedBonusRollThisTurn: false,
      traps: [],
      moveNonce: 0,
      effectNonce: 0,
      lastMove: null,
      lastCardEffect: null,
      winnerId: null,
    };
  }

  handleAction(
    state: UlarTanggaState,
    playerId: string,
    action: UlarTanggaAction
  ): EngineResult<UlarTanggaState> {
    if (!action || typeof action !== "object" || !("type" in action)) {
      throw new EngineError("INVALID_ACTION", "Format aksi tidak valid.");
    }
    const opponentId = getOpponentId(state.playerIds, playerId);

    if (state.phase !== "PLAYING") {
      throw new EngineError("INVALID_ACTION", "Match sudah selesai.");
    }
    if (state.currentTurnPlayerId !== playerId) {
      throw new EngineError("NOT_YOUR_TURN", "Sekarang bukan giliranmu.");
    }

    switch (action.type) {
      case "PLAY_CARD":
        return this.handlePlayCard(
          state,
          playerId,
          opponentId,
          action.cardIndex,
          action.targetTile
        );
      case "ROLL_DICE":
        return this.handleRollDice(state, playerId, opponentId, action.chosenRoll);
      default:
        throw new EngineError("INVALID_ACTION", "Aksi tidak dikenali.");
    }
  }

  private handlePlayCard(
    state: UlarTanggaState,
    playerId: string,
    opponentId: string,
    cardIndex: number,
    targetTile?: number
  ): EngineResult<UlarTanggaState> {
    if (state.cardPlayedThisTurn) {
      throw new EngineError(
        "INVALID_ACTION",
        "Kamu sudah memakai 1 kartu di giliran ini."
      );
    }

    const myHand = [...(state.hands[playerId] ?? [])];
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= myHand.length) {
      throw new EngineError("INVALID_ACTION", "Kartu tidak ditemukan di tangan.");
    }

    const cardId = myHand[cardIndex]!;
    const nextPositions = { ...state.positions };
    const nextShielded = { ...state.shielded };
    const nextMiniCursed = { ...state.miniCursed };
    let nextActiveDiceBuff = state.activeDiceBuff;
    const nextTraps = [...state.traps];
    const events: GameEvent[] = [];

    let blockedByShield = false;
    let detail = "";

    switch (cardId) {
      case "SHIELD": {
        if (nextShielded[playerId]) {
          throw new EngineError("INVALID_ACTION", "Perisaimu sudah aktif.");
        }
        nextShielded[playerId] = true;
        detail = "Mengaktifkan Perisai Anti-Ular 🛡️";
        break;
      }

      case "TURBO_DICE": {
        if (nextActiveDiceBuff !== null) {
          throw new EngineError(
            "INVALID_ACTION",
            "Efek dadu spesial sudah aktif di giliran ini."
          );
        }
        nextActiveDiceBuff = "TURBO";
        detail = "Mengaktifkan Dadu Turbo (2 dadu) ⚡";
        break;
      }

      case "SNIPER_DICE": {
        if (nextActiveDiceBuff !== null) {
          throw new EngineError(
            "INVALID_ACTION",
            "Efek dadu spesial sudah aktif di giliran ini."
          );
        }
        nextActiveDiceBuff = "SNIPER";
        detail = "Mengaktifkan Dadu Presisi (pilih angka 1–6) 🎯";
        break;
      }

      case "TRAP_BOMB": {
        const occupied = Object.values(nextPositions);
        if (
          targetTile === undefined ||
          !isTrapTileEligible(targetTile, occupied, nextTraps)
        ) {
          throw new EngineError(
            "INVALID_ACTION",
            "Pilih petak kosong (5–98) yang bukan ular, tangga, atau petak power-up."
          );
        }
        nextTraps.push({ tile: targetTile, ownerId: playerId });
        detail = `Memasang Bom Jebakan di petak ${targetTile} 💣`;
        break;
      }

      case "SWAP_POS": {
        const myPos = nextPositions[playerId] ?? 0;
        const oppPos = nextPositions[opponentId] ?? 0;
        if (myPos < 1 || oppPos < 1 || myPos === oppPos) {
          throw new EngineError(
            "INVALID_ACTION",
            "Kedua pemain harus sudah di papan dan di petak berbeda untuk tukar posisi."
          );
        }
        if (nextShielded[opponentId]) {
          nextShielded[opponentId] = false;
          blockedByShield = true;
          detail = "Tukar Posisi ditangkis oleh Perisai lawan! 🛡️";
          events.push({ type: "SHIELD_BLOCKED", payload: { targetId: opponentId } });
        } else {
          nextPositions[playerId] = oppPos;
          nextPositions[opponentId] = myPos;
          detail = `Menukar posisi! (${myPos} ⇄ ${oppPos}) 🔄`;
        }
        break;
      }

      case "MINI_CURSE": {
        if (nextMiniCursed[opponentId]) {
          throw new EngineError(
            "INVALID_ACTION",
            "Lawan sudah terkena kutukan Dadu Beku."
          );
        }
        if (nextShielded[opponentId]) {
          nextShielded[opponentId] = false;
          blockedByShield = true;
          detail = "Kutukan Dadu Beku ditangkis Perisai lawan! 🛡️";
          events.push({ type: "SHIELD_BLOCKED", payload: { targetId: opponentId } });
        } else {
          nextMiniCursed[opponentId] = true;
          detail = "Mengutuk lawan dengan Dadu Beku (giliran depan maks 1–3) ❄️";
        }
        break;
      }
    }

    myHand.splice(cardIndex, 1);
    const nextEffectNonce = state.effectNonce + 1;
    const effect: UlarTanggaCardEffect = {
      nonce: nextEffectNonce,
      playerId,
      cardId,
      blockedByShield,
      detail,
    };

    events.unshift({
      type: "CARD_PLAYED",
      payload: { playerId, cardId, blockedByShield, targetTile },
    });

    return {
      newState: {
        ...state,
        positions: nextPositions,
        shielded: nextShielded,
        miniCursed: nextMiniCursed,
        hands: {
          ...state.hands,
          [playerId]: myHand,
        },
        activeDiceBuff: nextActiveDiceBuff,
        cardPlayedThisTurn: true,
        traps: nextTraps,
        effectNonce: nextEffectNonce,
        lastCardEffect: effect,
      },
      events,
    };
  }

  private handleRollDice(
    state: UlarTanggaState,
    playerId: string,
    opponentId: string,
    chosenRoll?: number
  ): EngineResult<UlarTanggaState> {
    const nextMiniCursed = { ...state.miniCursed };
    const nextShielded = { ...state.shielded };
    const nextPositions = { ...state.positions };
    const myHand = [...(state.hands[playerId] ?? [])];
    let nextTraps = [...state.traps];
    const events: GameEvent[] = [];

    let dice: number[];
    let rawBonus = false;

    if (state.activeDiceBuff === "SNIPER") {
      if (
        chosenRoll === undefined ||
        !Number.isInteger(chosenRoll) ||
        chosenRoll < 1 ||
        chosenRoll > 6
      ) {
        throw new EngineError(
          "INVALID_ACTION",
          "Pilih angka Dadu Presisi antara 1 sampai 6."
        );
      }
      dice = [chosenRoll];
      nextMiniCursed[playerId] = false;
    } else if (state.activeDiceBuff === "TURBO") {
      const d1 = rollDie(6, this.rng);
      const d2 = rollDie(6, this.rng);
      dice = [d1, d2];
      nextMiniCursed[playerId] = false;
      rawBonus = d1 === d2;
    } else if (nextMiniCursed[playerId]) {
      const d1 = rollDie(3, this.rng);
      dice = [d1];
      nextMiniCursed[playerId] = false;
    } else {
      const d1 = rollDie(6, this.rng);
      dice = [d1];
      rawBonus = d1 === 6;
    }

    const totalRoll = dice.reduce((sum, v) => sum + v, 0);
    const fromTile = nextPositions[playerId] ?? 0;
    const rawTarget = fromTile + totalRoll;
    const bounced = rawTarget > ULAR_TANGGA_MAX_TILE;
    const landedTile = bounced
      ? ULAR_TANGGA_MAX_TILE - (rawTarget - ULAR_TANGGA_MAX_TILE)
      : rawTarget;

    events.push({
      type: "DICE_ROLLED",
      payload: { playerId, dice, totalRoll, fromTile, landedTile, bounced },
    });

    let currentTile = landedTile;
    let trapTile: number | null = null;
    let trapBlockedByShield = false;
    let portalKind: UlarTanggaLastMove["portalKind"] = null;
    let portalFrom: number | null = null;
    let portalTo: number | null = null;
    let drawnCard: UlarTanggaCardId | null = null;

    const won = currentTile === ULAR_TANGGA_MAX_TILE;

    if (!won) {
      // 1. Check enemy trap on landedTile
      const enemyTrapIdx = nextTraps.findIndex(
        (t) => t.tile === currentTile && t.ownerId !== playerId
      );
      if (enemyTrapIdx !== -1) {
        const trap = nextTraps[enemyTrapIdx]!;
        trapTile = trap.tile;
        nextTraps = nextTraps.filter((_, idx) => idx !== enemyTrapIdx);

        if (nextShielded[playerId]) {
          nextShielded[playerId] = false;
          trapBlockedByShield = true;
          events.push({ type: "SHIELD_BLOCKED", payload: { playerId, trapTile } });
        } else {
          currentTile = Math.max(1, currentTile - ULAR_TANGGA_TRAP_PENALTY);
          events.push({
            type: "TRAP_TRIGGERED",
            payload: { playerId, trapTile, pushedTo: currentTile },
          });
        }
      }

      // 2. Check ladder or snake on currentTile
      const ladderTo = LADDER_MAP.get(currentTile);
      const snakeTo = SNAKE_MAP.get(currentTile);

      if (ladderTo !== undefined) {
        portalKind = "LADDER";
        portalFrom = currentTile;
        portalTo = ladderTo;
        currentTile = ladderTo;
        events.push({
          type: "LADDER_CLIMB",
          payload: { playerId, from: portalFrom, to: portalTo },
        });
      } else if (snakeTo !== undefined) {
        if (nextShielded[playerId]) {
          nextShielded[playerId] = false;
          portalKind = "SNAKE_BLOCKED";
          portalFrom = currentTile;
          portalTo = currentTile;
          events.push({
            type: "SHIELD_BLOCKED",
            payload: { playerId, snakeFrom: portalFrom },
          });
        } else {
          portalKind = "SNAKE";
          portalFrom = currentTile;
          portalTo = snakeTo;
          currentTile = snakeTo;
          events.push({
            type: "SNAKE_BITE",
            payload: { playerId, from: portalFrom, to: portalTo },
          });
          // Modern comeback mechanic: draw a card if bitten by snake and hand has room
          if (myHand.length < ULAR_TANGGA_MAX_HAND) {
            drawnCard = drawWeightedCard(this.rng);
            myHand.push(drawnCard);
            events.push({
              type: "CARD_DRAWN",
              payload: { playerId, cardId: drawnCard, reason: "COMEBACK" },
            });
          }
        }
      }

      // 3. Check Power-Up tile on final position (if no comeback card already drawn)
      if (
        drawnCard === null &&
        POWER_TILE_SET.has(currentTile) &&
        myHand.length < ULAR_TANGGA_MAX_HAND
      ) {
        drawnCard = drawWeightedCard(this.rng);
        myHand.push(drawnCard);
        events.push({
          type: "CARD_DRAWN",
          payload: { playerId, cardId: drawnCard, reason: "POWER_TILE" },
        });
      }
    } else {
      events.push({
        type: "MATCH_WON",
        payload: { winnerId: playerId },
      });
    }

    nextPositions[playerId] = currentTile;

    const bonusRollGranted =
      !won && rawBonus && !state.usedBonusRollThisTurn;

    const nextMoveNonce = state.moveNonce + 1;
    const lastMove: UlarTanggaLastMove = {
      nonce: nextMoveNonce,
      playerId,
      dice,
      totalRoll,
      fromTile,
      landedTile,
      bounced,
      trapTile,
      trapBlockedByShield,
      portalKind,
      portalFrom,
      portalTo,
      toTile: currentTile,
      drawnCard,
      bonusRollGranted,
    };

    const nextPlayerId = won
      ? playerId
      : bonusRollGranted
        ? playerId
        : opponentId;

    return {
      newState: {
        ...state,
        phase: won ? "MATCH_END" : "PLAYING",
        turnNumber: won || bonusRollGranted ? state.turnNumber : state.turnNumber + 1,
        currentTurnPlayerId: nextPlayerId,
        positions: nextPositions,
        shielded: nextShielded,
        miniCursed: nextMiniCursed,
        hands: {
          ...state.hands,
          [playerId]: myHand,
        },
        activeDiceBuff: null,
        cardPlayedThisTurn: false,
        usedBonusRollThisTurn: won ? false : bonusRollGranted,
        traps: nextTraps,
        moveNonce: nextMoveNonce,
        lastMove,
        winnerId: won ? playerId : null,
      },
      events,
      roundWinnerId: won ? playerId : undefined,
      matchWinnerId: won ? playerId : undefined,
    };
  }

  getViewForPlayer(state: UlarTanggaState, playerId: string): UlarTanggaView {
    const opponentId = getOpponentId(state.playerIds, playerId);
    return {
      phase: state.phase,
      turnNumber: state.turnNumber,
      currentTurnPlayerId: state.currentTurnPlayerId,
      positions: state.positions,
      shielded: state.shielded,
      miniCursed: state.miniCursed,
      myHand: [...(state.hands[playerId] ?? [])],
      opponentCardCount: state.hands[opponentId]?.length ?? 0,
      activeDiceBuff: state.activeDiceBuff,
      cardPlayedThisTurn: state.cardPlayedThisTurn,
      usedBonusRollThisTurn: state.usedBonusRollThisTurn,
      traps: [...state.traps],
      lastMove: state.lastMove,
      lastCardEffect: state.lastCardEffect,
      winnerId: state.winnerId,
    };
  }
}

export const ularTanggaEngine = new UlarTanggaEngine();
