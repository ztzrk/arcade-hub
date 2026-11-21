import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientMessage,
  GameEvent,
  PlayerSeat,
  PublicRoomState,
  ServerMessage,
  TauntEmoteId,
} from "@arcade-hub/shared";
import { soundManager } from "../shared/audio";

export interface FloatingTaunt {
  uid: string;
  fromPlayerId: string;
  fromName: string;
  emoteId: TauntEmoteId;
}

export type SocketStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

interface StoredSession {
  playerToken: string;
  playerName: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";
const ACTIVE_ROOM_KEY = "arcade-hub:active-room";
const LAST_NAME_KEY = "arcade-hub:last-player-name";

function getSessionKey(roomId: string): string {
  return `arcade-hub:session:${roomId.toUpperCase()}`;
}

function loadSession(roomId: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(getSessionKey(roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed?.playerToken ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(roomId: string, session: StoredSession): void {
  const cleanRoom = roomId.toUpperCase();
  try {
    sessionStorage.setItem(getSessionKey(cleanRoom), JSON.stringify(session));
    sessionStorage.setItem(ACTIVE_ROOM_KEY, cleanRoom);
  } catch {
    // ignore storage errors
  }
}

function clearSession(roomId?: string | null): void {
  try {
    if (roomId) {
      sessionStorage.removeItem(getSessionKey(roomId));
    }
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  } catch {
    // ignore storage errors
  }
}

export function loadLastPlayerName(): string {
  try {
    return localStorage.getItem(LAST_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveLastPlayerName(playerName: string): void {
  try {
    localStorage.setItem(LAST_NAME_KEY, playerName);
  } catch {
    // ignore storage errors
  }
}

function getResumeRoomId(): string | null {
  if (typeof window === "undefined") return null;
  const fromUrl = new URLSearchParams(window.location.search)
    .get("room")
    ?.trim()
    .toUpperCase();
  if (fromUrl) return fromUrl;
  try {
    return sessionStorage.getItem(ACTIVE_ROOM_KEY)?.trim().toUpperCase() || null;
  } catch {
    return null;
  }
}

function syncRoomQueryParam(roomId: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (roomId) {
    url.searchParams.set("room", roomId.toUpperCase());
  } else {
    url.searchParams.delete("room");
  }
  window.history.replaceState({}, "", url.toString());
}

function buildWsUrl(roomId: string): string {
  const cleanId = roomId.toUpperCase();
  if (API_BASE) {
    const wsBase = API_BASE.replace(/^http/i, "ws");
    return `${wsBase}/api/ws/${cleanId}`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws/${cleanId}`;
}

export async function createRoom(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/rooms`, { method: "POST" });
  if (!res.ok) {
    throw new Error("Gagal membuat room baru.");
  }
  const data = (await res.json()) as { roomId: string };
  return data.roomId;
}

export function useGameSocket() {
  const [status, setStatus] = useState<SocketStatus>("idle");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [seat, setSeat] = useState<PlayerSeat | null>(null);
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [gameView, setGameView] = useState<unknown | null>(null);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [taunts, setTaunts] = useState<FloatingTaunt[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [resumingRoomId, setResumingRoomId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const activeCredsRef = useRef<{ roomId: string; playerName: string } | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const lastSyncAtRef = useRef(0);
  const transientTimersRef = useRef<Set<number>>(new Set());
  const intentionalCloseRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current !== null) {
      window.clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    for (const timerId of transientTimersRef.current) {
      window.clearTimeout(timerId);
    }
    transientTimersRef.current.clear();
  }, []);

  const sendMessage = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const connectInternal = useCallback(
    (roomId: string, playerName: string, isReconnect = false) => {
      clearTimers();
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close();
      }

      const normalizedRoom = roomId.trim().toUpperCase();
      const cleanName = playerName.trim().slice(0, 24) || "Player";
      activeCredsRef.current = { roomId: normalizedRoom, playerName: cleanName };
      intentionalCloseRef.current = false;
      saveLastPlayerName(cleanName);
      syncRoomQueryParam(normalizedRoom);

      setStatus(isReconnect ? "reconnecting" : "connecting");
      setErrorBanner(null);

      const ws = new WebSocket(buildWsUrl(normalizedRoom));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus("connected");

        const saved = loadSession(normalizedRoom);
        ws.send(
          JSON.stringify({
            type: "JOIN_ROOM",
            roomId: normalizedRoom,
            playerName: cleanName,
            playerToken: saved?.playerToken,
          } satisfies ClientMessage)
        );

        pingTimerRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING", ts: Date.now() } satisfies ClientMessage));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(event.data)) as ServerMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case "SESSION_ASSIGNED": {
            setPlayerId(msg.playerId);
            setSeat(msg.seat);
            saveSession(normalizedRoom, {
              playerToken: msg.playerToken,
              playerName: cleanName,
            });
            return;
          }
          case "ROOM_STATE": {
            setRoom(msg.room);
            setResumingRoomId(null);
            if (msg.room.phase === "LOBBY") {
              setGameView(null);
            }
            return;
          }
          case "GAME_STATE": {
            setGameView(msg.view);
            setLastEvents(msg.events);
            return;
          }
          case "TAUNT_RECEIVED": {
            soundManager.play("taunt");
            const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setTaunts((prev) => [
              ...prev.slice(-4),
              {
                uid,
                fromPlayerId: msg.fromPlayerId,
                fromName: msg.fromName,
                emoteId: msg.emoteId,
              },
            ]);
            const tauntTimer = window.setTimeout(() => {
              transientTimersRef.current.delete(tauntTimer);
              setTaunts((prev) => prev.filter((item) => item.uid !== uid));
            }, 2600);
            transientTimersRef.current.add(tauntTimer);
            return;
          }
          case "ERROR": {
            setErrorBanner(msg.message);
            if (msg.code === "ROOM_FULL") {
              intentionalCloseRef.current = true;
              clearSession(normalizedRoom);
              setResumingRoomId(null);
              setStatus("error");
            }
            const errorTimer = window.setTimeout(() => {
              transientTimersRef.current.delete(errorTimer);
              setErrorBanner((cur) => (cur === msg.message ? null : cur));
            }, 4000);
            transientTimersRef.current.add(errorTimer);
            return;
          }
          case "PONG":
            return;
        }
      };

      ws.onclose = () => {
        clearTimers();
        if (intentionalCloseRef.current) return;

        const creds = activeCredsRef.current;
        if (!creds) {
          setStatus("idle");
          return;
        }

        const attempt = reconnectAttemptRef.current;
        if (attempt >= 8) {
          setStatus("error");
          setResumingRoomId(null);
          setErrorBanner("Koneksi terputus. Silakan muat ulang halaman.");
          return;
        }

        const delayMs = Math.min(8000, 600 * Math.pow(1.6, attempt));
        reconnectAttemptRef.current = attempt + 1;
        setStatus("reconnecting");
        reconnectTimerRef.current = window.setTimeout(() => {
          connectInternal(creds.roomId, creds.playerName, true);
        }, delayMs);
      };

      ws.onerror = () => {
        // onclose handles retry
      };
    },
    [clearTimers]
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      soundManager.unlock();
      connectInternal(roomId, playerName, false);
    },
    [connectInternal]
  );

  const leaveRoom = useCallback(() => {
    const leavingRoomId = activeCredsRef.current?.roomId ?? getResumeRoomId();
    intentionalCloseRef.current = true;
    activeCredsRef.current = null;
    clearTimers();
    wsRef.current?.close();
    wsRef.current = null;
    clearSession(leavingRoomId);
    syncRoomQueryParam(null);
    setResumingRoomId(null);
    setStatus("idle");
    setRoom(null);
    setGameView(null);
    setPlayerId(null);
    setSeat(null);
  }, [clearTimers]);

  useEffect(() => {
    const resumeRoom = getResumeRoomId();
    if (resumeRoom) {
      const saved = loadSession(resumeRoom);
      if (saved?.playerToken && saved.playerName) {
        setResumingRoomId(resumeRoom);
        connectInternal(resumeRoom, saved.playerName, false);
      }
    }

    const syncOnFocus = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastSyncAtRef.current < 400) return;
      lastSyncAtRef.current = now;

      const creds = activeCredsRef.current;
      if (!creds) return;

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "REQUEST_SYNC" } satisfies ClientMessage));
      } else if (!intentionalCloseRef.current) {
        reconnectAttemptRef.current = 0;
        connectInternal(creds.roomId, creds.playerName, true);
      }
    };

    window.addEventListener("focus", syncOnFocus);
    document.addEventListener("visibilitychange", syncOnFocus);

    return () => {
      window.removeEventListener("focus", syncOnFocus);
      document.removeEventListener("visibilitychange", syncOnFocus);
      intentionalCloseRef.current = true;
      clearTimers();
      wsRef.current?.close();
    };
  }, [clearTimers, connectInternal]);

  return {
    status,
    playerId,
    seat,
    room,
    gameView,
    lastEvents,
    taunts,
    errorBanner,
    resumingRoomId,
    joinRoom,
    leaveRoom,
    setStake: (stakeText: string) => sendMessage({ type: "SET_STAKE", stakeText }),
    selectGame: (gameId: string) => sendMessage({ type: "SELECT_GAME", gameId }),
    setReady: (ready: boolean) => sendMessage({ type: "SET_READY", ready }),
    startMatch: () => sendMessage({ type: "START_MATCH" }),
    returnToLobby: () => sendMessage({ type: "RETURN_TO_LOBBY" }),
    sendGameAction: (action: unknown) => sendMessage({ type: "GAME_ACTION", action }),
    sendTaunt: (emoteId: TauntEmoteId) => sendMessage({ type: "SEND_TAUNT", emoteId }),
  };
}
