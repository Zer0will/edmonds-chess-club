import mysql from "mysql2/promise";

/**
 * Initialize database schema for Edmonds Chess Club multiplayer.
 * Idempotent — safe to run multiple times.
 */
export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[DB] DATABASE_URL not set; skipping schema init");
    return;
  }

  const pool = mysql.createPool({
    uri: connectionString,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    // Users table - linked to Manus OAuth via openId
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(64) NOT NULL UNIQUE,
        name VARCHAR(255),
        email VARCHAR(320),
        avatar VARCHAR(512),
        rating INT NOT NULL DEFAULT 1200,
        wins INT NOT NULL DEFAULT 0,
        losses INT NOT NULL DEFAULT 0,
        draws INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Games table - records of all completed and ongoing games
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(32) PRIMARY KEY,
        variant VARCHAR(32) NOT NULL DEFAULT 'standard',
        whiteUserId INT,
        blackUserId INT,
        whiteName VARCHAR(255),
        blackName VARCHAR(255),
        status VARCHAR(32) NOT NULL DEFAULT 'waiting',
        result VARCHAR(32),
        winnerColor VARCHAR(8),
        moveCount INT NOT NULL DEFAULT 0,
        whiteRatingBefore INT,
        blackRatingBefore INT,
        whiteRatingAfter INT,
        blackRatingAfter INT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        startedAt TIMESTAMP NULL,
        endedAt TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_white (whiteUserId),
        INDEX idx_black (blackUserId)
      )
    `);

    // Moves table - move history per game (for replay/audit)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS moves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gameId VARCHAR(32) NOT NULL,
        moveNumber INT NOT NULL,
        color VARCHAR(8) NOT NULL,
        notation VARCHAR(16) NOT NULL,
        fromSquare VARCHAR(4) NOT NULL,
        toSquare VARCHAR(4) NOT NULL,
        promotion VARCHAR(4),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_game (gameId, moveNumber)
      )
    `);

    console.log("[DB] Schema initialized");
  } catch (err) {
    console.error("[DB] Schema init failed:", err);
  } finally {
    await pool.end();
  }
}

let _pool: mysql.Pool | null = null;
export function getPool() {
  if (!_pool && process.env.DATABASE_URL) {
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return _pool;
}
