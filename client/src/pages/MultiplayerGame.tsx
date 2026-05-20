/**
 * Multiplayer Game Page — real-time chess via WebSocket.
 * Server-authoritative move validation; client just renders + sends.
 */
import { useEffect, useState, useMemo, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMultiplayerGame } from "@/hooks/useMultiplayerGame";
import ChessBoard from "@/components/ChessBoard";
import { moveToNotation, getPieceSymbol, type Move, type Piece } from "@shared/chess-engine";
import {
  Crown,
  Loader2,
  Flag,
  Handshake,
  Send,
  Copy,
  Check,
  Wifi,
  WifiOff,
  ArrowLeft,
  Users,
} from "lucide-react";

export default function MultiplayerGame() {
  const [match, params] = useRoute<{ id: string }>("/play/online/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const roomId = match ? params.id : null;

  const [guestName] = useState(() => {
    const saved = localStorage.getItem("ecc_guest_name");
    return saved ?? `Guest${Math.floor(Math.random() * 1000)}`;
  });

  useEffect(() => {
    if (!user && guestName) {
      localStorage.setItem("ecc_guest_name", guestName);
    }
  }, [user, guestName]);

  const userForHook = useMemo(
    () =>
      user
        ? { id: user.id, openId: user.openId, name: user.name }
        : null,
    [user]
  );

  const game = useMultiplayerGame({
    roomId,
    user: userForHook,
    guestName,
  });

  const [chatInput, setChatInput] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [game.chat.length]);

  if (!match || !roomId) {
    return null;
  }

  const room = game.room;
  const state = room?.state;
  const flipped = game.myColor === "black";
  const myTurn = state ? state.turn === game.myColor : false;
  const isPlaying = state?.status === "playing";
  const boardDisabled = !isPlaying || !myTurn || game.spectator;

  const handleMove = (move: Move) => {
    game.makeMove(move.from, move.to, move.promotion);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/play/online/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    game.sendChat(chatInput.trim());
    setChatInput("");
  };

  const renderCaptured = (pieces: Piece[]) => {
    if (!pieces.length) return null;
    return (
      <div className="flex flex-wrap gap-0.5">
        {pieces
          .slice()
          .sort((a, b) => {
            const order: Record<string, number> = { k: -1, q: 0, r: 1, b: 2, n: 3, p: 4 };
            return order[a.type] - order[b.type];
          })
          .map((p, i) => (
            <span key={i} className="text-base sm:text-lg opacity-70">
              {getPieceSymbol(p)}
            </span>
          ))}
      </div>
    );
  };

  // Loading state
  if (!state || !room) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
          <p className="text-silver">
            {game.connected ? "Joining game..." : "Connecting to server..."}
          </p>
          {game.error && <p className="text-destructive mt-2 text-sm">{game.error}</p>}
        </div>
      </div>
    );
  }

  const opponentName =
    game.myColor === "white" ? room.black?.name : room.white?.name;
  const myName = game.myColor === "white" ? room.white?.name : room.black?.name;
  const waitingForOpponent = !room.white || !room.black;

  // Captured pieces for top/bottom display
  const topCaptured = flipped ? state.capturedBlack : state.capturedWhite;
  const bottomCaptured = flipped ? state.capturedWhite : state.capturedBlack;

  // Status text
  let statusText = "";
  let statusClass = "text-silver";
  if (state.status === "playing") {
    if (waitingForOpponent) {
      statusText = "Waiting for opponent...";
      statusClass = "text-purple-light";
    } else if (myTurn) {
      statusText = "Your turn";
      statusClass = "text-gold";
    } else {
      statusText = "Opponent's turn";
      statusClass = "text-silver-dark";
    }
  } else if (state.status === "checkmate") {
    if (state.winner === game.myColor) {
      statusText = "Checkmate — You win!";
      statusClass = "text-gold font-bold";
    } else if (state.winner) {
      statusText = "Checkmate — You lost";
      statusClass = "text-destructive";
    }
  } else if (state.status === "stalemate") {
    statusText = "Stalemate — Draw";
    statusClass = "text-silver";
  } else if (state.status === "draw") {
    statusText = "Draw";
    statusClass = "text-silver";
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-4 sm:py-8">
      <div className="container max-w-6xl mx-auto px-3 sm:px-4">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/play/online"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-silver transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Lobby
          </Link>
          <div className="flex items-center gap-2 text-xs">
            {game.connected ? (
              <span className="flex items-center gap-1 text-green-400/80">
                <Wifi className="w-3.5 h-3.5" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive">
                <WifiOff className="w-3.5 h-3.5" /> Reconnecting...
              </span>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground capitalize">
              {room.variant === "half-chess" ? "Half-Chess" : "Standard"}
            </span>
            {game.spectator && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-purple flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Spectating
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6">
          {/* Board area */}
          <div className="flex flex-col items-center">
            {/* Opponent info bar */}
            <div className="w-full max-w-[min(90vw,560px)] flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple/30 to-silver/20 flex items-center justify-center text-xs font-bold text-silver shrink-0">
                  {opponentName?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-silver font-medium truncate">
                    {opponentName ?? "Waiting..."}
                  </div>
                  <div className="h-5">{renderCaptured(topCaptured)}</div>
                </div>
              </div>
              {state.inCheck && state.turn !== game.myColor && (
                <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive font-medium shrink-0">
                  Check!
                </span>
              )}
            </div>

            {/* Status */}
            <div className="w-full max-w-[min(90vw,560px)] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPlaying && myTurn
                      ? "bg-gold animate-pulse"
                      : isPlaying
                        ? "bg-purple/40"
                        : "bg-muted"
                  }`}
                />
                <span className={`text-sm font-medium ${statusClass}`}>{statusText}</span>
              </div>
              {game.error && (
                <span className="text-xs text-destructive">{game.error}</span>
              )}
            </div>

            {/* Chess Board */}
            <ChessBoard
              state={state}
              onMove={handleMove}
              disabled={boardDisabled}
              flipped={flipped}
              lastMove={state.moveHistory[state.moveHistory.length - 1] ?? null}
            />

            {/* Self info bar */}
            <div className="w-full max-w-[min(90vw,560px)] flex items-center justify-between mt-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple/40 to-gold/40 flex items-center justify-center text-xs font-bold text-gold-light shrink-0">
                  {(myName ?? guestName).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-silver font-medium truncate">
                    {myName ?? guestName}
                    {game.spectator && " (spectator)"}
                  </div>
                  <div className="h-5">{renderCaptured(bottomCaptured)}</div>
                </div>
              </div>
              {state.inCheck && state.turn === game.myColor && (
                <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive font-medium shrink-0">
                  Check!
                </span>
              )}
            </div>

            {/* Action buttons */}
            {!game.spectator && isPlaying && !waitingForOpponent && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <button
                  onClick={() => {
                    if (window.confirm("Resign this game?")) game.resign();
                  }}
                  className="px-4 py-2 rounded-lg border border-border text-silver text-sm font-medium hover:border-destructive/50 hover:text-destructive transition-all flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" /> Resign
                </button>
                {game.drawOffered && game.drawOffered !== game.myColor ? (
                  <button
                    onClick={game.acceptDraw}
                    className="px-4 py-2 rounded-lg bg-purple/20 border border-purple/40 text-purple-light text-sm font-medium hover:bg-purple/30 transition-all flex items-center gap-2 animate-pulse"
                  >
                    <Handshake className="w-4 h-4" /> Accept Draw
                  </button>
                ) : (
                  <button
                    onClick={game.offerDraw}
                    disabled={game.drawOffered === game.myColor}
                    className="px-4 py-2 rounded-lg border border-border text-silver text-sm font-medium hover:border-gold/30 hover:text-gold-light transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Handshake className="w-4 h-4" />
                    {game.drawOffered === game.myColor ? "Draw Offered" : "Offer Draw"}
                  </button>
                )}
              </div>
            )}

            {/* Game over actions */}
            {!isPlaying && state.status !== "playing" && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                <button
                  onClick={() => setLocation("/play/online")}
                  className="px-5 py-2.5 rounded-lg bg-gold text-navy-dark font-semibold text-sm btn-press hover:bg-gold-light transition-colors"
                >
                  Back to Lobby
                </button>
                <Link
                  href="/stats"
                  className="px-5 py-2.5 rounded-lg border border-border text-silver text-sm font-medium hover:border-gold/30 hover:text-gold-light transition-all"
                >
                  View Leaderboard
                </Link>
              </div>
            )}
          </div>

          {/* Side panel: invite, move list, chat */}
          <div className="space-y-4">
            {/* Invite link */}
            {waitingForOpponent && !game.spectator && (
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-medium text-gold-light mb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Invite an opponent
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Share this link with a friend so they can join your game.
                </p>
                <button
                  onClick={copyLink}
                  className="w-full px-3 py-2 rounded-lg bg-navy-dark/60 border border-border text-silver text-xs font-mono hover:border-gold/40 transition-all flex items-center justify-between gap-2"
                >
                  <span className="truncate">{window.location.origin}/play/online/{roomId}</span>
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 shrink-0" />
                  )}
                </button>
              </div>
            )}

            {/* Move list */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-medium text-gold-light mb-3">Moves</h3>
              <div className="max-h-48 overflow-y-auto pr-1">
                {state.moveHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No moves yet
                  </p>
                ) : (
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm font-mono">
                    {state.moveHistory.map((m, i) => {
                      const moveNum = Math.floor(i / 2) + 1;
                      const isWhite = i % 2 === 0;
                      return (
                        <div key={i} className="contents">
                          {isWhite && (
                            <span className="text-muted-foreground text-xs">
                              {moveNum}.
                            </span>
                          )}
                          {!isWhite && i === 0 && <span />}
                          <span
                            className={`${
                              isWhite ? "text-silver col-start-2" : "text-silver-dark col-start-3"
                            }`}
                          >
                            {moveToNotation(m)}
                          </span>
                          {!isWhite && <span />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Chat */}
            {!game.spectator && (
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-medium text-gold-light mb-3">Chat</h3>
                <div
                  ref={chatRef}
                  className="max-h-32 overflow-y-auto pr-1 mb-2 space-y-1.5 text-sm"
                >
                  {game.chat.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Be respectful and good luck!
                    </p>
                  ) : (
                    game.chat.map((msg, i) => (
                      <div key={i} className="flex gap-2">
                        <span
                          className={`font-medium text-xs ${
                            msg.color === game.myColor ? "text-gold-light" : "text-purple-light"
                          }`}
                        >
                          {msg.from}:
                        </span>
                        <span className="text-silver text-xs">{msg.message}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value.slice(0, 200))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChat();
                    }}
                    placeholder="Send a message..."
                    className="flex-1 px-3 py-1.5 rounded-md bg-navy-dark/60 border border-border text-silver text-xs focus:outline-none focus:border-gold/40"
                  />
                  <button
                    onClick={sendChat}
                    className="p-1.5 rounded-md bg-gold/20 text-gold-light hover:bg-gold/30 transition-colors"
                    aria-label="Send"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
