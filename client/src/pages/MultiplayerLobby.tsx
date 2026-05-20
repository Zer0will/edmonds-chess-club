/**
 * Multiplayer Lobby — create or join a real-time online chess game.
 */
import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, getLoginUrl } from "@/hooks/useAuth";
import { Crown, Swords, Plus, Users, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import type { Variant } from "@shared/chess-engine";

interface OpenRoom {
  id: string;
  variant: Variant;
  hostName: string;
  createdAt: number;
}

export default function MultiplayerLobby() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [variant, setVariant] = useState<Variant>("standard");
  const [color, setColor] = useState<"white" | "black">("white");
  const [creating, setCreating] = useState(false);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [guestName, setGuestName] = useState("");

  const fetchOpenGames = useCallback(async () => {
    setRefreshing(true);
    try {
      const resp = await fetch("/api/games/open");
      const data = await resp.json();
      setOpenRooms(data.rooms ?? []);
    } catch {
      setOpenRooms([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOpenGames();
    const id = setInterval(fetchOpenGames, 5000);
    return () => clearInterval(id);
  }, [fetchOpenGames]);

  const createGame = async () => {
    if (!isAuthenticated && !guestName.trim()) {
      return;
    }
    setCreating(true);
    try {
      const resp = await fetch("/api/games/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variant, color, guestName: guestName.trim() || undefined }),
      });
      const data = await resp.json();
      if (data.roomId) {
        setLocation(`/play/online/${data.roomId}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = (roomId: string) => {
    setLocation(`/play/online/${roomId}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gold-gradient mb-3">
            Online Multiplayer
          </h1>
          <p className="text-silver-dark text-lg">
            Play live chess against members of the Edmonds Chess Club community
          </p>
        </div>

        {!isAuthenticated && !authLoading && (
          <div className="glass-card rounded-2xl p-6 mb-6 border-gold/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg text-gold-light mb-1">Sign in to track your rating</h3>
                <p className="text-sm text-silver-dark">
                  Create an account to appear on the leaderboard, save your stats, and earn an Elo rating.
                </p>
              </div>
              <a
                href={getLoginUrl("/play/online")}
                className="px-5 py-2.5 rounded-lg bg-gold text-navy-dark font-semibold text-sm whitespace-nowrap btn-press hover:bg-gold-light transition-colors"
              >
                Sign In
              </a>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Create new game */}
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-2xl text-gold-light mb-6 flex items-center gap-2">
              <Plus className="w-6 h-6" /> Create a Game
            </h2>

            <div className="mb-5">
              <label className="block text-sm font-medium text-silver mb-2">Variant</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVariant("standard")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    variant === "standard"
                      ? "border-gold/50 bg-gold/10 text-gold-light"
                      : "border-border text-silver-dark hover:border-gold/30"
                  }`}
                  aria-pressed={variant === "standard"}
                >
                  <Crown className="w-4 h-4 mb-1" />
                  <div className="font-semibold text-sm">Standard</div>
                </button>
                <button
                  onClick={() => setVariant("half-chess")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    variant === "half-chess"
                      ? "border-purple/50 bg-purple/10 text-purple-light"
                      : "border-border text-silver-dark hover:border-purple/30"
                  }`}
                  aria-pressed={variant === "half-chess"}
                >
                  <Swords className="w-4 h-4 mb-1" />
                  <div className="font-semibold text-sm">Half-Chess</div>
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-silver mb-2">Play as</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setColor("white")}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    color === "white"
                      ? "border-gold/50 bg-gold/10 text-gold-light"
                      : "border-border text-silver-dark hover:border-gold/30"
                  }`}
                  aria-pressed={color === "white"}
                >
                  <span className="text-xl">♔</span>
                  <div className="text-xs font-medium mt-1">White</div>
                </button>
                <button
                  onClick={() => setColor("black")}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    color === "black"
                      ? "border-gold/50 bg-gold/10 text-gold-light"
                      : "border-border text-silver-dark hover:border-gold/30"
                  }`}
                  aria-pressed={color === "black"}
                >
                  <span className="text-xl">♚</span>
                  <div className="text-xs font-medium mt-1">Black</div>
                </button>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-silver mb-2">Display Name (Guest)</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value.slice(0, 20))}
                  placeholder="Enter a name"
                  className="w-full px-4 py-2.5 rounded-lg bg-navy-dark/60 border border-border text-silver focus:outline-none focus:border-gold/50 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Guest games don't count toward ratings.
                </p>
              </div>
            )}

            <button
              onClick={createGame}
              disabled={creating || (!isAuthenticated && !guestName.trim())}
              className="w-full py-3 rounded-lg bg-gold text-navy-dark font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed btn-press hover:bg-gold-light transition-colors flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Game
            </button>
          </div>

          {/* Join open game */}
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-gold-light flex items-center gap-2">
                <Users className="w-6 h-6" /> Open Games
              </h2>
              <button
                onClick={fetchOpenGames}
                className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-silver transition-colors"
                aria-label="Refresh open games"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>

            {openRooms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No open games right now.</p>
                <p className="text-xs mt-1">Create one and invite a friend!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {openRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => joinRoom(room.id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-gold/40 hover:bg-white/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple/30 to-gold/30 flex items-center justify-center text-sm font-bold text-gold-light">
                        {room.hostName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-silver font-medium">{room.hostName}</div>
                        <div className="text-xs text-muted-foreground">
                          {room.variant === "half-chess" ? "Half-Chess" : "Standard"} •{" "}
                          {Math.max(0, Math.floor((Date.now() - room.createdAt) / 1000))}s ago
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {user && (
              <p className="mt-6 pt-4 border-t border-border/30 text-xs text-muted-foreground">
                Playing as <span className="text-silver">{user.name}</span> · Rating{" "}
                <span className="text-gold">{user.rating}</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/play"
            className="text-sm text-muted-foreground hover:text-silver transition-colors"
          >
            ← Back to single-player
          </Link>
        </div>
      </div>
    </div>
  );
}
