/**
 * Stats / Leaderboard Page — Edmonds Chess Club
 * Shows the club leaderboard (DB-backed) and personal local stats.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { getStats, type PlayerStats } from "@/lib/game-stats";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Crown, Medal, Loader2, User, ArrowRight } from "lucide-react";

interface LeaderboardEntry {
  id: number;
  name: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function Stats() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [localStats, setLocalStats] = useState<PlayerStats>(getStats());

  useEffect(() => {
    setLocalStats(getStats());
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => setLeaderboard(data.leaderboard ?? []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, []);

  const localWinRate =
    localStats.gamesPlayed > 0
      ? Math.round((localStats.wins / localStats.gamesPlayed) * 100)
      : 0;

  return (
    <div className="py-12 sm:py-16">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gold-gradient mb-3">
            Leaderboard
          </h1>
          <p className="text-silver-dark">
            Top-ranked players in the Edmonds Chess Club community
          </p>
        </div>

        {/* Club leaderboard */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8">
          <h2 className="font-display text-xl text-gold-light mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5" /> Club Rankings
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 text-gold animate-spin mx-auto" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-4">No ranked games played yet.</p>
              <Link
                href="/play/online"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/20 border border-gold/40 text-gold-light text-sm hover:bg-gold/30 transition-colors"
              >
                Be the first <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border/40">
                    <th className="py-2.5 pr-3 text-left font-medium">#</th>
                    <th className="py-2.5 px-3 text-left font-medium">Player</th>
                    <th className="py-2.5 px-3 text-right font-medium">Rating</th>
                    <th className="py-2.5 px-3 text-right font-medium hidden sm:table-cell">W</th>
                    <th className="py-2.5 px-3 text-right font-medium hidden sm:table-cell">L</th>
                    <th className="py-2.5 px-3 text-right font-medium hidden sm:table-cell">D</th>
                    <th className="py-2.5 pl-3 text-right font-medium">Games</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    const isMe = user && entry.id === user.id;
                    const totalGames = entry.wins + entry.losses + entry.draws;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-border/20 transition-colors ${
                          isMe ? "bg-gold/5" : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <RankBadge rank={rank} />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple/30 to-gold/30 flex items-center justify-center text-xs font-bold text-gold-light shrink-0">
                              {(entry.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <span className={`font-medium ${isMe ? "text-gold-light" : "text-silver"}`}>
                              {entry.name ?? "Unknown"}
                              {isMe && <span className="text-xs text-gold/70 ml-1.5">(you)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-gold">{entry.rating}</span>
                        </td>
                        <td className="py-3 px-3 text-right text-green-400/80 hidden sm:table-cell">
                          {entry.wins}
                        </td>
                        <td className="py-3 px-3 text-right text-destructive/80 hidden sm:table-cell">
                          {entry.losses}
                        </td>
                        <td className="py-3 px-3 text-right text-silver-dark hidden sm:table-cell">
                          {entry.draws}
                        </td>
                        <td className="py-3 pl-3 text-right text-muted-foreground">
                          {totalGames}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Personal local stats (offline games) */}
        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="font-display text-xl text-gold-light mb-5 flex items-center gap-2">
            <User className="w-5 h-5" /> Your Local Stats
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            Stats from offline games (vs computer / pass-and-play). Online ratings appear above.
          </p>

          {localStats.gamesPlayed === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Medal className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No local games played yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Games" value={localStats.gamesPlayed} />
              <StatCard label="Wins" value={localStats.wins} colorClass="text-green-400" />
              <StatCard label="Losses" value={localStats.losses} colorClass="text-destructive" />
              <StatCard label="Win Rate" value={`${localWinRate}%`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-navy-dark font-bold text-xs">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-navy-dark font-bold text-xs">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white font-bold text-xs">
        3
      </span>
    );
  }
  return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
}

function StatCard({
  label,
  value,
  colorClass = "text-silver",
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-white/[0.02] p-4 text-center">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
