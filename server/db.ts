import { getPool } from "./db-init";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface DbUser {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: Date;
  lastSignedIn: Date;
}

export interface DbGame {
  id: string;
  variant: string;
  whiteUserId: number | null;
  blackUserId: number | null;
  whiteName: string | null;
  blackName: string | null;
  status: "waiting" | "active" | "finished" | "abandoned";
  result: string | null;
  winnerColor: "white" | "black" | null;
  moveCount: number;
  whiteRatingBefore: number | null;
  blackRatingBefore: number | null;
  whiteRatingAfter: number | null;
  blackRatingAfter: number | null;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

export async function upsertUser(input: {
  openId: string;
  name?: string;
  email?: string;
  avatar?: string;
}): Promise<DbUser | null> {
  const pool = getPool();
  if (!pool) return null;

  await pool.execute(
    `INSERT INTO users (openId, name, email, avatar, lastSignedIn)
     VALUES (?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       name = COALESCE(VALUES(name), name),
       email = COALESCE(VALUES(email), email),
       avatar = COALESCE(VALUES(avatar), avatar),
       lastSignedIn = NOW()`,
    [input.openId, input.name ?? null, input.email ?? null, input.avatar ?? null]
  );

  return getUserByOpenId(input.openId);
}

export async function getUserByOpenId(openId: string): Promise<DbUser | null> {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM users WHERE openId = ? LIMIT 1`,
    [openId]
  );
  return (rows[0] as DbUser) ?? null;
}

export async function getUserById(id: number): Promise<DbUser | null> {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return (rows[0] as DbUser) ?? null;
}

export async function getLeaderboard(limit = 50): Promise<DbUser[]> {
  const pool = getPool();
  if (!pool) return [];
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 200);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM users
     WHERE wins + losses + draws > 0
     ORDER BY rating DESC, (wins + draws) DESC
     LIMIT ${safeLimit}`
  );
  return rows as DbUser[];
}

export async function createGame(game: {
  id: string;
  variant: string;
  whiteUserId: number | null;
  whiteName: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.execute(
    `INSERT INTO games (id, variant, whiteUserId, whiteName, status)
     VALUES (?, ?, ?, ?, 'waiting')`,
    [game.id, game.variant, game.whiteUserId, game.whiteName]
  );
}

export async function joinGame(input: {
  gameId: string;
  blackUserId: number | null;
  blackName: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.execute(
    `UPDATE games SET blackUserId = ?, blackName = ?, status = 'active', startedAt = NOW()
     WHERE id = ? AND status = 'waiting'`,
    [input.blackUserId, input.blackName, input.gameId]
  );
}

export async function getGame(gameId: string): Promise<DbGame | null> {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM games WHERE id = ? LIMIT 1`,
    [gameId]
  );
  return (rows[0] as DbGame) ?? null;
}

export async function getOpenGames(): Promise<DbGame[]> {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM games WHERE status = 'waiting' ORDER BY createdAt DESC LIMIT 50`
  );
  return rows as DbGame[];
}

export async function recordMove(input: {
  gameId: string;
  moveNumber: number;
  color: "white" | "black";
  notation: string;
  fromSquare: string;
  toSquare: string;
  promotion?: string;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.execute(
    `INSERT INTO moves (gameId, moveNumber, color, notation, fromSquare, toSquare, promotion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.gameId,
      input.moveNumber,
      input.color,
      input.notation,
      input.fromSquare,
      input.toSquare,
      input.promotion ?? null,
    ]
  );
  await pool.execute(
    `UPDATE games SET moveCount = moveCount + 1 WHERE id = ?`,
    [input.gameId]
  );
}

/** Standard Elo rating update with K=32. */
export function calculateNewRatings(
  whiteRating: number,
  blackRating: number,
  whiteScore: number // 1 = white wins, 0.5 = draw, 0 = black wins
): { whiteNew: number; blackNew: number } {
  const K = 32;
  const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
  const expectedBlack = 1 - expectedWhite;
  const whiteNew = Math.round(whiteRating + K * (whiteScore - expectedWhite));
  const blackNew = Math.round(blackRating + K * ((1 - whiteScore) - expectedBlack));
  return { whiteNew, blackNew };
}

export async function finishGame(input: {
  gameId: string;
  result: string;
  winnerColor: "white" | "black" | null;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  const game = await getGame(input.gameId);
  if (!game || game.status === "finished") return;

  // Calculate rating updates if both players are registered users
  let whiteRatingBefore: number | null = null;
  let blackRatingBefore: number | null = null;
  let whiteRatingAfter: number | null = null;
  let blackRatingAfter: number | null = null;

  if (game.whiteUserId && game.blackUserId) {
    const [white, black] = await Promise.all([
      getUserById(game.whiteUserId),
      getUserById(game.blackUserId),
    ]);
    if (white && black) {
      whiteRatingBefore = white.rating;
      blackRatingBefore = black.rating;

      const whiteScore = input.winnerColor === "white" ? 1 : input.winnerColor === "black" ? 0 : 0.5;
      const ratings = calculateNewRatings(white.rating, black.rating, whiteScore);
      whiteRatingAfter = ratings.whiteNew;
      blackRatingAfter = ratings.blackNew;

      // Update user records
      const whiteResult =
        input.winnerColor === "white" ? "wins" : input.winnerColor === "black" ? "losses" : "draws";
      const blackResult =
        input.winnerColor === "black" ? "wins" : input.winnerColor === "white" ? "losses" : "draws";

      await pool.execute(
        `UPDATE users SET rating = ?, ${whiteResult} = ${whiteResult} + 1 WHERE id = ?`,
        [ratings.whiteNew, game.whiteUserId]
      );
      await pool.execute(
        `UPDATE users SET rating = ?, ${blackResult} = ${blackResult} + 1 WHERE id = ?`,
        [ratings.blackNew, game.blackUserId]
      );
    }
  }

  await pool.execute(
    `UPDATE games SET status = 'finished', result = ?, winnerColor = ?, endedAt = NOW(),
       whiteRatingBefore = ?, blackRatingBefore = ?, whiteRatingAfter = ?, blackRatingAfter = ?
     WHERE id = ?`,
    [
      input.result,
      input.winnerColor,
      whiteRatingBefore,
      blackRatingBefore,
      whiteRatingAfter,
      blackRatingAfter,
      input.gameId,
    ]
  );
}

export async function getUserGames(userId: number, limit = 20): Promise<DbGame[]> {
  const pool = getPool();
  if (!pool) return [];
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM games
     WHERE (whiteUserId = ? OR blackUserId = ?) AND status = 'finished'
     ORDER BY endedAt DESC
     LIMIT ${safeLimit}`,
    [userId, userId]
  );
  return rows as DbGame[];
}
