import { useEffect, useRef, useState, useCallback } from "react";
import type { GameState, Position, PieceType, Color, Variant } from "@shared/chess-engine";

interface RoomState {
  id: string;
  variant: Variant;
  white: { name: string; userId: number | null } | null;
  black: { name: string; userId: number | null } | null;
  state: GameState;
  drawOffer: Color | null;
}

interface ChatMessage {
  from: string;
  color: Color;
  message: string;
  timestamp: number;
}

interface MultiplayerStatus {
  connected: boolean;
  joined: boolean;
  myColor: Color | null;
  spectator: boolean;
  room: RoomState | null;
  error: string | null;
  chat: ChatMessage[];
  drawOffered: Color | null;
}

const initialStatus: MultiplayerStatus = {
  connected: false,
  joined: false,
  myColor: null,
  spectator: false,
  room: null,
  error: null,
  chat: [],
  drawOffered: null,
};

export interface UseMultiplayerGameOptions {
  roomId: string | null;
  user: { id: number; openId: string; name: string } | null;
  guestName?: string;
}

export function useMultiplayerGame({ roomId, user, guestName }: UseMultiplayerGameOptions) {
  const [status, setStatus] = useState<MultiplayerStatus>(initialStatus);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  // Stable callbacks: send messages to the WebSocket
  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomId) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/ws`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus((s) => ({ ...s, connected: true, error: null }));
        const name = user?.name ?? guestName ?? "Guest";
        ws.send(
          JSON.stringify({
            type: "join",
            roomId,
            userId: user?.id ?? null,
            openId: user?.openId ?? null,
            name,
          })
        );
      };

      ws.onmessage = (event) => {
        let msg: { type: string; [k: string]: unknown };
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        setStatus((prev) => {
          switch (msg.type) {
            case "joined":
              return {
                ...prev,
                joined: true,
                myColor: (msg.color as Color | null) ?? null,
                spectator: !!msg.spectator,
                room: msg.room as RoomState,
              };
            case "room_update":
              return { ...prev, room: msg.room as RoomState };
            case "move_made":
              return { ...prev, room: msg.room as RoomState, error: null };
            case "game_over":
              return { ...prev, room: msg.room as RoomState };
            case "draw_offered":
              return { ...prev, drawOffered: msg.by as Color };
            case "chat":
              return {
                ...prev,
                chat: [
                  ...prev.chat,
                  {
                    from: msg.from as string,
                    color: msg.color as Color,
                    message: msg.message as string,
                    timestamp: msg.timestamp as number,
                  },
                ],
              };
            case "player_left":
              return { ...prev, room: msg.room as RoomState };
            case "error":
              return { ...prev, error: (msg.message as string) ?? "Unknown error" };
            default:
              return prev;
          }
        });
      };

      ws.onclose = () => {
        setStatus((s) => ({ ...s, connected: false }));
        // Auto-reconnect after a brief delay
        if (roomId) {
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, 2000);
        }
      };

      ws.onerror = () => {
        setStatus((s) => ({ ...s, error: "Connection error" }));
      };
    } catch (err) {
      setStatus((s) => ({ ...s, error: "Failed to connect" }));
    }
  }, [roomId, user, guestName]);

  useEffect(() => {
    if (!roomId) return;
    setStatus(initialStatus);
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null; // prevent auto-reconnect on unmount
        ws.close();
        wsRef.current = null;
      }
    };
  }, [roomId, connect]);

  const makeMove = useCallback(
    (from: Position, to: Position, promotion?: PieceType) => {
      send({ type: "move", from, to, promotion });
    },
    [send]
  );

  const resign = useCallback(() => send({ type: "resign" }), [send]);
  const offerDraw = useCallback(() => send({ type: "draw_offer" }), [send]);
  const acceptDraw = useCallback(() => send({ type: "draw_accept" }), [send]);
  const sendChat = useCallback((message: string) => send({ type: "chat", message }), [send]);

  return {
    ...status,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    sendChat,
  };
}
