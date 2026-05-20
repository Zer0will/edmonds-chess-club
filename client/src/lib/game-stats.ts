/**
 * Game Stats — Edmonds Chess Club
 * Local storage-based game history and statistics
 * Tracks wins, losses, draws, and rating (Elo-like)
 */

export interface GameRecord {
  id: string;
  date: string;
  variant: 'standard' | 'half-chess';
  mode: 'human_vs_bot' | 'human_vs_human';
  difficulty?: string;
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  moves: number;
  duration: number; // seconds
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  streak: number; // positive = win streak, negative = loss streak
  bestStreak: number;
  history: GameRecord[];
}

const STORAGE_KEY = 'edmonds-chess-stats';
const DEFAULT_RATING = 1200;

export function getStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rating: DEFAULT_RATING,
    streak: 0,
    bestStreak: 0,
    history: [],
  };
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordGame(record: Omit<GameRecord, 'id' | 'date'>): PlayerStats {
  const stats = getStats();
  const gameRecord: GameRecord = {
    ...record,
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
  };

  stats.history.unshift(gameRecord);
  if (stats.history.length > 100) stats.history = stats.history.slice(0, 100);
  stats.gamesPlayed++;

  // Update win/loss/draw
  if (record.result === 'win') {
    stats.wins++;
    stats.streak = stats.streak >= 0 ? stats.streak + 1 : 1;
  } else if (record.result === 'loss') {
    stats.losses++;
    stats.streak = stats.streak <= 0 ? stats.streak - 1 : -1;
  } else {
    stats.draws++;
    stats.streak = 0;
  }
  stats.bestStreak = Math.max(stats.bestStreak, stats.streak);

  // Update rating (simplified Elo)
  const K = 32;
  const difficultyRating: Record<string, number> = {
    beginner: 800,
    intermediate: 1200,
    advanced: 1600,
    expert: 2000,
  };
  const opponentRating = record.mode === 'human_vs_bot'
    ? difficultyRating[record.difficulty || 'intermediate'] || 1200
    : stats.rating; // mirror for local games

  const expected = 1 / (1 + Math.pow(10, (opponentRating - stats.rating) / 400));
  const actual = record.result === 'win' ? 1 : record.result === 'draw' ? 0.5 : 0;
  stats.rating = Math.max(100, Math.round(stats.rating + K * (actual - expected)));

  saveStats(stats);
  return stats;
}

export function resetStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}
