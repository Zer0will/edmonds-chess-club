/**
 * Real-time multiplayer game room manager.
 * - Server-authoritative chess move validation
 * - WebSocket-based bidirectional sync
 * - Persists games and moves to database
 */

import type { WebSocket } from "ws";
import { nanoid } from "nanoid";
import {
  createInitialState,
  generateMoves,
  makeMove,
  moveToNotation,
  posToAlgebraic,
  type GameState,
  type Move,
  type Variant,
  type Color,
  type Position,
  type PieceType,
} from "../shared/chess-engine";
import { createGame, joinGame, recordMove, finishGame } from "./db";

interface RoomPlayer {
  ws: WebSocket;
  userId: number | null;
  openId: string | null;
  name: string;
  color: Color;
}

interface Room {
  id: string;
  variant: Variant;
  white: RoomPlayer | null;
  black: RoomPlayer | null;
  spectators: WebSocket[];
  state: GameState;
  createdAt: number;
  drawOffer: Color | null;
}

const rooms = new Map<string, Room>();

function broadcast(room: Room, message: object, except?: WebSocket) {
  const data = JSON.stringify(message);
  const send = (ws: WebSocket | undefined) => {
    if (!ws || ws === except) return;
    if (ws.readyState === ws.OPEN) ws.send(data);
  };
  send(room.white?.ws);
  send(room.black?.ws);
  for (const s of room.spectators) send(s);
}

function roomToPublic(room: Room) {
  return {
    id: room.id,
    variant: room.variant,
    white: room.white ? { name: room.white.name, userId: room.white.userId } : null,
    black: room.black ? { name: room.black.name, userId: room.black.userId } : null,
    state: room.state,
    drawOffer: room.drawOffer,
  };
}

export interface CreateRoomInput {
  variant: Variant;
  hostUserId: number | null;
  hostOpenId: string | null;
  hostName: string;
  hostColor: Color; // which side host wants to play
}

export async function createRoom(input: CreateRoomInput): Promise<string> {
  const id = nanoid(10);
  const room: Room = {
    id,
    variant: input.variant,
    white: null,
    black: null,
    spectators: [],
    state: createInitialState(input.variant),
    createdAt: Date.now(),
    drawOffer: null,
  };
  rooms.set(id, room);

  // Persist to db (host occupies their chosen color slot, with WS attached on connect)
  await createGame({
    id,
    variant: input.variant,
    whiteUserId: input.hostColor === "white" ? input.hostUserId : null,
    whiteName: input.hostColor === "white" ? input.hostName : "Waiting...",
  });

  // Note: the actual seat assignment happens when the host connects via WS.
  // We track the intended color in a temporary structure on the room itself.
  (room as Room & { _hostIntent?: { openId: string | null; color: Color } })._hostIntent = {
    openId: input.hostOpenId,
    color: input.hostColor,
  };

  return id;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function listOpenRooms() {
  const open: Array<{ id: string; variant: Variant; hostName: string; createdAt: number }> = [];
  rooms.forEach((room) => {
    const isOpen = !room.white || !room.black;
    if (!isOpen) return;
    const host = room.white ?? room.black;
    open.push({
      id: room.id,
      variant: room.variant,
      hostName: host?.name ?? "Waiting...",
      createdAt: room.createdAt,
    });
  });
  return open.sort((a, b) => b.createdAt - a.createdAt);
}

interface JoinPayload {
  type: "join";
  roomId: string;
  userId: number | null;
  openId: string | null;
  name: string;
}

interface MovePayload {
  type: "move";
  from: Position;
  to: Position;
  promotion?: PieceType;
}

interface ResignPayload {
  type: "resign";
}

interface DrawOfferPayload {
  type: "draw_offer";
}

interface DrawAcceptPayload {
  type: "draw_accept";
}

interface ChatPayload {
  type: "chat";
  message: string;
}

type ClientMessage =
  | JoinPayload
  | MovePayload
  | ResignPayload
  | DrawOfferPayload
  | DrawAcceptPayload
  | ChatPayload;

export function handleConnection(
  ws: WebSocket,
  session: { userId: number; openId: string; name: string } | null = null
) {
  let currentRoom: Room | null = null;
  let currentPlayer: RoomPlayer | null = null;
  let isSpectator = false;

  ws.on("message", async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (msg.type === "join") {
      const room = rooms.get(msg.roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
        return;
      }
      currentRoom = room;

      // SECURITY: prefer session identity over client-claimed identity.
      // A signed-in user always uses their authenticated userId/openId/name.
      // Anonymous guests get null userId/openId and may pick a display name.
      const identity = session
        ? { userId: session.userId, openId: session.openId, name: session.name }
        : { userId: null, openId: null, name: msg.name?.trim() || "Guest" };

      const hostIntent = (room as Room & {
        _hostIntent?: { openId: string | null; color: Color };
      })._hostIntent;

      // Slot assignment:
      // 1. If host-intent exists and this user matches → assign to host's chosen color
      // 2. Else fill open seat (white first, then black)
      // 3. Else become spectator
      const isHost = hostIntent && hostIntent.openId && hostIntent.openId === identity.openId;

      if (isHost && hostIntent) {
        const color = hostIntent.color;
        if (color === "white" && !room.white) {
          room.white = { ws, ...identity, color };
          currentPlayer = room.white;
        } else if (color === "black" && !room.black) {
          room.black = { ws, ...identity, color };
          currentPlayer = room.black;
        }
      } else if (!room.white) {
        room.white = { ws, ...identity, color: "white" };
        currentPlayer = room.white;
      } else if (!room.black) {
        room.black = { ws, ...identity, color: "black" };
        currentPlayer = room.black;

        // Both seats filled - mark game as active in db
        await joinGame({
          gameId: room.id,
          blackUserId: identity.userId,
          blackName: identity.name,
        });
      } else {
        room.spectators.push(ws);
        isSpectator = true;
      }

      // Send initial state to joiner
      ws.send(
        JSON.stringify({
          type: "joined",
          color: currentPlayer?.color ?? null,
          spectator: isSpectator,
          room: roomToPublic(room),
        })
      );

      // Notify everyone of new state
      broadcast(room, {
        type: "room_update",
        room: roomToPublic(room),
      });
      return;
    }

    if (!currentRoom || !currentPlayer) {
      ws.send(JSON.stringify({ type: "error", message: "Not in a game" }));
      return;
    }

    if (msg.type === "move") {
      // Server-authoritative move validation
      if (currentRoom.state.turn !== currentPlayer.color) {
        ws.send(JSON.stringify({ type: "error", message: "Not your turn" }));
        return;
      }

      if (currentRoom.state.status !== "playing") {
        ws.send(JSON.stringify({ type: "error", message: "Game is over" }));
        return;
      }

      // Verify the from-square contains the player's own piece
      const fromPiece = currentRoom.state.board[msg.from.r]?.[msg.from.c];
      if (!fromPiece || fromPiece.color !== currentPlayer.color) {
        ws.send(JSON.stringify({ type: "error", message: "Not your piece" }));
        return;
      }

      // Generate legal moves from this square
      const legalMoves = generateMoves(currentRoom.state.board, msg.from, currentRoom.state);

      // Find matching move (account for promotion)
      const found = legalMoves.find(
        (m) =>
          m.to.r === msg.to.r &&
          m.to.c === msg.to.c &&
          (msg.promotion ? m.promotion === msg.promotion : !m.promotion || m.promotion === "q")
      );

      if (!found) {
        ws.send(JSON.stringify({ type: "error", message: "Illegal move" }));
        return;
      }

      const moveToApply: Move = found;
      const newState = makeMove(currentRoom.state, moveToApply);
      currentRoom.state = newState;
      currentRoom.drawOffer = null; // any move cancels draw offer

      // Persist move
      await recordMove({
        gameId: currentRoom.id,
        moveNumber: newState.moveHistory.length,
        color: currentPlayer.color,
        notation: moveToNotation(moveToApply),
        fromSquare: posToAlgebraic(moveToApply.from),
        toSquare: posToAlgebraic(moveToApply.to),
        promotion: moveToApply.promotion,
      });

      // Broadcast update
      broadcast(currentRoom, {
        type: "move_made",
        move: {
          from: moveToApply.from,
          to: moveToApply.to,
          notation: moveToNotation(moveToApply),
          promotion: moveToApply.promotion,
        },
        room: roomToPublic(currentRoom),
      });

      // Handle game end
      if (newState.status !== "playing") {
        const winnerColor = newState.winner;
        const result =
          newState.status === "checkmate"
            ? "checkmate"
            : newState.status === "stalemate"
              ? "stalemate"
              : "draw";
        await finishGame({
          gameId: currentRoom.id,
          result,
          winnerColor,
        });
        broadcast(currentRoom, {
          type: "game_over",
          result,
          winner: winnerColor,
          room: roomToPublic(currentRoom),
        });
      }
      return;
    }

    if (msg.type === "resign") {
      const winnerColor: Color = currentPlayer.color === "white" ? "black" : "white";
      currentRoom.state.status = "checkmate"; // mark over
      currentRoom.state.winner = winnerColor;
      await finishGame({
        gameId: currentRoom.id,
        result: "resignation",
        winnerColor,
      });
      broadcast(currentRoom, {
        type: "game_over",
        result: "resignation",
        winner: winnerColor,
        room: roomToPublic(currentRoom),
      });
      return;
    }

    if (msg.type === "draw_offer") {
      currentRoom.drawOffer = currentPlayer.color;
      broadcast(currentRoom, {
        type: "draw_offered",
        by: currentPlayer.color,
      });
      return;
    }

    if (msg.type === "draw_accept") {
      if (!currentRoom.drawOffer || currentRoom.drawOffer === currentPlayer.color) {
        ws.send(JSON.stringify({ type: "error", message: "No draw offer to accept" }));
        return;
      }
      currentRoom.state.status = "draw";
      await finishGame({
        gameId: currentRoom.id,
        result: "agreement",
        winnerColor: null,
      });
      broadcast(currentRoom, {
        type: "game_over",
        result: "agreement",
        winner: null,
        room: roomToPublic(currentRoom),
      });
      return;
    }

    if (msg.type === "chat") {
      const text = String(msg.message ?? "").slice(0, 200);
      if (!text.trim()) return;
      broadcast(currentRoom, {
        type: "chat",
        from: currentPlayer.name,
        color: currentPlayer.color,
        message: text,
        timestamp: Date.now(),
      });
      return;
    }
  });

  ws.on("close", () => {
    if (!currentRoom) return;
    if (isSpectator) {
      currentRoom.spectators = currentRoom.spectators.filter((s) => s !== ws);
    } else if (currentPlayer) {
      // Mark the player as disconnected but keep room alive briefly so they can reconnect
      if (currentRoom.white === currentPlayer) currentRoom.white = null;
      if (currentRoom.black === currentPlayer) currentRoom.black = null;
      broadcast(currentRoom, {
        type: "player_left",
        color: currentPlayer.color,
        room: roomToPublic(currentRoom),
      });

      // Cleanup empty rooms
      if (!currentRoom.white && !currentRoom.black && currentRoom.spectators.length === 0) {
        rooms.delete(currentRoom.id);
      }
    }
  });
}

// Periodic cleanup of stale rooms (older than 24h with no activity)
setInterval(() => {
  const now = Date.now();
  const TTL = 24 * 60 * 60 * 1000;
  const stale: string[] = [];
  rooms.forEach((room, id) => {
    if (now - room.createdAt > TTL && !room.white && !room.black) stale.push(id);
  });
  stale.forEach((id) => rooms.delete(id));
}, 60 * 60 * 1000).unref?.();
