/**
 * Profile Page — view your account stats and recent online games.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth, getLoginUrl } from "@/hooks/useAuth";
import { Trophy, Loader2, User, Crown, Clock } from "lucide-react";

interface GameRecord {
  id: number;
  variant: "standard" | "half-chess";
  whiteName: string;
  blackName: string;
  winnerColor: "white" | "black" | null;
  result: "checkmate" | "resignation" | "stalemate" | "draw" | "abandoned";
  moves: number;
  finishedAt: number;
  myColor: "white" | "black" | null;
}

export default function Profile() {
  const { user, loading, isAuthenticated } = useAuth();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setGamesLoading(false);
      return;
    }
    fetch("/api/games/mine", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setGames(data.games ?? []))
      .catch(() => setGames([]))
      .finally(() => setGamesLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="container max-w-md mx-auto px-4">
          <div className="glass-card rounded-2xl p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gold/60" />
            <h1 className="font-display text-2xl text-gold-light mb-2">Sign in required</h1>
            <p className="text-silver-dark text-sm mb-6">
              Sign in to view your profile, rating, and game history.
            </p>
            <a
              href={getLoginUrl("/profile")}
              className="inline-block px-6 py-3 rounded-lg bg-gold text-navy-dark font-semibold hover:bg-gold-light transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 sm:py-12">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Profile header */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple/40 to-gold/40 flex items-center justify-center text-3xl font-bold text-gold-light shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-display text-2xl sm:text-3xl text-gold-light">{user.name}</h1>
              {user.email && (
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
                <div className="px-4 py-2 rounded-lg bg-gold/10 border border-gold/30">
                  <div className="text-xs text-gold/70 uppercase tracking-wider">Rating</div>
                  <div className="text-2xl font-bold text-gold">{user.rating}</div>
                </div>
                <div className="px-4 py-2 rounded-lg bg-white/5 border border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Games</div>
                  <div className="text-2xl font-bold text-silver">{totalGames}</div>
                </div>
                <div className="px-4 py-2 rounded-lg bg-white/5 border border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</div>
                  <div className="text-2xl font-bold text-silver">{winRate}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* W-L-D bar */}
          {totalGames > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>{user.wins} wins</span>
                <span>{user.draws} draws</span>
                <span>{user.losses} losses</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                <div
                  className="bg-green-500/70"
                  style={{ width: `${(user.wins / totalGames) * 100}%` }}
                />
                <div
                  className="bg-silver-dark/50"
                  style={{ width: `${(user.draws / totalGames) * 100}%` }}
                />
                <div
                  className="bg-destructive/70"
                  style={{ width: `${(user.losses / totalGames) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent games */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl text-gold-light mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Recent Online Games
          </h2>

          {gamesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-4">No online games yet.</p>
              <Link
                href="/play/online"
                className="inline-block px-4 py-2 rounded-lg bg-gold/20 border border-gold/40 text-gold-light text-sm hover:bg-gold/30 transition-colors"
              >
                Find a Game
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {games.map((game) => {
                let resultLabel = "Draw";
                let resultClass = "text-silver-dark";
                if (game.winnerColor) {
                  if (game.winnerColor === game.myColor) {
                    resultLabel = "Win";
                    resultClass = "text-green-400";
                  } else {
                    resultLabel = "Loss";
                    resultClass = "text-destructive";
                  }
                }

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-white/[0.02]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-silver">
                          {game.whiteName} vs {game.blackName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{game.variant === "half-chess" ? "Half-Chess" : "Standard"}</span>
                        <span>·</span>
                        <span>{game.moves} moves</span>
                        <span>·</span>
                        <span className="capitalize">{game.result}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(game.finishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${resultClass} shrink-0 ml-3`}>
                      {resultLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
