/**
 * Chess Engine — Edmonds Chess Club
 * Complete chess logic: move generation, validation, check/checkmate/stalemate detection
 * Supports standard chess and half-chess variant
 * 
 * Verified rules:
 * - Castling: king and rook unmoved, no pieces between, king not in/through/into check
 * - En passant: captured pawn must have just moved two squares
 * - Promotion: pawn reaching last rank promotes (queen default, user can choose)
 * - Check: king is attacked by opponent piece
 * - Checkmate: king in check with no legal moves
 * - Stalemate: not in check but no legal moves
 */

export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type Color = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: Color;
  hasMoved?: boolean;
}

export interface Position {
  r: number;
  c: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capture: boolean;
  castle?: 'kingside' | 'queenside';
  enPassant?: boolean;
  promotion?: PieceType;
}

export interface GameState {
  board: (Piece | null)[][];
  turn: Color;
  enPassant: Position | null;
  moveHistory: Move[];
  capturedWhite: Piece[];
  capturedBlack: Piece[];
  halfMoveClock: number;
  fullMoveNumber: number;
  status: 'playing' | 'checkmate' | 'stalemate' | 'draw';
  winner: Color | null;
  inCheck: boolean;
}

export type Variant = 'standard' | 'half-chess';

// Piece values for AI evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Position tables for piece-square evaluation
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const KING_TABLE_MIDGAME = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

// --- Core utility functions ---

export function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row => row.map(p => (p ? { ...p } : null)));
}

function findKing(board: (Piece | null)[][], color: Color): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return { r, c };
    }
  }
  return null;
}

// --- Attack detection ---

export function isSquareAttacked(board: (Piece | null)[][], r: number, c: number, byColor: Color): boolean {
  // Pawn attacks
  const dir = byColor === 'white' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const rr = r + dir, cc = c + dc;
    if (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p && p.type === 'p' && p.color === byColor) return true;
    }
  }

  // Knight attacks
  const knightDeltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  for (const [dr, dc] of knightDeltas) {
    const rr = r + dr, cc = c + dc;
    if (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p && p.type === 'n' && p.color === byColor) return true;
    }
  }

  // Bishop/Queen (diagonals)
  const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of diagDirs) {
    let rr = r + dr, cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      rr += dr; cc += dc;
    }
  }

  // Rook/Queen (lines)
  const lineDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of lineDirs) {
    let rr = r + dr, cc = c + dc;
    while (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      rr += dr; cc += dc;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (inBounds(rr, cc)) {
        const p = board[rr][cc];
        if (p && p.type === 'k' && p.color === byColor) return true;
      }
    }
  }

  return false;
}

// --- Move generation ---

export function generateMoves(board: (Piece | null)[][], from: Position, state: Pick<GameState, 'enPassant'>): Move[] {
  const p = board[from.r][from.c];
  if (!p) return [];

  const color = p.color;
  const dir = color === 'white' ? -1 : 1;
  const raw: Move[] = [];

  const push = (to: Position, opts: Partial<Pick<Move, 'capture' | 'castle' | 'enPassant' | 'promotion'>> = {}): Move => ({
    from,
    to,
    piece: p,
    capture: !!opts.capture,
    castle: opts.castle,
    enPassant: opts.enPassant,
    promotion: opts.promotion,
  });

  if (p.type === 'p') {
    const r = from.r, c = from.c;
    // Forward one
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      const isPromo = (color === 'white' && r + dir === 0) || (color === 'black' && r + dir === 7);
      if (isPromo) {
        // Generate all promotion options
        for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) {
          raw.push(push({ r: r + dir, c }, { promotion: promo }));
        }
      } else {
        raw.push(push({ r: r + dir, c }));
      }
      // Forward two from starting row
      const startRow = color === 'white' ? 6 : 1;
      if (r === startRow && !board[r + 2 * dir][c]) {
        raw.push(push({ r: r + 2 * dir, c }));
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      const rr = r + dir, cc = c + dc;
      if (inBounds(rr, cc)) {
        const t = board[rr][cc];
        if (t && t.color !== color) {
          const isPromo = (color === 'white' && rr === 0) || (color === 'black' && rr === 7);
          if (isPromo) {
            for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) {
              raw.push(push({ r: rr, c: cc }, { capture: true, promotion: promo }));
            }
          } else {
            raw.push(push({ r: rr, c: cc }, { capture: true }));
          }
        }
      }
    }
    // En passant
    const ep = state.enPassant;
    if (ep && ep.r === r + dir && Math.abs(ep.c - c) === 1) {
      raw.push(push({ r: ep.r, c: ep.c }, { capture: true, enPassant: true }));
    }
  } else if (p.type === 'n') {
    const deltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
    for (const [dr, dc] of deltas) {
      const rr = from.r + dr, cc = from.c + dc;
      if (!inBounds(rr, cc)) continue;
      const t = board[rr][cc];
      if (!t || t.color !== color) {
        raw.push(push({ r: rr, c: cc }, { capture: !!t }));
      }
    }
  } else if (p.type === 'b' || p.type === 'r' || p.type === 'q') {
    const dirs: number[][] = [];
    if (p.type !== 'r') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    if (p.type !== 'b') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    for (const [dr, dc] of dirs) {
      let rr = from.r + dr, cc = from.c + dc;
      while (inBounds(rr, cc)) {
        const t = board[rr][cc];
        if (!t) {
          raw.push(push({ r: rr, c: cc }));
        } else {
          if (t.color !== color) raw.push(push({ r: rr, c: cc }, { capture: true }));
          break;
        }
        rr += dr; cc += dc;
      }
    }
  } else if (p.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = from.r + dr, cc = from.c + dc;
        if (!inBounds(rr, cc)) continue;
        const t = board[rr][cc];
        if (!t || t.color !== color) {
          raw.push(push({ r: rr, c: cc }, { capture: !!t }));
        }
      }
    }
    // Castling
    if (!p.hasMoved && !isSquareAttacked(board, from.r, from.c, opposite(color))) {
      const row = from.r;
      // King-side (king at e, rook at h)
      if (board[row][5] === null && board[row][6] === null) {
        const rook = board[row][7];
        if (rook && rook.type === 'r' && rook.color === color && !rook.hasMoved) {
          if (!isSquareAttacked(board, row, 5, opposite(color)) &&
              !isSquareAttacked(board, row, 6, opposite(color))) {
            raw.push(push({ r: row, c: 6 }, { castle: 'kingside' }));
          }
        }
      }
      // Queen-side (king at e, rook at a)
      if (board[row][1] === null && board[row][2] === null && board[row][3] === null) {
        const rook = board[row][0];
        if (rook && rook.type === 'r' && rook.color === color && !rook.hasMoved) {
          if (!isSquareAttacked(board, row, 3, opposite(color)) &&
              !isSquareAttacked(board, row, 2, opposite(color))) {
            raw.push(push({ r: row, c: 2 }, { castle: 'queenside' }));
          }
        }
      }
    }
  }

  // Filter: only legal moves (don't leave own king in check)
  return raw.filter(move => {
    const testBoard = cloneBoard(board);
    applyMoveToBoard(testBoard, move);
    const kingPos = findKing(testBoard, color);
    if (!kingPos) return false;
    return !isSquareAttacked(testBoard, kingPos.r, kingPos.c, opposite(color));
  });
}

// --- Apply move to board (mutates) ---

function applyMoveToBoard(board: (Piece | null)[][], move: Move): void {
  const { from, to, piece } = move;

  // En passant capture
  if (move.enPassant) {
    const capturedRow = from.r; // The pawn being captured is on the same row as the moving pawn
    board[capturedRow][to.c] = null;
  }

  // Castling - move rook
  if (move.castle) {
    const row = from.r;
    if (move.castle === 'kingside') {
      board[row][5] = board[row][7];
      board[row][7] = null;
      if (board[row][5]) board[row][5]!.hasMoved = true;
    } else {
      board[row][3] = board[row][0];
      board[row][0] = null;
      if (board[row][3]) board[row][3]!.hasMoved = true;
    }
  }

  // Move piece
  board[to.r][to.c] = { ...piece, hasMoved: true };
  board[from.r][from.c] = null;

  // Promotion
  if (move.promotion) {
    board[to.r][to.c] = { type: move.promotion, color: piece.color, hasMoved: true };
  }
}

// --- Game state management ---

export function createInitialState(variant: Variant = 'standard'): GameState {
  const board = createBoard(variant);
  const state: GameState = {
    board,
    turn: 'white',
    enPassant: null,
    moveHistory: [],
    capturedWhite: [],
    capturedBlack: [],
    halfMoveClock: 0,
    fullMoveNumber: 1,
    status: 'playing',
    winner: null,
    inCheck: false,
  };
  return state;
}

function createBoard(variant: Variant): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

  if (variant === 'standard') {
    // Black pieces (row 0)
    board[0][0] = { type: 'r', color: 'black' };
    board[0][1] = { type: 'n', color: 'black' };
    board[0][2] = { type: 'b', color: 'black' };
    board[0][3] = { type: 'q', color: 'black' };
    board[0][4] = { type: 'k', color: 'black' };
    board[0][5] = { type: 'b', color: 'black' };
    board[0][6] = { type: 'n', color: 'black' };
    board[0][7] = { type: 'r', color: 'black' };
    for (let c = 0; c < 8; c++) board[1][c] = { type: 'p', color: 'black' };

    // White pieces (row 7)
    board[7][0] = { type: 'r', color: 'white' };
    board[7][1] = { type: 'n', color: 'white' };
    board[7][2] = { type: 'b', color: 'white' };
    board[7][3] = { type: 'q', color: 'white' };
    board[7][4] = { type: 'k', color: 'white' };
    board[7][5] = { type: 'b', color: 'white' };
    board[7][6] = { type: 'n', color: 'white' };
    board[7][7] = { type: 'r', color: 'white' };
    for (let c = 0; c < 8; c++) board[6][c] = { type: 'p', color: 'white' };
  } else if (variant === 'half-chess') {
    // Half-chess: only king-side pieces (e-h files = columns 4-7)
    // Black pieces (row 0, columns 4-7)
    board[0][4] = { type: 'k', color: 'black' };
    board[0][5] = { type: 'b', color: 'black' };
    board[0][6] = { type: 'n', color: 'black' };
    board[0][7] = { type: 'r', color: 'black' };
    for (let c = 4; c < 8; c++) board[1][c] = { type: 'p', color: 'black' };

    // White pieces (row 7, columns 4-7)
    board[7][4] = { type: 'k', color: 'white' };
    board[7][5] = { type: 'b', color: 'white' };
    board[7][6] = { type: 'n', color: 'white' };
    board[7][7] = { type: 'r', color: 'white' };
    for (let c = 4; c < 8; c++) board[6][c] = { type: 'p', color: 'white' };
  }

  return board;
}

export function getAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === state.turn) {
        const pieceMoves = generateMoves(state.board, { r, c }, state);
        moves.push(...pieceMoves);
      }
    }
  }
  return moves;
}

export function makeMove(state: GameState, move: Move): GameState {
  const newBoard = cloneBoard(state.board);
  const captured = newBoard[move.to.r][move.to.c];

  applyMoveToBoard(newBoard, move);

  // Update captured pieces
  const capturedWhite = [...state.capturedWhite];
  const capturedBlack = [...state.capturedBlack];
  if (captured) {
    if (captured.color === 'white') capturedWhite.push(captured);
    else capturedBlack.push(captured);
  }
  // En passant capture
  if (move.enPassant) {
    const epPiece: Piece = { type: 'p', color: opposite(state.turn) };
    if (epPiece.color === 'white') capturedWhite.push(epPiece);
    else capturedBlack.push(epPiece);
  }

  // Determine en passant square for next state
  let enPassant: Position | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to.r - move.from.r) === 2) {
    enPassant = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
  }

  // Half-move clock
  const halfMoveClock = (move.piece.type === 'p' || move.capture) ? 0 : state.halfMoveClock + 1;
  const fullMoveNumber = state.turn === 'black' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

  const nextTurn = opposite(state.turn);

  // Check if next player is in check
  const nextKing = findKing(newBoard, nextTurn);
  const inCheck = nextKing ? isSquareAttacked(newBoard, nextKing.r, nextKing.c, state.turn) : false;

  // Build new state to check for checkmate/stalemate
  const newState: GameState = {
    board: newBoard,
    turn: nextTurn,
    enPassant,
    moveHistory: [...state.moveHistory, move],
    capturedWhite,
    capturedBlack,
    halfMoveClock,
    fullMoveNumber,
    status: 'playing',
    winner: null,
    inCheck,
  };

  // Check for checkmate or stalemate
  const legalMoves = getAllLegalMoves(newState);
  if (legalMoves.length === 0) {
    if (inCheck) {
      newState.status = 'checkmate';
      newState.winner = state.turn;
    } else {
      newState.status = 'stalemate';
    }
  } else if (halfMoveClock >= 100) {
    // 50-move rule
    newState.status = 'draw';
  }

  return newState;
}

// --- AI (Minimax with alpha-beta pruning) ---

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const DEPTH_MAP: Record<Difficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function evaluateBoard(board: (Piece | null)[][], color: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const value = PIECE_VALUES[p.type];
      let posBonus = 0;

      // Position bonuses
      const row = p.color === 'white' ? r : 7 - r;
      if (p.type === 'p') posBonus = PAWN_TABLE[row][c];
      else if (p.type === 'n') posBonus = KNIGHT_TABLE[row][c];
      else if (p.type === 'b') posBonus = BISHOP_TABLE[row][c];
      else if (p.type === 'k') posBonus = KING_TABLE_MIDGAME[row][c];

      if (p.color === color) {
        score += value + posBonus;
      } else {
        score -= value + posBonus;
      }
    }
  }
  return score;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiColor: Color
): number {
  if (depth === 0 || state.status !== 'playing') {
    if (state.status === 'checkmate') {
      return state.winner === aiColor ? 100000 + depth : -100000 - depth;
    }
    if (state.status === 'stalemate' || state.status === 'draw') return 0;
    return evaluateBoard(state.board, aiColor);
  }

  const moves = getAllLegalMoves(state);

  // Move ordering: captures first, then checks
  moves.sort((a, b) => {
    const aScore = (a.capture ? 10 : 0) + (a.promotion ? 5 : 0);
    const bScore = (b.capture ? 10 : 0) + (b.promotion ? 5 : 0);
    return bScore - aScore;
  });

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = makeMove(state, move);
      const eval_ = minimax(newState, depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = makeMove(state, move);
      const eval_ = minimax(newState, depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(state: GameState, difficulty: Difficulty): Move | null {
  const depth = DEPTH_MAP[difficulty];
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  // Beginner: add randomness
  if (difficulty === 'beginner') {
    // 40% chance of random move
    if (Math.random() < 0.4) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  let bestMove: Move | null = null;
  let bestEval = -Infinity;

  for (const move of moves) {
    const newState = makeMove(state, move);
    const eval_ = minimax(newState, depth - 1, -Infinity, Infinity, false, state.turn);
    
    // Add slight randomness for intermediate
    const noise = difficulty === 'intermediate' ? (Math.random() - 0.5) * 20 : 0;
    
    if (eval_ + noise > bestEval) {
      bestEval = eval_ + noise;
      bestMove = move;
    }
  }

  return bestMove;
}

// --- Utility functions ---

export function posToAlgebraic(pos: Position): string {
  return String.fromCharCode(97 + pos.c) + (8 - pos.r);
}

export function moveToNotation(move: Move): string {
  if (move.castle === 'kingside') return 'O-O';
  if (move.castle === 'queenside') return 'O-O-O';

  const pieceChar = move.piece.type === 'p' ? '' : move.piece.type.toUpperCase();
  const capture = move.capture ? 'x' : '';
  const from = move.piece.type === 'p' && move.capture ? String.fromCharCode(97 + move.from.c) : '';
  const to = posToAlgebraic(move.to);
  const promo = move.promotion ? '=' + move.promotion.toUpperCase() : '';

  return `${pieceChar}${from}${capture}${to}${promo}`;
}

export function getPieceSymbol(piece: Piece): string {
  const symbols: Record<string, Record<PieceType, string>> = {
    white: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    black: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  return symbols[piece.color][piece.type];
}
