import { GameRoom, type Env } from "./GameRoom.ts";
import { GAME_CATALOG } from "./engines/registry.ts";

export { GameRoom };

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateRoomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "*";
  const allowedOrigin = env.ALLOWED_ORIGIN;
  const allowValue =
    allowedOrigin && origin !== allowedOrigin ? allowedOrigin : origin;

  return {
    "Access-Control-Allow-Origin": allowValue,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse({ ok: true }, 200, cors);
    }

    if (url.pathname === "/api/games" && request.method === "GET") {
      return jsonResponse({ games: GAME_CATALOG }, 200, cors);
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const roomId = generateRoomCode();
      return jsonResponse({ roomId }, 201, cors);
    }

    const wsMatch = url.pathname.match(/^\/api\/ws\/([A-Za-z0-9_-]{3,16})$/);
    if (wsMatch) {
      const roomId = wsMatch[1]!.toUpperCase();
      const id = env.GAME_ROOM.idFromName(roomId);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(request);
    }

    return jsonResponse({ error: "Not Found" }, 404, cors);
  },
};
