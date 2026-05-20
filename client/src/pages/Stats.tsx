/**
 * Stats Page — Edmonds Chess Club
 * Shows player statistics, rating, and game history
 */
import { useState, useEffect } from "react";
import { getStats, resetStats, type PlayerStats, type GameRecord } from "@/lib/game-stats";
import { Trophy, Target, TrendingUp, Clock, RotateCcw, Trash2 } from "lucide-react";

export default function Stats() {
  const [stats, setStats] = useState<PlayerStats>(getStats());

  useEffect(() => {
    setStats(getStats());
  }, []);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all stats? This cannot be undone.')) {
      resetStats();
      setStats(getStats());
    }
  };

  return (
    <div className="py-16 sm:py-24">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-gold-gradient text-center mb-4">
          Your Stats
        </h1>
        <p className="text-center text-silver-dark mb-12">
          Track your progress and improvement over time.
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="glass-card rounded-xl p-5 text-center">
            <Trophy className="w-6 h-6 text-gold mx-auto mb-2" />
            <div className="text-2xl font-bold text-gold-light">{stats.rating}</div>
            <div className="text-xs text-muted-foreground mt-1">Rating</div>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <Target className="w-6 h-6 text-purple-light mx-auto mb-2" />
            <div className="text-2xl font-bold text-silver">{stats.gamesPlayed}</div>
            <div className="text-xs text-muted-foreground mt-1">Games</div>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-silver">{winRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
          </div>
          <div className="glass-card rounded-xl p-5 text-center">
            <Clock className="w-6 h-6 text-silver mx-auto mb-2" />
            <div className="text-2xl font-bold text-silver">{stats.bestStreak}</div>
            <div className="text-xs text-muted-foreground mt-1">Best Streak</div>
          </div>
        </div>

        {/* Win/Loss/Draw breakdown */}
        <div className="glass-card rounded-xl p-6 mb-10">
          <h2 className="font-display text-lg font-semibold text-gold-light mb-4">Record</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
              <div className="text-sm text-muted-foreground">Wins</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-silver-dark">{stats.draws}</div>
              <div className="text-sm text-muted-foreground">Draws</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
              <div className="text-sm text-muted-foreground">Losses</div>
            </div>
          </div>
          {stats.gamesPlayed > 0 && (
            <div className="mt-4 h-3 rounded-full overflow-hidden bg-navy-light flex">
              <div className="bg-green-500 transition-all" style={{ width: `${(stats.wins / stats.gamesPlayed) * 100}%` }} />
              <div className="bg-gray-500 transition-all" style={{ width: `${(stats.draws / stats.gamesPlayed) * 100}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${(stats.losses / stats.gamesPlayed) * 100}%` }} />
            </div>
          )}
          {stats.streak !== 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Current streak: <span className={stats.streak > 0 ? 'text-green-400' : 'text-red-400'}>
                {stats.streak > 0 ? `${stats.streak} wins` : `${Math.abs(stats.streak)} losses`}
              </span>
            </p>
          )}
        </div>

        {/* Game History */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-gold-light">Recent Games</h2>
            {stats.history.length > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
          {stats.history.length === 0 ? (
            <p className="text-muted-foreground text-sm italic py-8 text-center">
              No games played yet. Start a game to track your progress!
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stats.history.slice(0, 20).map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameRow({ game }: { game: GameRecord }) {
  const resultColor = game.result === 'win' ? 'text-green-400' : game.result === 'loss' ? 'text-red-400' : 'text-silver-dark';
  const date = new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold uppercase ${resultColor}`}>
          {game.result}
        </span>
        <span className="text-sm text-silver capitalize">
          {game.variant === 'half-chess' ? 'Half-Chess' : 'Standard'}
        </span>
        {game.difficulty && (
          <span className="text-xs text-muted-foreground capitalize">
            vs {game.difficulty}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{game.moves} moves</span>
        <span>{date}</span>
      </div>
    </div>
  );
}
