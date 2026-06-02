import express from "express";
import { createServer } from "http";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
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

type Variant = "standard" | "half-chess";
type Color = "white" | "black";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendJson(res: Response, status: number, data: unknown) {
  res.status(status).type("application/json").send(JSON.stringify(data));
}

function decodeReturnPath(stateRaw: unknown): string {
  if (typeof stateRaw !== "string" || !stateRaw) return "/";
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf-8"));
    if (typeof decoded?.returnPath === "string" && decoded.returnPath.startsWith("/")) {
      return decoded.returnPath;
    }
  } catch {
    // Ignore malformed OAuth state and fall back home.
  }
  return "/";
}

function normalizeGuestName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ").slice(0, 20);
  return clean || null;
}

function getVariant(value: unknown): Variant {
  return value === "half-chess" ? "half-chess" : "standard";
}

function getColor(value: unknown): Color {
  return value === "black" ? "black" : "white";
}

async function startServer() {
  await initDatabase();

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "100kb" }));

  // ============================================
  // WebSocket server for real-time game rooms
  // ============================================
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", async (req, socket, head) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api/ws")) return;

    const session = await getSessionFromRequest(req);
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleConnection(ws, session);
    });
  });

  // ============================================
  // REST API endpoints
  // ============================================
  const api = express.Router();

  api.get("/auth/me", async (req, res) => {
    const session = await getSessionFromRequest(req);
    if (!session) return sendJson(res, 200, { user: null });

    const user = await getUserByOpenId(session.openId);
    return sendJson(res, 200, { user });
  });

  api.post("/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    return sendJson(res, 200, { success: true });
  });

  api.get("/oauth/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    if (!code) return res.status(400).send("Missing code");

    const profile = await exchangeOAuthCode(code);
    if (!profile) return res.status(401).send("OAuth exchange failed");

    const dbUser = await upsertUser({
      openId: profile.openId,
      name: profile.name,
      email: profile.email,
    });
    if (!dbUser) return res.status(500).send("Database unavailable");

    const token = await signSession({
      userId: dbUser.id,
      openId: dbUser.openId,
      name: dbUser.name ?? "Player",
    });
    setSessionCookie(res, token);

    res.redirect(302, decodeReturnPath(req.query.state));
  });

  api.get("/leaderboard", async (_req, res) => {
    const board = await getLeaderboard(50);
    return sendJson(res, 200, { leaderboard: board });
  });

  api.get("/games/open", async (_req, res) => {
    const dbGames = await getOpenGames();
    const liveRooms = listOpenRooms();
    const liveIds = new Set(liveRooms.map((r) => r.id));
    const open = dbGames.filter((g) => liveIds.has(g.id));
    return sendJson(res, 200, { games: open, rooms: liveRooms });
  });

  api.get("/games/mine", async (req, res) => {
    const session = await getSessionFromRequest(req);
    if (!session) return sendJson(res, 200, { games: [] });

    const dbGames = await getUserGames(session.userId, 30);
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
        g.whiteUserId === session.userId
          ? "white"
          : g.blackUserId === session.userId
            ? "black"
            : null,
    }));
    return sendJson(res, 200, { games });
  });

  api.post("/games/create", async (req, res) => {
    const session = await getSessionFromRequest(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const variant = getVariant(body.variant);
    const color = getColor(body.color);
    const guestName = normalizeGuestName(body.guestName);
    const name = session?.name ?? guestName ?? "Guest";

    const roomId = await createRoom({
      variant,
      hostUserId: session?.userId ?? null,
      hostOpenId: session?.openId ?? null,
      hostName: name,
      hostColor: color,
    });

    return sendJson(res, 200, { roomId });
  });

  api.get("/games/:id", async (req, res) => {
    const id = req.params.id;
    if (!id) return sendJson(res, 400, { error: "Missing game id" });

    const dbGame = await getGame(id);
    const room = getRoom(id);
    return sendJson(res, 200, { game: dbGame, live: !!room });
  });

  app.use("/api", api);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[API] Error:", err);
    return sendJson(res, 500, { error: "Server error" });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
