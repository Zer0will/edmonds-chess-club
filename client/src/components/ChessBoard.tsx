/**
 * ChessBoard Component — Edmonds Chess Club
 * Responsive chess board with touch drag-and-drop, click-to-move, and visual feedback
 * Scales from 320px phones to 4K displays
 * Full keyboard accessibility and ARIA labels
 */
import { useState, useRef, useCallback, useEffect } from "react";
import type { GameState, Move, Position, Piece } from "@/lib/chess-engine";
import { generateMoves, getPieceSymbol } from "@/lib/chess-engine";

interface ChessBoardProps {
  state: GameState;
  onMove: (move: Move) => void;
  disabled?: boolean;
  flipped?: boolean;
  lastMove?: Move | null;
  highlightKing?: boolean;
}

export default function ChessBoard({
  state,
  onMove,
  disabled = false,
  flipped = false,
  lastMove = null,
  highlightKing = true,
}: ChessBoardProps) {
  const [selected, setSelected] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [dragPiece, setDragPiece] = useState<{ piece: Piece; pos: Position; x: number; y: number } | null>(null);
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Clear selection when turn changes or game ends
  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
  }, [state.turn, state.status]);

  const getSquareFromEvent = useCallback((clientX: number, clientY: number): Position | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const squareSize = rect.width / 8;
    let c = Math.floor((clientX - rect.left) / squareSize);
    let r = Math.floor((clientY - rect.top) / squareSize);
    if (flipped) { r = 7 - r; c = 7 - c; }
    if (r < 0 || r > 7 || c < 0 || c > 7) return null;
    return { r, c };
  }, [flipped]);

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (disabled || state.status !== 'playing') return;

    const clicked = state.board[r][c];

    if (selected) {
      // Try to make a move
      const move = legalMoves.find(m => m.to.r === r && m.to.c === c);
      if (move) {
        // Check if this is a promotion move
        if (move.promotion) {
          setPromotionMove(move);
        } else {
          onMove(move);
        }
        setSelected(null);
        setLegalMoves([]);
        return;
      }
      // Select different piece of same color
      if (clicked && clicked.color === state.turn) {
        const pos = { r, c };
        setSelected(pos);
        setLegalMoves(generateMoves(state.board, pos, state));
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    } else {
      // Select a piece
      if (clicked && clicked.color === state.turn) {
        const pos = { r, c };
        setSelected(pos);
        setLegalMoves(generateMoves(state.board, pos, state));
      }
    }
  }, [disabled, state, selected, legalMoves, onMove]);

  // Touch/Mouse drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, r: number, c: number) => {
    if (disabled || state.status !== 'playing') return;
    const piece = state.board[r][c];
    if (!piece || piece.color !== state.turn) return;

    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragPiece({ piece, pos: { r, c }, x: clientX, y: clientY });
    setSelected({ r, c });
    setLegalMoves(generateMoves(state.board, { r, c }, state));
  }, [disabled, state]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragPiece) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragPiece(prev => prev ? { ...prev, x: clientX, y: clientY } : null);
  }, [dragPiece]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragPiece) return;
    e.preventDefault();
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

    const target = getSquareFromEvent(clientX, clientY);
    if (target) {
      const move = legalMoves.find(m => m.to.r === target.r && m.to.c === target.c);
      if (move) {
        if (move.promotion) {
          setPromotionMove(move);
        } else {
          onMove(move);
        }
      }
    }

    setDragPiece(null);
    setSelected(null);
    setLegalMoves([]);
  }, [dragPiece, legalMoves, getSquareFromEvent, onMove]);

  useEffect(() => {
    if (dragPiece) {
      const moveHandler = (e: MouseEvent | TouchEvent) => handleDragMove(e);
      const endHandler = (e: MouseEvent | TouchEvent) => handleDragEnd(e);
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
      return () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', endHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', endHandler);
      };
    }
  }, [dragPiece, handleDragMove, handleDragEnd]);

  const handlePromotion = (type: 'q' | 'r' | 'b' | 'n') => {
    if (!promotionMove) return;
    const move: Move = { ...promotionMove, promotion: type };
    onMove(move);
    setPromotionMove(null);
  };

  // Render
  const rows = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const displayRows = flipped ? [...rows].reverse() : rows;
  const displayCols = flipped ? [...cols].reverse() : cols;

  return (
    <div className="relative w-full max-w-[min(90vw,560px)] mx-auto">
      {/* Board */}
      <div
        ref={boardRef}
        className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl shadow-purple/20 border border-border/50"
        role="grid"
        aria-label="Chess board"
      >
        {/* Ambient glow */}
        <div className="absolute -inset-4 bg-purple/10 blur-[40px] rounded-full -z-10" aria-hidden="true" />

        {displayRows.map((r) => (
          <div key={r} className="flex" role="row">
            {displayCols.map((c) => {
              const piece = state.board[r][c];
              const isLight = (r + c) % 2 === 0;
              const isSelected = selected?.r === r && selected?.c === c;
              const isLegalTarget = legalMoves.some(m => m.to.r === r && m.to.c === c);
              const isCapture = legalMoves.some(m => m.to.r === r && m.to.c === c && m.capture);
              const isLastMoveFrom = lastMove?.from.r === r && lastMove?.from.c === c;
              const isLastMoveTo = lastMove?.to.r === r && lastMove?.to.c === c;
              const isKingInCheck = highlightKing && state.inCheck && piece?.type === 'k' && piece?.color === state.turn;
              const isDragging = dragPiece?.pos.r === r && dragPiece?.pos.c === c;

              const squareLabel = `${String.fromCharCode(97 + c)}${8 - r}${piece ? ` ${piece.color} ${piece.type}` : ''}`;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`relative w-[12.5%] aspect-square flex items-center justify-center select-none transition-colors duration-100
                    ${isLight ? 'bg-[oklch(0.78_0.02_80)]' : 'bg-[oklch(0.35_0.08_265)]'}
                    ${isSelected ? '!bg-[oklch(0.65_0.12_85/0.6)]' : ''}
                    ${isLastMoveFrom || isLastMoveTo ? '!bg-[oklch(0.55_0.10_85/0.3)]' : ''}
                    ${isKingInCheck ? '!bg-[oklch(0.50_0.20_25/0.6)]' : ''}
                  `}
                  role="gridcell"
                  aria-label={squareLabel}
                  tabIndex={piece && piece.color === state.turn && !disabled ? 0 : -1}
                  onClick={() => handleSquareClick(r, c)}
                  onMouseDown={(e) => handleDragStart(e, r, c)}
                  onTouchStart={(e) => handleDragStart(e, r, c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSquareClick(r, c);
                    }
                  }}
                >
                  {/* Legal move indicator */}
                  {isLegalTarget && !isCapture && (
                    <div className="absolute w-[30%] h-[30%] rounded-full bg-[oklch(0.55_0.15_295/0.5)]" aria-hidden="true" />
                  )}
                  {isLegalTarget && isCapture && (
                    <div className="absolute inset-[8%] rounded-full border-[3px] border-[oklch(0.55_0.15_295/0.7)]" aria-hidden="true" />
                  )}

                  {/* Piece */}
                  {piece && !isDragging && (
                    <span
                      className="text-[min(8vw,3.2rem)] leading-none select-none pointer-events-none drop-shadow-md"
                      aria-hidden="true"
                    >
                      {getPieceSymbol(piece)}
                    </span>
                  )}

                  {/* Coordinate labels */}
                  {c === (flipped ? 7 : 0) && (
                    <span className={`absolute top-0.5 left-1 text-[0.6rem] font-medium pointer-events-none ${isLight ? 'text-[oklch(0.35_0.08_265)]' : 'text-[oklch(0.78_0.02_80)]'}`} aria-hidden="true">
                      {8 - r}
                    </span>
                  )}
                  {r === (flipped ? 0 : 7) && (
                    <span className={`absolute bottom-0.5 right-1 text-[0.6rem] font-medium pointer-events-none ${isLight ? 'text-[oklch(0.35_0.08_265)]' : 'text-[oklch(0.78_0.02_80)]'}`} aria-hidden="true">
                      {String.fromCharCode(97 + c)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dragging piece overlay */}
      {dragPiece && (
        <div
          className="fixed pointer-events-none z-50 text-[4rem] leading-none -translate-x-1/2 -translate-y-1/2 drop-shadow-lg"
          style={{ left: dragPiece.x, top: dragPiece.y }}
          aria-hidden="true"
        >
          {getPieceSymbol(dragPiece.piece)}
        </div>
      )}

      {/* Promotion dialog */}
      {promotionMove && (
        <div className="absolute inset-0 flex items-center justify-center bg-navy-dark/80 backdrop-blur-sm rounded-lg z-40">
          <div className="glass-card rounded-xl p-6 text-center" role="dialog" aria-label="Choose promotion piece">
            <p className="text-silver font-medium mb-4">Promote pawn to:</p>
            <div className="flex gap-3 justify-center">
              {(['q', 'r', 'b', 'n'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePromotion(type)}
                  className="w-14 h-14 rounded-lg bg-navy-light border border-border hover:border-gold/50 hover:bg-gold/10 flex items-center justify-center text-3xl transition-all btn-press"
                  aria-label={`Promote to ${type === 'q' ? 'queen' : type === 'r' ? 'rook' : type === 'b' ? 'bishop' : 'knight'}`}
                >
                  {getPieceSymbol({ type, color: state.turn })}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
