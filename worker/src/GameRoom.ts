import { DurableObject } from "cloudflare:workers";
import {
  TAUNT_EMOTES,
  type ClientMessage,
  type ErrorCode,
  type GameEvent,
  type PlayerSeat,
  type PublicPlayer,
  type PublicRoomState,
  type RoomPhase,
  type ServerMessage,
  type TauntEmoteId,
} from "@arcade-hub/shared";
import { EngineError } from "./engines/IGameEngine.ts";
import { getEngine } from "./engines/registry.ts";

interface StoredPlayer {
  id: string;
  token: string;
  name: string;
  seat: PlayerSeat;
  ready: boolean;
  connected: boolean;
  score: number;
  lastTauntAt: number;
}

interface StoredRoomState {
  roomId: string;
  phase: RoomPhase;
  players: StoredPlayer[];
  customStake: string;
  selectedGameId: string;
  lastWinnerId: string | null;
  engineState: unknown | null;
  idleCleanupAt?: number;
}

interface SocketAttachment {
  playerId: string;
  playerToken: string;
  seat: PlayerSeat;
}

const ROOM_STORAGE_KEY = "room";
const TAUNT_COOLDOWN_MS = 1200;
const IDLE_CLEANUP_MS = 24 * 60 * 60 * 1000;
const VALID_TAUNT_IDS = new Set<string>(TAUNT_EMOTES.map((t) => t.id));

export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  ALLOWED_ORIGIN?: string;
}

export class GameRoom extends DurableObject<Env> {
  private room: StoredRoomState | null = null;

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const roomIdFromPath = url.pathname.split("/").filter(Boolean).pop() ?? "ROOM";
    await this.ensureState(roomIdFromPath.toUpperCase());

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    await this.refreshCleanupAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") {
      this.sendTo(ws, {
        type: "ERROR",
        code: "BAD_MESSAGE",
        message: "Pesan biner tidak didukung.",
      });
      return;
    }

    let msg: ClientMessage;
    try {
      msg = JSON.parse(rawMessage) as ClientMessage;
    } catch {
      this.sendTo(ws, {
        type: "ERROR",
        code: "BAD_MESSAGE",
        message: "Format JSON tidak valid.",
      });
      return;
    }

    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") {
      this.sendTo(ws, {
        type: "ERROR",
        code: "BAD_MESSAGE",
        message: "Struktur pesan tidak valid.",
      });
      return;
    }

    if (msg.type === "PING") {
      this.sendTo(ws, { type: "PONG", ts: msg.ts, serverTime: Date.now() });
      return;
    }

    const state = await this.ensureState();
    await this.refreshCleanupAlarm(state);

    if (msg.type === "JOIN_ROOM") {
      await this.handleJoinRoom(ws, state, msg);
      return;
    }

    const attachment = this.getAttachment(ws);
    if (!attachment) {
      this.sendError(ws, "INVALID_ACTION", "Sesi belum bergabung ke room.");
      return;
    }

    const player = state.players.find((p) => p.id === attachment.playerId);
    if (!player) {
      this.sendError(ws, "INVALID_ACTION", "Pemain tidak ditemukan di room.");
      return;
    }

    switch (msg.type) {
      case "SET_STAKE": {
        if (state.phase === "IN_GAME") {
          this.sendError(ws, "INVALID_ACTION", "Stake tidak bisa diubah saat match berjalan.");
          return;
        }
        state.customStake = String(msg.stakeText ?? "").trim().slice(0, 80);
        await this.persistState(state);
        this.broadcastRoomState(state);
        return;
      }

      case "SELECT_GAME": {
        if (state.phase !== "LOBBY") {
          this.sendError(ws, "INVALID_ACTION", "Pilih game hanya bisa dilakukan di lobi.");
          return;
        }
        const engine = getEngine(msg.gameId);
        if (!engine) {
          this.sendError(ws, "GAME_NOT_FOUND", "Game tidak ditemukan.");
          return;
        }
        state.selectedGameId = engine.id;
        for (const p of state.players) {
          p.ready = false;
        }
        await this.persistState(state);
        this.broadcastRoomState(state);
        return;
      }

      case "SET_READY": {
        if (state.phase === "IN_GAME") {
          this.sendError(ws, "INVALID_ACTION", "Match sedang berjalan.");
          return;
        }
        player.ready = Boolean(msg.ready);
        await this.persistState(state);
        this.broadcastRoomState(state);
        return;
      }

      case "START_MATCH": {
        await this.handleStartMatch(ws, state);
        return;
      }

      case "RETURN_TO_LOBBY": {
        if (state.phase === "IN_GAME") {
          this.sendError(ws, "INVALID_ACTION", "Selesaikan match terlebih dahulu.");
          return;
        }
        state.phase = "LOBBY";
        state.engineState = null;
        for (const p of state.players) {
          p.ready = false;
        }
        await this.persistState(state);
        await this.scheduleNextAlarm(state);
        this.broadcastRoomState(state);
        return;
      }

      case "GAME_ACTION": {
        await this.handleGameAction(ws, state, player, msg.action);
        return;
      }

      case "SEND_TAUNT": {
        await this.handleSendTaunt(ws, state, player, msg.emoteId);
        return;
      }

      case "REQUEST_SYNC": {
        this.sendTo(ws, {
          type: "ROOM_STATE",
          room: this.toPublicRoom(state),
        });
        if (state.engineState !== null) {
          const engine = getEngine(state.selectedGameId);
          if (engine) {
            this.sendTo(ws, {
              type: "GAME_STATE",
              view: engine.getViewForPlayer(state.engineState, player.id),
              events: [],
              serverTime: Date.now(),
            });
          }
        }
        return;
      }

      default: {
        this.sendError(ws, "BAD_MESSAGE", "Tipe pesan tidak dikenal.");
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleDisconnect(ws);
  }

  async alarm(): Promise<void> {
    const state = await this.ensureState();
    const now = Date.now();

    if (state.phase === "IN_GAME" && state.engineState !== null) {
      const engine = getEngine(state.selectedGameId);
      const nextTimeout = engine?.getNextTimeoutAt?.(state.engineState) ?? null;
      if (nextTimeout !== null && nextTimeout <= now + 100 && engine?.handleTimeout) {
        const result = engine.handleTimeout(state.engineState, now);
        if (result) {
          state.engineState = result.newState;
          if (result.matchWinnerId) {
            const winner = state.players.find((p) => p.id === result.matchWinnerId);
            if (winner) {
              winner.score += 1;
            }
            state.lastWinnerId = result.matchWinnerId;
            state.phase = "MATCH_OVER";
          }
          await this.persistState(state);
          if (result.matchWinnerId) {
            this.broadcastRoomState(state);
          }
          this.broadcastGameViews(state, result.events, now);
        }
      }
    }

    const activeSockets = this.ctx.getWebSockets();
    const pendingEngineTimeout =
      state.phase === "IN_GAME" && state.engineState !== null
        ? (getEngine(state.selectedGameId)?.getNextTimeoutAt?.(state.engineState) ?? null)
        : null;
    const idleCleanupAt = state.idleCleanupAt ?? now + IDLE_CLEANUP_MS;

    if (activeSockets.length === 0 && pendingEngineTimeout === null && now >= idleCleanupAt) {
      this.room = null;
      await this.ctx.storage.deleteAll();
      return;
    }

    if (activeSockets.length > 0 && now >= idleCleanupAt) {
      state.idleCleanupAt = now + IDLE_CLEANUP_MS;
      await this.persistState(state);
    }

    await this.scheduleNextAlarm(state);
  }

  private async handleJoinRoom(
    ws: WebSocket,
    state: StoredRoomState,
    msg: Extract<ClientMessage, { type: "JOIN_ROOM" }>
  ): Promise<void> {
    const cleanName = String(msg.playerName ?? "").trim().slice(0, 24) || "Player";
    const incomingToken = typeof msg.playerToken === "string" ? msg.playerToken.trim() : "";

    if (msg.roomId && state.roomId === "ROOM") {
      state.roomId = msg.roomId.toUpperCase();
    }

    let player = incomingToken
      ? state.players.find((p) => p.token === incomingToken)
      : undefined;

    if (player) {
      player.name = cleanName;
      player.connected = true;
      // Close any stale socket previously bound to this player
      for (const existingWs of this.ctx.getWebSockets()) {
        if (existingWs === ws) continue;
        const att = this.getAttachment(existingWs);
        if (att?.playerId === player.id) {
          try {
            existingWs.close(4000, "Replaced by newer connection");
          } catch {
            // ignore already closed socket
          }
        }
      }
    } else {
      if (state.players.length >= 2) {
        this.sendError(ws, "ROOM_FULL", "Room sudah penuh (maksimal 2 pemain).");
        return;
      }

      const takenSeats = new Set(state.players.map((p) => p.seat));
      const seat: PlayerSeat = takenSeats.has(0) ? 1 : 0;
      player = {
        id: crypto.randomUUID(),
        token: crypto.randomUUID(),
        name: cleanName,
        seat,
        ready: false,
        connected: true,
        score: 0,
        lastTauntAt: 0,
      };
      state.players.push(player);
      state.players.sort((a, b) => a.seat - b.seat);
    }

    const attachment: SocketAttachment = {
      playerId: player.id,
      playerToken: player.token,
      seat: player.seat,
    };
    ws.serializeAttachment(attachment);

    await this.persistState(state);

    this.sendTo(ws, {
      type: "SESSION_ASSIGNED",
      playerId: player.id,
      playerToken: player.token,
      seat: player.seat,
    });

    this.broadcastRoomState(state);

    if (state.engineState !== null) {
      const engine = getEngine(state.selectedGameId);
      if (engine) {
        this.sendTo(ws, {
          type: "GAME_STATE",
          view: engine.getViewForPlayer(state.engineState, player.id),
          events: [],
          serverTime: Date.now(),
        });
      }
    }
  }

  private async handleStartMatch(ws: WebSocket, state: StoredRoomState): Promise<void> {
    if (state.phase === "IN_GAME") {
      this.sendError(ws, "INVALID_ACTION", "Match sudah berjalan.");
      return;
    }
    if (state.players.length !== 2) {
      this.sendError(ws, "INVALID_ACTION", "Menunggu pasangan bergabung ke room.");
      return;
    }
    if (!state.players.every((p) => p.ready)) {
      this.sendError(ws, "INVALID_ACTION", "Kedua pemain harus menekan Ready terlebih dahulu.");
      return;
    }

    const engine = getEngine(state.selectedGameId);
    if (!engine) {
      this.sendError(ws, "GAME_NOT_FOUND", "Game engine tidak ditemukan.");
      return;
    }

    const sorted = [...state.players].sort((a, b) => a.seat - b.seat);
    const p1 = sorted[0]!;
    const p2 = sorted[1]!;
    const now = Date.now();

    state.phase = "IN_GAME";
    state.lastWinnerId = null;
    state.idleCleanupAt = now + IDLE_CLEANUP_MS;
    state.engineState = engine.initState([p1.id, p2.id], now);
    for (const p of state.players) {
      p.ready = false;
    }

    await this.persistState(state);
    await this.scheduleNextAlarm(state);
    this.broadcastRoomState(state);
    this.broadcastGameViews(
      state,
      [{ type: "MATCH_STARTED", payload: { gameId: engine.id } }],
      now
    );
  }

  private async handleGameAction(
    ws: WebSocket,
    state: StoredRoomState,
    player: StoredPlayer,
    action: unknown
  ): Promise<void> {
    if (state.phase !== "IN_GAME" || state.engineState === null) {
      this.sendError(ws, "INVALID_ACTION", "Tidak ada match yang sedang berlangsung.");
      return;
    }

    const engine = getEngine(state.selectedGameId);
    if (!engine) {
      this.sendError(ws, "GAME_NOT_FOUND", "Game engine tidak ditemukan.");
      return;
    }

    try {
      const now = Date.now();
      const result = engine.handleAction(state.engineState, player.id, action, now);
      state.engineState = result.newState;

      if (result.matchWinnerId) {
        const winner = state.players.find((p) => p.id === result.matchWinnerId);
        if (winner) {
          winner.score += 1;
        }
        state.lastWinnerId = result.matchWinnerId;
        state.phase = "MATCH_OVER";
      }

      await this.persistState(state);
      await this.scheduleNextAlarm(state);
      if (result.matchWinnerId) {
        this.broadcastRoomState(state);
      }
      this.broadcastGameViews(state, result.events, now);
    } catch (err) {
      if (err instanceof EngineError) {
        this.sendError(ws, err.code, err.message);
        return;
      }
      this.sendError(ws, "INVALID_ACTION", "Aksi tidak valid.");
    }
  }

  private async handleSendTaunt(
    ws: WebSocket,
    state: StoredRoomState,
    player: StoredPlayer,
    emoteId: TauntEmoteId
  ): Promise<void> {
    if (!VALID_TAUNT_IDS.has(emoteId)) {
      this.sendError(ws, "INVALID_ACTION", "Emote tidak dikenal.");
      return;
    }

    const now = Date.now();
    if (now - player.lastTauntAt < TAUNT_COOLDOWN_MS) {
      this.sendError(ws, "RATE_LIMITED", "Tunggu sebentar sebelum kirim taunt lagi.");
      return;
    }

    player.lastTauntAt = now;
    await this.persistState(state);

    this.broadcast({
      type: "TAUNT_RECEIVED",
      fromPlayerId: player.id,
      fromName: player.name,
      emoteId,
    });
  }

  private async handleDisconnect(ws: WebSocket): Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) return;

    const state = await this.ensureState();
    const stillHasOpenSocket = this.ctx.getWebSockets().some((other) => {
      if (other === ws) return false;
      const att = this.getAttachment(other);
      return att?.playerId === attachment.playerId;
    });

    if (stillHasOpenSocket) return;

    const player = state.players.find((p) => p.id === attachment.playerId);
    if (player && player.connected) {
      player.connected = false;
      await this.persistState(state);
      this.broadcastRoomState(state);
    }
  }

  private async ensureState(defaultRoomId = "ROOM"): Promise<StoredRoomState> {
    if (this.room) {
      return this.room;
    }

    const stored = await this.ctx.storage.get<StoredRoomState>(ROOM_STORAGE_KEY);
    if (stored) {
      // Reconcile connected flags against currently live WebSockets after wake/eviction
      const activeIds = new Set<string>();
      for (const socket of this.ctx.getWebSockets()) {
        const att = this.getAttachment(socket);
        if (att) activeIds.add(att.playerId);
      }
      for (const p of stored.players) {
        p.connected = activeIds.has(p.id);
      }
      this.room = stored;
      return stored;
    }

    const fresh: StoredRoomState = {
      roomId: defaultRoomId,
      phase: "LOBBY",
      players: [],
      customStake: "",
      selectedGameId: "liars-deck",
      lastWinnerId: null,
      engineState: null,
      idleCleanupAt: Date.now() + IDLE_CLEANUP_MS,
    };
    this.room = fresh;
    await this.ctx.storage.put(ROOM_STORAGE_KEY, fresh);
    return fresh;
  }

  private async persistState(state: StoredRoomState): Promise<void> {
    this.room = state;
    await this.ctx.storage.put(ROOM_STORAGE_KEY, state);
  }

  private async refreshCleanupAlarm(state?: StoredRoomState): Promise<void> {
    const target = state ?? this.room;
    const idleAt = Date.now() + IDLE_CLEANUP_MS;
    if (target) {
      target.idleCleanupAt = idleAt;
      await this.scheduleNextAlarm(target);
      return;
    }
    await this.ctx.storage.setAlarm(idleAt);
  }

  private async scheduleNextAlarm(state: StoredRoomState): Promise<void> {
    const idleAt = state.idleCleanupAt ?? Date.now() + IDLE_CLEANUP_MS;
    let engineAt: number | null = null;
    if (state.phase === "IN_GAME" && state.engineState !== null) {
      const engine = getEngine(state.selectedGameId);
      engineAt = engine?.getNextTimeoutAt?.(state.engineState) ?? null;
    }
    const nextAlarm = engineAt !== null ? Math.min(engineAt, idleAt) : idleAt;
    await this.ctx.storage.setAlarm(nextAlarm);
  }

  private getAttachment(ws: WebSocket): SocketAttachment | null {
    try {
      const raw = ws.deserializeAttachment() as SocketAttachment | null;
      if (raw && typeof raw.playerId === "string") {
        return raw;
      }
      return null;
    } catch {
      return null;
    }
  }

  private toPublicRoom(state: StoredRoomState): PublicRoomState {
    const players: PublicPlayer[] = state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      ready: p.ready,
      connected: p.connected,
      score: p.score,
    }));

    return {
      roomId: state.roomId,
      phase: state.phase,
      players,
      customStake: state.customStake,
      selectedGameId: state.selectedGameId,
      lastWinnerId: state.lastWinnerId,
    };
  }

  private broadcastRoomState(state: StoredRoomState): void {
    this.broadcast({
      type: "ROOM_STATE",
      room: this.toPublicRoom(state),
    });
  }

  private broadcastGameViews(
    state: StoredRoomState,
    events: GameEvent[],
    serverTime = Date.now()
  ): void {
    if (state.engineState === null) return;
    const engine = getEngine(state.selectedGameId);
    if (!engine) return;

    for (const ws of this.ctx.getWebSockets()) {
      const att = this.getAttachment(ws);
      if (!att) continue;
      try {
        const view = engine.getViewForPlayer(state.engineState, att.playerId);
        this.sendTo(ws, {
          type: "GAME_STATE",
          view,
          events,
          serverTime,
        });
      } catch {
        // Ignore sockets not belonging to a match participant
      }
    }
  }

  private broadcast(message: ServerMessage): void {
    const serialized = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(serialized);
      } catch {
        // Socket may be closing
      }
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Socket may be closing
    }
  }

  private sendError(ws: WebSocket, code: ErrorCode, message: string): void {
    this.sendTo(ws, { type: "ERROR", code, message });
  }
}
