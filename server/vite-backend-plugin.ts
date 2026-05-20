/**
 * Vite plugin that mounts our backend API + WebSocket server onto the dev server.
 * This way the frontend and backend share port 3000.
 */

import type { Plugin, ViteDevServer } from "vite";
import { WebSocketServer } from "ws";
import type { IncomingMessage, ServerResponse } from "node:http";
import { initDatabase } from "./db-init";
import {
  upsertUser,
  getUserByOpenId,
  getLeaderboard,
  getOpenGames,
  getGame,
  getUserGames,
} from "./db";
import {
  exchangeOAuthCode,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
} from "./auth";
import { createRoom, getRoom, listOpenRooms, handleConnection } from "./game-rooms";
import { parse as parseUrl } from "node:url";

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1024 * 100) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function backendPlugin(): Plugin {
  return {
    name: "ecc-backend",
    async configureServer(server: ViteDevServer) {
      // Initialize database schema on startup
      await initDatabase();

      // ============================================
      // WebSocket server for game rooms
      // ============================================
      if (server.httpServer) {
        const wss = new WebSocketServer({ noServer: true });
        server.httpServer.on("upgrade", async (req, socket, head) => {
          const url = req.url ?? "";
          if (url.startsWith("/api/ws")) {
            // Verify session cookie at upgrade time so the WS connection has
            // an authenticated identity that the client cannot forge.
            const session = await getSessionFromRequest(req);
            wss.handleUpgrade(req, socket, head, (ws) => {
              handleConnection(ws, session);
            });
          } else {
            // Let Vite handle HMR upgrades
          }
        });
      }

      // ============================================
      // REST API endpoints
      // ============================================
      server.middlewares.use("/api", async (req, res, next) => {
        const url = req.url ?? "";
        const parsed = parseUrl(url, true);
        const pathname = parsed.pathname ?? "";
        const method = req.method ?? "GET";

        try {
          // GET /api/auth/me - current user
          if (method === "GET" && pathname === "/auth/me") {
            const session = await getSessionFromRequest(req);
            if (!session) {
              return sendJson(res, 200, { user: null });
            }
            const user = await getUserByOpenId(session.openId);
            return sendJson(res, 200, { user });
          }

          // POST /api/auth/logout
          if (method === "POST" && pathname === "/auth/logout") {
            clearSessionCookie(res);
            return sendJson(res, 200, { success: true });
          }

          // GET /api/oauth/callback?code=...
          if (method === "GET" && pathname === "/oauth/callback") {
            const code = parsed.query.code as string | undefined;
            const stateRaw = parsed.query.state as string | undefined;
            if (!code) {
              res.statusCode = 400;
              return res.end("Missing code");
            }

            const profile = await exchangeOAuthCode(code);
            if (!profile) {
              res.statusCode = 401;
              return res.end("OAuth exchange failed");
            }

            const dbUser = await upsertUser({
              openId: profile.openId,
              name: profile.name,
              email: profile.email,
            });

            if (!dbUser) {
              res.statusCode = 500;
              return res.end("Database unavailable");
            }

            const token = await signSession({
              userId: dbUser.id,
              openId: dbUser.openId,
              name: dbUser.name ?? "Player",
            });
            setSessionCookie(res, token);

            // Decode return path from state
            let returnPath = "/";
            if (stateRaw) {
              try {
                const decoded = JSON.parse(
                  Buffer.from(stateRaw, "base64url").toString("utf-8")
                );
                if (typeof decoded?.returnPath === "string") {
                  returnPath = decoded.returnPath;
                }
              } catch {
                // ignore
              }
            }

            res.statusCode = 302;
            res.setHeader("Location", returnPath);
            return res.end();
          }

          // GET /api/leaderboard
          if (method === "GET" && pathname === "/leaderboard") {
            const board = await getLeaderboard(50);
            return sendJson(res, 200, { leaderboard: board });
          }

          // GET /api/games/open
          if (method === "GET" && pathname === "/games/open") {
            const dbGames = await getOpenGames();
            const liveRooms = listOpenRooms();
            // Merge: only show rooms that exist in memory (live games)
            const liveIds = new Set(liveRooms.map((r) => r.id));
            const open = dbGames.filter((g) => liveIds.has(g.id));
            return sendJson(res, 200, { games: open, rooms: liveRooms });
          }

          // GET /api/games/mine
          if (method === "GET" && pathname === "/games/mine") {
            const session = await getSessionFromRequest(req);
            if (!session) return sendJson(res, 200, { games: [] });
            const dbGames = await getUserGames(session.userId, 30);
            const userId = session.userId;
            const games = dbGames.map((g) => ({
              id: g.id,
              variant: g.variant,
              whiteName: g.whiteName,
              blackName: g.blackName,
              winnerColor: g.winnerColor,
              result: g.result,
              moves: g.moveCount,
              finishedAt: g.endedAt ? new Date(g.endedAt).getTime() : Date.now(),
              myColor:
                g.whiteUserId === userId
                  ? "white"
                  : g.blackUserId === userId
                    ? "black"
                    : null,
            }));
            return sendJson(res, 200, { games });
          }

          // POST /api/games/create
          if (method === "POST" && pathname === "/games/create") {
            const session = await getSessionFromRequest(req);
            const body = await readJsonBody(req);
            const variant = (body.variant as string) === "half-chess" ? "half-chess" : "standard";
            const color = (body.color as string) === "black" ? "black" : "white";
            const name = session?.name ?? "Guest";
            const userId = session?.userId ?? null;
            const openId = session?.openId ?? null;

            const roomId = await createRoom({
              variant: variant as "standard" | "half-chess",
              hostUserId: userId,
              hostOpenId: openId,
              hostName: name,
              hostColor: color as "white" | "black",
            });
            return sendJson(res, 200, { roomId });
          }

          // GET /api/games/:id
          if (method === "GET" && pathname.startsWith("/games/")) {
            const id = pathname.split("/")[2];
            if (!id) return sendJson(res, 400, { error: "Missing game id" });
            const dbGame = await getGame(id);
            const room = getRoom(id);
            return sendJson(res, 200, { game: dbGame, live: !!room });
          }

          return next();
        } catch (err) {
          console.error("[API] Error:", err);
          return sendJson(res, 500, { error: "Server error" });
        }
      });
    },
  };
}
