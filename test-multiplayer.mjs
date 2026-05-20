/**
 * End-to-end multiplayer test:
 * 1. Create a game via REST
 * 2. Connect Player 1 (white) via WS
 * 3. Connect Player 2 (black) via WS
 * 4. Player 1 makes a move, both should receive it
 * 5. Player 2 makes a move, both should receive it
 * 6. Verify illegal moves are rejected
 */

import WebSocket from "ws";

const BASE_URL = "http://localhost:3000";
const WS_URL = "ws://localhost:3000/api/ws";

async function createRoom() {
  const resp = await fetch(`${BASE_URL}/api/games/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variant: "standard", color: "white" }),
  });
  const json = await resp.json();
  return json.roomId;
}

function connectPlayer(roomId, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const messages = [];
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "join",
          roomId,
          userId: null,
          openId: `test-${name}`,
          name,
        })
      );
    });
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      messages.push(msg);
    });
    ws.on("error", reject);
    setTimeout(() => resolve({ ws, messages }), 500);
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("== Test: Multiplayer Game Flow ==\n");

  // 1. Create room
  const roomId = await createRoom();
  console.log("✓ Created room:", roomId);

  // 2. Connect Player 1 (host = white)
  const p1 = await connectPlayer(roomId, "Alice");
  console.log("✓ Alice (white) joined. Initial messages:", p1.messages.length);
  const aliceJoined = p1.messages.find((m) => m.type === "joined");
  console.log("  Alice color:", aliceJoined?.color);

  // 3. Connect Player 2 (black)
  const p2 = await connectPlayer(roomId, "Bob");
  console.log("✓ Bob (black) joined. Initial messages:", p2.messages.length);
  const bobJoined = p2.messages.find((m) => m.type === "joined");
  console.log("  Bob color:", bobJoined?.color);

  await wait(300);

  // 4. Alice plays e4 (white pawn from {r:6,c:4} to {r:4,c:4})
  console.log("\n— Alice plays e4 —");
  send(p1.ws, { type: "move", from: { r: 6, c: 4 }, to: { r: 4, c: 4 } });
  await wait(500);
  const aliceMove = p1.messages.find((m) => m.type === "move_made");
  const bobReceivedMove = p2.messages.find((m) => m.type === "move_made");
  console.log("  Alice received move_made:", !!aliceMove);
  console.log("  Bob received move_made:", !!bobReceivedMove);
  if (aliceMove) console.log("  Notation:", aliceMove.move.notation);

  // 5. Bob tries an illegal move (move white pawn) — should be rejected
  console.log("\n— Bob tries to move opponent's piece (illegal) —");
  const bobMsgsBeforeIllegal = p2.messages.length;
  send(p2.ws, { type: "move", from: { r: 6, c: 0 }, to: { r: 4, c: 0 } });
  await wait(500);
  const newMsgs = p2.messages.slice(bobMsgsBeforeIllegal);
  const errMsg = newMsgs.find((m) => m.type === "error");
  const moveExecuted = newMsgs.find((m) => m.type === "move_made");
  console.log("  Got error:", !!errMsg, errMsg?.message);
  console.log("  Move was rejected:", !moveExecuted);

  // 6. Bob plays e5 (black pawn from {r:1,c:4} to {r:3,c:4})
  console.log("\n— Bob plays e5 —");
  const bobMsgsBefore = p2.messages.length;
  send(p2.ws, { type: "move", from: { r: 1, c: 4 }, to: { r: 3, c: 4 } });
  await wait(500);
  const bobMove = p2.messages.slice(bobMsgsBefore).find((m) => m.type === "move_made");
  console.log("  Bob's move_made received:", !!bobMove);
  if (bobMove) console.log("  Notation:", bobMove.move.notation);

  // 7. Alice tries to move out of turn — should be rejected after Bob's move
  // Now it's white's turn again, so any white move should work
  console.log("\n— Alice plays Nf3 —");
  const aliceMsgsBefore = p1.messages.length;
  send(p1.ws, { type: "move", from: { r: 7, c: 6 }, to: { r: 5, c: 5 } });
  await wait(500);
  const nf3Move = p1.messages.slice(aliceMsgsBefore).find((m) => m.type === "move_made");
  console.log("  Nf3 result:", nf3Move?.move?.notation ?? "FAILED");

  // 8. Verify the room state through the API
  console.log("\n— Final game state —");
  const apiResp = await fetch(`${BASE_URL}/api/games/${roomId}`);
  const gameData = await apiResp.json();
  console.log("  Move count in DB:", gameData.game.moveCount);

  p1.ws.close();
  p2.ws.close();

  console.log("\n== Test complete ==");
  process.exit(0);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
