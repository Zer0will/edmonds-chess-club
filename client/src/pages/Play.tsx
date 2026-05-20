/**
 * Play Page — Edmonds Chess Club
 * Game lobby: choose variant, mode, difficulty, then play
 * Supports standard chess and half-chess
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useSearch, Link } from "wouter";
import ChessBoard from "@/components/ChessBoard";
import {
  createInitialState,
  makeMove,
  getBestMove,
  getAllLegalMoves,
  moveToNotation,
  getPieceSymbol,
  type GameState,
  type Move,
  type Variant,
  type Difficulty,
  type Color,
  type Piece,
} from "@/lib/chess-engine";
import { RotateCcw, Play, Users, Bot, Crown, Swords, ChevronDown } from "lucide-react";
import { recordGame } from "@/lib/game-stats";
import { useChessClock, TIME_CONTROLS } from "@/hooks/useChessClock";

type GameMode = 'human_vs_human' | 'human_vs_bot';
type GamePhase = 'lobby' | 'playing';

export default function PlayPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlVariant = params.get('variant') as Variant | null;

  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [variant, setVariant] = useState<Variant>(urlVariant === 'half-chess' ? 'half-chess' : 'standard');
  const [mode, setMode] = useState<GameMode>('human_vs_bot');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [playerColor, setPlayerColor] = useState<Color>('white');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [moveList, setMoveList] = useState<string[]>([]);
  const moveListRef = useRef<HTMLDivElement>(null);

  // Start game
  const startGame = useCallback(() => {
    const state = createInitialState(variant);
    setGameState(state);
    setLastMove(null);
    setMoveList([]);
    setPhase('playing');
  }, [variant]);

  // Handle player move
  const handleMove = useCallback((move: Move) => {
    if (!gameState || gameState.status !== 'playing') return;
    const newState = makeMove(gameState, move);
    setGameState(newState);
    setLastMove(move);
    setMoveList(prev => [...prev, moveToNotation(move)]);
  }, [gameState]);

  // Bot move
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    if (mode !== 'human_vs_bot') return;
    if (gameState.turn === playerColor) return;

    setIsThinking(true);
    const timer = setTimeout(() => {
      const bestMove = getBestMove(gameState, difficulty);
      if (bestMove) {
        const newState = makeMove(gameState, bestMove);
        setGameState(newState);
        setLastMove(bestMove);
        setMoveList(prev => [...prev, moveToNotation(bestMove)]);
      }
      setIsThinking(false);
    }, 300 + Math.random() * 400); // Small delay for natural feel

    return () => clearTimeout(timer);
  }, [gameState, mode, playerColor, difficulty]);

  // Record game result when game ends
  useEffect(() => {
    if (!gameState || gameState.status === 'playing') return;
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (gameState.status === 'checkmate') {
      result = gameState.winner === playerColor ? 'win' : 'loss';
    }
    recordGame({
      variant,
      mode,
      difficulty: mode === 'human_vs_bot' ? difficulty : undefined,
      playerColor,
      result,
      moves: gameState.moveHistory.length,
      duration: 0,
    });
  }, [gameState?.status]);

  // Auto-scroll move list
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moveList]);

  // New game
  const resetGame = () => {
    setPhase('lobby');
    setGameState(null);
    setLastMove(null);
    setMoveList([]);
  };

  const isPlayerTurn = gameState ? (mode === 'human_vs_human' || gameState.turn === playerColor) : false;
  const boardDisabled = !isPlayerTurn || isThinking || gameState?.status !== 'playing';

  // Captured pieces
  const renderCaptured = (pieces: Piece[]) => {
    if (pieces.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-0.5">
        {pieces.sort((a, b) => {
          const order: Record<string, number> = { k: -1, q: 0, r: 1, b: 2, n: 3, p: 4 };
          return order[a.type] - order[b.type];
        }).map((p, i) => (
          <span key={i} className="text-lg opacity-70">{getPieceSymbol(p)}</span>
        ))}
      </div>
    );
  };

  if (phase === 'lobby') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
        <div className="container max-w-lg mx-auto px-4">
          <div className="glass-card rounded-2xl p-8 sm:p-10">
            <h1 className="font-display text-3xl font-bold text-gold-gradient text-center mb-3">
              New Game
            </h1>
            <div className="mb-7 text-center">
              <Link
                href="/play/online"
                className="inline-flex items-center gap-2 text-sm text-purple-light hover:text-gold-light underline-offset-4 hover:underline transition-colors"
              >
                Or play online vs another club member →
              </Link>
            </div>

            {/* Variant Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-silver mb-3">Variant</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVariant('standard')}
                  className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                    variant === 'standard'
                      ? 'border-gold/50 bg-gold/10 text-gold-light'
                      : 'border-border hover:border-gold/30 text-silver-dark hover:text-silver'
                  }`}
                  aria-pressed={variant === 'standard'}
                >
                  <Crown className="w-5 h-5 mb-2" />
                  <div className="font-semibold text-sm">Standard</div>
                  <div className="text-xs opacity-70 mt-1">Full 32 pieces</div>
                </button>
                <button
                  onClick={() => setVariant('half-chess')}
                  className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                    variant === 'half-chess'
                      ? 'border-purple/50 bg-purple/10 text-purple-light'
                      : 'border-border hover:border-purple/30 text-silver-dark hover:text-silver'
                  }`}
                  aria-pressed={variant === 'half-chess'}
                >
                  <Swords className="w-5 h-5 mb-2" />
                  <div className="font-semibold text-sm">Half-Chess</div>
                  <div className="text-xs opacity-70 mt-1">King-side only</div>
                </button>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-silver mb-3">Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('human_vs_bot')}
                  className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                    mode === 'human_vs_bot'
                      ? 'border-gold/50 bg-gold/10 text-gold-light'
                      : 'border-border hover:border-gold/30 text-silver-dark hover:text-silver'
                  }`}
                  aria-pressed={mode === 'human_vs_bot'}
                >
                  <Bot className="w-5 h-5 mb-2" />
                  <div className="font-semibold text-sm">vs Computer</div>
                  <div className="text-xs opacity-70 mt-1">Play against AI</div>
                </button>
                <button
                  onClick={() => setMode('human_vs_human')}
                  className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                    mode === 'human_vs_human'
                      ? 'border-gold/50 bg-gold/10 text-gold-light'
                      : 'border-border hover:border-gold/30 text-silver-dark hover:text-silver'
                  }`}
                  aria-pressed={mode === 'human_vs_human'}
                >
                  <Users className="w-5 h-5 mb-2" />
                  <div className="font-semibold text-sm">vs Human</div>
                  <div className="text-xs opacity-70 mt-1">Same device</div>
                </button>
              </div>
            </div>

            {/* Difficulty (only for bot mode) */}
            {mode === 'human_vs_bot' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-silver mb-3">Difficulty</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['beginner', 'intermediate', 'advanced', 'expert'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-3 py-3 min-h-[44px] rounded-lg border text-xs font-medium capitalize transition-all duration-200 ${
                        difficulty === d
                          ? 'border-gold/50 bg-gold/10 text-gold-light'
                          : 'border-border hover:border-gold/30 text-silver-dark'
                      }`}
                      aria-pressed={difficulty === d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection (only for bot mode) */}
            {mode === 'human_vs_bot' && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-silver mb-3">Play as</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPlayerColor('white')}
                    className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                      playerColor === 'white'
                        ? 'border-gold/50 bg-gold/10 text-gold-light'
                        : 'border-border hover:border-gold/30 text-silver-dark'
                    }`}
                    aria-pressed={playerColor === 'white'}
                  >
                    <span className="text-2xl">♔</span>
                    <div className="text-xs font-medium mt-1">White</div>
                  </button>
                  <button
                    onClick={() => setPlayerColor('black')}
                    className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                      playerColor === 'black'
                        ? 'border-gold/50 bg-gold/10 text-gold-light'
                        : 'border-border hover:border-gold/30 text-silver-dark'
                    }`}
                    aria-pressed={playerColor === 'black'}
                  >
                    <span className="text-2xl">♚</span>
                    <div className="text-xs font-medium mt-1">Black</div>
                  </button>
                </div>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={startGame}
              className="w-full py-4 rounded-xl bg-gold text-navy-dark font-bold text-lg transition-all duration-200 hover:bg-gold-light hover:shadow-lg hover:shadow-gold/20 btn-press flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" /> Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-10">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          {/* Board Area */}
          <div className="flex flex-col items-center">
            {/* Game Status */}
            <div className="w-full max-w-[min(90vw,560px)] mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {gameState?.status === 'playing' && (
                    <>
                      <div className={`w-3 h-3 rounded-full ${isThinking ? 'bg-purple animate-pulse' : 'bg-gold'}`} />
                      <span className="text-sm text-silver font-medium">
                        {isThinking ? 'Thinking...' : `${gameState.turn === 'white' ? 'White' : 'Black'} to move`}
                      </span>
                      {gameState.inCheck && (
                        <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive font-medium">
                          Check!
                        </span>
                      )}
                    </>
                  )}
                  {gameState?.status === 'checkmate' && (
                    <span className="text-sm font-bold text-gold">
                      Checkmate! {gameState.winner === 'white' ? 'White' : 'Black'} wins!
                    </span>
                  )}
                  {gameState?.status === 'stalemate' && (
                    <span className="text-sm font-bold text-silver">Stalemate — Draw</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50 capitalize">
                    {variant === 'half-chess' ? 'Half-Chess' : 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent captured pieces */}
            <div className="w-full max-w-[min(90vw,560px)] h-7 mb-1">
              {gameState && renderCaptured(
                playerColor === 'white' || mode === 'human_vs_human'
                  ? gameState.capturedBlack
                  : gameState.capturedWhite
              )}
            </div>

            {/* Chess Board */}
            {gameState && (
              <ChessBoard
                state={gameState}
                onMove={handleMove}
                disabled={boardDisabled}
                flipped={mode === 'human_vs_bot' && playerColor === 'black'}
                lastMove={lastMove}
              />
            )}

            {/* Player captured pieces */}
            <div className="w-full max-w-[min(90vw,560px)] h-7 mt-1">
              {gameState && renderCaptured(
                playerColor === 'white' || mode === 'human_vs_human'
                  ? gameState.capturedWhite
                  : gameState.capturedBlack
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={resetGame}
                className="px-5 py-2.5 rounded-lg border border-border text-silver text-sm font-medium hover:border-gold/30 hover:text-gold-light transition-all btn-press flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> New Game
              </button>
            </div>
          </div>

          {/* Side Panel — Move History */}
          <div className="glass-card rounded-xl p-5 h-fit lg:sticky lg:top-24">
            <h3 className="font-display text-lg font-semibold text-gold-light mb-4">Moves</h3>
            <div
              ref={moveListRef}
              className="max-h-[300px] lg:max-h-[400px] overflow-y-auto space-y-1 text-sm font-mono"
              role="log"
              aria-label="Move history"
            >
              {moveList.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">No moves yet</p>
              ) : (
                <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-0.5">
                  {Array.from({ length: Math.ceil(moveList.length / 2) }).map((_, i) => (
                    <React.Fragment key={i}>
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="text-silver">{moveList[i * 2] || ''}</span>
                      <span className="text-silver-dark">{moveList[i * 2 + 1] || ''}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Game info */}
            <div className="mt-4 pt-4 border-t border-border/50 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Variant</span>
                <span className="text-silver capitalize">{variant === 'half-chess' ? 'Half-Chess' : 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode</span>
                <span className="text-silver">{mode === 'human_vs_bot' ? `vs AI (${difficulty})` : 'vs Human'}</span>
              </div>
              {gameState && (
                <div className="flex justify-between">
                  <span>Move</span>
                  <span className="text-silver">{gameState.fullMoveNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Need React import for Fragment
import React from "react";
