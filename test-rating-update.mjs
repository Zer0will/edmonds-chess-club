// End-to-end test: two real authenticated users play Scholar's Mate via WebSocket,
// verify ratings update via the Elo formula in finishGame().
import WebSocket from "ws";
import mysql from "mysql2/promise";
import { SignJWT } from "jose";

const BASE = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/api/ws";

async function fetch_(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  return res.json();
}

function open_(ws) {
  return new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });
}

function recv(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout waiting for message")), timeoutMs);
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(msg);
      }
    };
    ws.on("message", handler);
  });
}

async function makeSessionCookie(userId, openId, name) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({ userId, openId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `ecc_session=${token}`;
}

const pool = mysql.createPool(process.env.DATABASE_URL);

async function ensureUser(openId, name) {
  await pool.execute(
    `INSERT INTO users (openId, name, lastSignedIn) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [openId, name]
  );
  const [rows] = await pool.execute(
    `SELECT id, openId, name, rating FROM users WHERE openId = ? LIMIT 1`,
    [openId]
  );
  return rows[0];
}

async function getRating(id) {
  const [rows] = await pool.execute(
    `SELECT rating, wins, losses FROM users WHERE id = ?`,
    [id]
  );
  return rows[0];
}

(async () => {
  console.log("== Scholar's Mate rating-update test (authenticated) ==");

  const aliceOpenId = "test-alice-" + Date.now();
  const bobOpenId = "test-bob-" + Date.now();
  const alice = await ensureUser(aliceOpenId, "TestAlice");
  const bob = await ensureUser(bobOpenId, "TestBob");
  console.log(`✓ Alice (id=${alice.id}, rating=${alice.rating})`);
  console.log(`✓ Bob   (id=${bob.id}, rating=${bob.rating})`);

  const aliceCookie = await makeSessionCookie(alice.id, aliceOpenId, "TestAlice");
  const bobCookie = await makeSessionCookie(bob.id, bobOpenId, "TestBob");

  // Create the room as Alice (authenticated).
  const created = await fetch(BASE + "/api/games/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: aliceCookie },
    body: JSON.stringify({ variant: "standard", color: "white" }),
  }).then((r) => r.json());
  const roomId = created.roomId;
  console.log(`✓ Room created: ${roomId}`);

  // Connect Alice (white)
  const aliceWs = new WebSocket(WS_URL, { headers: { Cookie: aliceCookie } });
  await open_(aliceWs);
  aliceWs.send(JSON.stringify({ type: "join", roomId, name: "TestAlice" }));
  const aliceJoin = await recv(aliceWs, (m) => m.type === "joined");
  console.log(`✓ Alice joined as ${aliceJoin.color}`);

  // Connect Bob (black)
  const bobWs = new WebSocket(WS_URL, { headers: { Cookie: bobCookie } });
  await open_(bobWs);
  bobWs.send(JSON.stringify({ type: "join", roomId, name: "TestBob" }));
  const bobJoin = await recv(bobWs, (m) => m.type === "joined");
  console.log(`✓ Bob   joined as ${bobJoin.color}`);

  async function play(ws, oppWs, from, to) {
    ws.send(JSON.stringify({ type: "move", from, to }));
    await recv(oppWs, (m) => m.type === "move_made");
  }

  // Scholar's Mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#
  await play(aliceWs, bobWs, { r: 6, c: 4 }, { r: 4, c: 4 }); // e4
  await play(bobWs, aliceWs, { r: 1, c: 4 }, { r: 3, c: 4 }); // e5
  await play(aliceWs, bobWs, { r: 7, c: 5 }, { r: 4, c: 2 }); // Bc4
  await play(bobWs, aliceWs, { r: 0, c: 1 }, { r: 2, c: 2 }); // Nc6
  await play(aliceWs, bobWs, { r: 7, c: 3 }, { r: 3, c: 7 }); // Qh5
  await play(bobWs, aliceWs, { r: 0, c: 6 }, { r: 2, c: 5 }); // Nf6

  const gameOverP = recv(aliceWs, (m) => m.type === "game_over", 5000);
  aliceWs.send(JSON.stringify({ type: "move", from: { r: 3, c: 7 }, to: { r: 1, c: 5 } })); // Qxf7#
  const gameOver = await gameOverP;
  console.log(`✓ Game over: result=${gameOver.result}, winner=${gameOver.winner}`);

  // Allow DB write to settle
  await new Promise((r) => setTimeout(r, 400));

  const aliceAfter = await getRating(alice.id);
  const bobAfter = await getRating(bob.id);
  console.log(`Alice rating: ${alice.rating} → ${aliceAfter.rating} (wins=${aliceAfter.wins})`);
  console.log(`Bob   rating: ${bob.rating}   → ${bobAfter.rating}   (losses=${bobAfter.losses})`);

  const aliceGained = aliceAfter.rating > alice.rating;
  const bobLost = bobAfter.rating < bob.rating;
  const lb = await fetch_("/api/leaderboard");
  const aliceOnLb = lb.leaderboard.some((e) => e.id === alice.id);

  console.log(`Alice gained rating: ${aliceGained}`);
  console.log(`Bob lost rating:     ${bobLost}`);
  console.log(`Alice on leaderboard: ${aliceOnLb}`);

  // Cleanup
  await pool.execute(`DELETE FROM users WHERE id IN (?, ?)`, [alice.id, bob.id]);
  await pool.end();
  aliceWs.close();
  bobWs.close();

  if (!aliceGained || !bobLost) {
    console.error("✗ Rating update FAILED");
    process.exit(1);
  }
  console.log("== Rating-update test PASSED ==");
  process.exit(0);
})().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
