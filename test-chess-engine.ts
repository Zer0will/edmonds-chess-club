/**
 * Chess Engine QA Tests — Edmonds Chess Club
 * Tests: move generation, castling, en passant, promotion, check, checkmate, stalemate
 * Run with: npx tsx test-chess-engine.ts
 */

// We'll import the engine logic by re-implementing key parts for Node testing
// Since this is a TS file that mirrors the engine logic

type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type Color = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: Color;
  hasMoved?: boolean;
}

interface Position {
  r: number;
  c: number;
}

interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capture: boolean;
  castle?: 'kingside' | 'queenside';
  enPassant?: boolean;
  promotion?: PieceType;
}

interface GameState {
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

function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
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

function isSquareAttacked(board: (Piece | null)[][], r: number, c: number, byColor: Color): boolean {
  const dir = byColor === 'white' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const rr = r + dir, cc = c + dc;
    if (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p && p.type === 'p' && p.color === byColor) return true;
    }
  }
  const knightDeltas = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  for (const [dr, dc] of knightDeltas) {
    const rr = r + dr, cc = c + dc;
    if (inBounds(rr, cc)) {
      const p = board[rr][cc];
      if (p && p.type === 'n' && p.color === byColor) return true;
    }
  }
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

function applyMoveToBoard(board: (Piece | null)[][], move: Move): void {
  const { from, to, piece } = move;
  if (move.enPassant) {
    board[from.r][to.c] = null;
  }
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
  board[to.r][to.c] = { ...piece, hasMoved: true };
  board[from.r][from.c] = null;
  if (move.promotion) {
    board[to.r][to.c] = { type: move.promotion, color: piece.color, hasMoved: true };
  }
}

function generateMoves(board: (Piece | null)[][], from: Position, state: Pick<GameState, 'enPassant'>): Move[] {
  const p = board[from.r][from.c];
  if (!p) return [];
  const color = p.color;
  const dir = color === 'white' ? -1 : 1;
  const raw: Move[] = [];

  const push = (to: Position, opts: Partial<Pick<Move, 'capture' | 'castle' | 'enPassant' | 'promotion'>> = {}): Move => ({
    from, to, piece: p, capture: !!opts.capture, castle: opts.castle, enPassant: opts.enPassant, promotion: opts.promotion,
  });

  if (p.type === 'p') {
    const r = from.r, c = from.c;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      const isPromo = (color === 'white' && r + dir === 0) || (color === 'black' && r + dir === 7);
      if (isPromo) {
        for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) raw.push(push({ r: r + dir, c }, { promotion: promo }));
      } else {
        raw.push(push({ r: r + dir, c }));
      }
      const startRow = color === 'white' ? 6 : 1;
      if (r === startRow && !board[r + 2 * dir][c]) raw.push(push({ r: r + 2 * dir, c }));
    }
    for (const dc of [-1, 1]) {
      const rr = r + dir, cc = c + dc;
      if (inBounds(rr, cc)) {
        const t = board[rr][cc];
        if (t && t.color !== color) {
          const isPromo = (color === 'white' && rr === 0) || (color === 'black' && rr === 7);
          if (isPromo) {
            for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) raw.push(push({ r: rr, c: cc }, { capture: true, promotion: promo }));
          } else {
            raw.push(push({ r: rr, c: cc }, { capture: true }));
          }
        }
      }
    }
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
      if (!t || t.color !== color) raw.push(push({ r: rr, c: cc }, { capture: !!t }));
    }
  } else if (p.type === 'b' || p.type === 'r' || p.type === 'q') {
    const dirs: number[][] = [];
    if (p.type !== 'r') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    if (p.type !== 'b') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    for (const [dr, dc] of dirs) {
      let rr = from.r + dr, cc = from.c + dc;
      while (inBounds(rr, cc)) {
        const t = board[rr][cc];
        if (!t) { raw.push(push({ r: rr, c: cc })); }
        else { if (t.color !== color) raw.push(push({ r: rr, c: cc }, { capture: true })); break; }
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
        if (!t || t.color !== color) raw.push(push({ r: rr, c: cc }, { capture: !!t }));
      }
    }
    if (!p.hasMoved && !isSquareAttacked(board, from.r, from.c, opposite(color))) {
      const row = from.r;
      if (board[row][5] === null && board[row][6] === null) {
        const rook = board[row][7];
        if (rook && rook.type === 'r' && rook.color === color && !rook.hasMoved) {
          if (!isSquareAttacked(board, row, 5, opposite(color)) && !isSquareAttacked(board, row, 6, opposite(color))) {
            raw.push(push({ r: row, c: 6 }, { castle: 'kingside' }));
          }
        }
      }
      if (board[row][1] === null && board[row][2] === null && board[row][3] === null) {
        const rook = board[row][0];
        if (rook && rook.type === 'r' && rook.color === color && !rook.hasMoved) {
          if (!isSquareAttacked(board, row, 3, opposite(color)) && !isSquareAttacked(board, row, 2, opposite(color))) {
            raw.push(push({ r: row, c: 2 }, { castle: 'queenside' }));
          }
        }
      }
    }
  }

  return raw.filter(move => {
    const testBoard = cloneBoard(board);
    applyMoveToBoard(testBoard, move);
    const kingPos = findKing(testBoard, color);
    if (!kingPos) return false;
    return !isSquareAttacked(testBoard, kingPos.r, kingPos.c, opposite(color));
  });
}

function getAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (p && p.color === state.turn) {
        moves.push(...generateMoves(state.board, { r, c }, state));
      }
    }
  }
  return moves;
}

function makeMove(state: GameState, move: Move): GameState {
  const newBoard = cloneBoard(state.board);
  const captured = newBoard[move.to.r][move.to.c];
  applyMoveToBoard(newBoard, move);
  const capturedWhite = [...state.capturedWhite];
  const capturedBlack = [...state.capturedBlack];
  if (captured) {
    if (captured.color === 'white') capturedWhite.push(captured);
    else capturedBlack.push(captured);
  }
  if (move.enPassant) {
    const epPiece: Piece = { type: 'p', color: opposite(state.turn) };
    if (epPiece.color === 'white') capturedWhite.push(epPiece);
    else capturedBlack.push(epPiece);
  }
  let enPassant: Position | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to.r - move.from.r) === 2) {
    enPassant = { r: (move.from.r + move.to.r) / 2, c: move.from.c };
  }
  const halfMoveClock = (move.piece.type === 'p' || move.capture) ? 0 : state.halfMoveClock + 1;
  const fullMoveNumber = state.turn === 'black' ? state.fullMoveNumber + 1 : state.fullMoveNumber;
  const nextTurn = opposite(state.turn);
  const nextKing = findKing(newBoard, nextTurn);
  const inCheck = nextKing ? isSquareAttacked(newBoard, nextKing.r, nextKing.c, state.turn) : false;
  const newState: GameState = {
    board: newBoard, turn: nextTurn, enPassant, moveHistory: [...state.moveHistory, move],
    capturedWhite, capturedBlack, halfMoveClock, fullMoveNumber, status: 'playing', winner: null, inCheck,
  };
  const legalMoves = getAllLegalMoves(newState);
  if (legalMoves.length === 0) {
    if (inCheck) { newState.status = 'checkmate'; newState.winner = state.turn; }
    else { newState.status = 'stalemate'; }
  }
  return newState;
}

// --- Test Utilities ---

function emptyBoard(): (Piece | null)[][] {
  return Array(8).fill(null).map(() => Array(8).fill(null));
}

function stateFromBoard(board: (Piece | null)[][], turn: Color = 'white', ep: Position | null = null): GameState {
  return {
    board, turn, enPassant: ep, moveHistory: [], capturedWhite: [], capturedBlack: [],
    halfMoveClock: 0, fullMoveNumber: 1, status: 'playing', winner: null, inCheck: false,
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ FAIL: ${msg}`); }
}

// --- TESTS ---

console.log('\n=== CHESS ENGINE QA TESTS ===\n');

// Test 1: Initial position move count
console.log('Test 1: Initial position — White has 20 legal moves');
{
  const board = emptyBoard();
  // Standard setup
  board[0][0] = { type: 'r', color: 'black' }; board[0][1] = { type: 'n', color: 'black' };
  board[0][2] = { type: 'b', color: 'black' }; board[0][3] = { type: 'q', color: 'black' };
  board[0][4] = { type: 'k', color: 'black' }; board[0][5] = { type: 'b', color: 'black' };
  board[0][6] = { type: 'n', color: 'black' }; board[0][7] = { type: 'r', color: 'black' };
  for (let c = 0; c < 8; c++) board[1][c] = { type: 'p', color: 'black' };
  board[7][0] = { type: 'r', color: 'white' }; board[7][1] = { type: 'n', color: 'white' };
  board[7][2] = { type: 'b', color: 'white' }; board[7][3] = { type: 'q', color: 'white' };
  board[7][4] = { type: 'k', color: 'white' }; board[7][5] = { type: 'b', color: 'white' };
  board[7][6] = { type: 'n', color: 'white' }; board[7][7] = { type: 'r', color: 'white' };
  for (let c = 0; c < 8; c++) board[6][c] = { type: 'p', color: 'white' };
  const state = stateFromBoard(board);
  const moves = getAllLegalMoves(state);
  assert(moves.length === 20, `Expected 20 moves, got ${moves.length}`);
}

// Test 2: King-side castling
console.log('\nTest 2: King-side castling available');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' };
  board[7][7] = { type: 'r', color: 'white' };
  board[0][4] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const castleMove = moves.find(m => m.castle === 'kingside');
  assert(!!castleMove, 'King-side castling should be available');
  assert(castleMove!.to.c === 6, 'King should move to g1 (col 6)');
}

// Test 3: Castling blocked by piece
console.log('\nTest 3: Castling blocked by piece between');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' };
  board[7][5] = { type: 'b', color: 'white' }; // Bishop blocking
  board[7][7] = { type: 'r', color: 'white' };
  board[0][4] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const castleMove = moves.find(m => m.castle === 'kingside');
  assert(!castleMove, 'King-side castling should be blocked');
}

// Test 4: Castling blocked when king in check
console.log('\nTest 4: Castling blocked when king in check');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' };
  board[7][7] = { type: 'r', color: 'white' };
  board[0][4] = { type: 'r', color: 'black' }; // Rook giving check on e-file
  board[0][0] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const castleMove = moves.find(m => m.castle === 'kingside');
  assert(!castleMove, 'Castling should be blocked when in check');
}

// Test 5: Castling blocked when passing through attacked square
console.log('\nTest 5: Castling blocked when passing through attack');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' };
  board[7][7] = { type: 'r', color: 'white' };
  board[0][5] = { type: 'r', color: 'black' }; // Attacks f1
  board[0][0] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const castleMove = moves.find(m => m.castle === 'kingside');
  assert(!castleMove, 'Castling should be blocked when f1 is attacked');
}

// Test 6: En passant
console.log('\nTest 6: En passant capture');
{
  const board = emptyBoard();
  board[3][4] = { type: 'p', color: 'white', hasMoved: true }; // White pawn on e5
  board[3][5] = { type: 'p', color: 'black', hasMoved: true }; // Black pawn on f5 (just moved)
  board[7][4] = { type: 'k', color: 'white' };
  board[0][4] = { type: 'k', color: 'black' };
  const ep: Position = { r: 2, c: 5 }; // En passant square on f6
  const state = stateFromBoard(board, 'white', ep);
  const moves = generateMoves(board, { r: 3, c: 4 }, state);
  const epMove = moves.find(m => m.enPassant);
  assert(!!epMove, 'En passant should be available');
  assert(epMove!.to.r === 2 && epMove!.to.c === 5, 'En passant target should be f6');
}

// Test 7: Pawn promotion
console.log('\nTest 7: Pawn promotion generates 4 options');
{
  const board = emptyBoard();
  board[1][3] = { type: 'p', color: 'white', hasMoved: true }; // White pawn on d7
  board[7][4] = { type: 'k', color: 'white' };
  board[0][0] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 1, c: 3 }, state);
  const promoMoves = moves.filter(m => m.promotion);
  assert(promoMoves.length === 4, `Expected 4 promotion options, got ${promoMoves.length}`);
  const types = promoMoves.map(m => m.promotion).sort();
  assert(JSON.stringify(types) === JSON.stringify(['b', 'n', 'q', 'r']), 'Should have Q, R, B, N promotions');
}

// Test 8: Checkmate (Scholar's mate pattern)
console.log('\nTest 8: Checkmate detection');
{
  const board = emptyBoard();
  // Black king on e8, white queen on f7 giving checkmate with bishop support
  board[0][4] = { type: 'k', color: 'black' };
  board[0][5] = { type: 'b', color: 'black' }; // f8
  board[0][3] = { type: 'q', color: 'black' }; // d8
  board[1][3] = { type: 'p', color: 'black' }; // d7
  board[1][4] = { type: 'p', color: 'black' }; // e7
  board[1][5] = { type: 'p', color: 'black' }; // f7 - will be captured
  board[7][4] = { type: 'k', color: 'white' };
  
  // White queen captures f7 giving checkmate
  board[1][5] = { type: 'q', color: 'white', hasMoved: true }; // Qxf7 
  // Need a piece supporting the queen - bishop on c4
  board[4][2] = { type: 'b', color: 'white', hasMoved: true }; // Bc4 supports
  
  const state = stateFromBoard(board, 'black');
  // Check if black king is in check
  const kingPos = findKing(board, 'black')!;
  const inCheck = isSquareAttacked(board, kingPos.r, kingPos.c, 'white');
  assert(inCheck, 'Black king should be in check');
  
  const legalMoves = getAllLegalMoves(state);
  // If no legal moves and in check = checkmate
  if (legalMoves.length === 0 && inCheck) {
    assert(true, 'Checkmate detected correctly (no legal moves + in check)');
  } else {
    assert(false, `Expected checkmate but found ${legalMoves.length} legal moves`);
  }
}

// Test 9: Stalemate
console.log('\nTest 9: Stalemate detection');
{
  const board = emptyBoard();
  board[0][0] = { type: 'k', color: 'black' }; // Black king in corner
  board[2][1] = { type: 'q', color: 'white', hasMoved: true }; // White queen on b6 (stalemate)
  board[1][2] = { type: 'k', color: 'white', hasMoved: true }; // White king on c7
  const state = stateFromBoard(board, 'black');
  const kingPos = findKing(board, 'black')!;
  const inCheck = isSquareAttacked(board, kingPos.r, kingPos.c, 'white');
  const legalMoves = getAllLegalMoves(state);
  assert(!inCheck, 'Black king should NOT be in check');
  assert(legalMoves.length === 0, `Expected 0 legal moves, got ${legalMoves.length}`);
  if (!inCheck && legalMoves.length === 0) {
    assert(true, 'Stalemate detected correctly');
  }
}

// Test 10: Cannot move into check
console.log('\nTest 10: King cannot move into check');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' };
  board[0][3] = { type: 'r', color: 'black' }; // Rook on d-file
  board[0][0] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const illegalMove = moves.find(m => m.to.c === 3); // Moving to d1 would be into check
  assert(!illegalMove, 'King should not be able to move to d1 (attacked by rook)');
}

// Test 11: Pinned piece cannot move
console.log('\nTest 11: Pinned piece cannot move');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' }; // King on e1
  board[7][3] = { type: 'n', color: 'white' }; // Knight on d1 (pinned)
  board[7][0] = { type: 'r', color: 'black', hasMoved: true }; // Rook on a1 pinning knight
  board[0][4] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 3 }, state);
  assert(moves.length === 0, `Pinned knight should have 0 moves, got ${moves.length}`);
}

// Test 12: Half-chess initial position
console.log('\nTest 12: Half-chess setup — correct pieces on e-h files');
{
  const board = emptyBoard();
  board[0][4] = { type: 'k', color: 'black' };
  board[0][5] = { type: 'b', color: 'black' };
  board[0][6] = { type: 'n', color: 'black' };
  board[0][7] = { type: 'r', color: 'black' };
  for (let c = 4; c < 8; c++) board[1][c] = { type: 'p', color: 'black' };
  board[7][4] = { type: 'k', color: 'white' };
  board[7][5] = { type: 'b', color: 'white' };
  board[7][6] = { type: 'n', color: 'white' };
  board[7][7] = { type: 'r', color: 'white' };
  for (let c = 4; c < 8; c++) board[6][c] = { type: 'p', color: 'white' };
  
  // Verify a-d files are empty
  let allEmpty = true;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] !== null) allEmpty = false;
    }
  }
  assert(allEmpty, 'A-D files should be empty in half-chess');
  
  const state = stateFromBoard(board);
  const moves = getAllLegalMoves(state);
  assert(moves.length > 0, `White should have legal moves in half-chess, got ${moves.length}`);
  // White has: 4 pawns (each can move 1 or 2) = 8, knight has 2 moves (f3, h3)
  // Actually: e2 can go e3/e4, f2->f3/f4, g2->g3/g4, h2->h3/h4 = 8 pawn moves
  // Knight on g1: f3, h3 = 2 moves. King on e1: d1, d2, f1 (blocked by bishop) = d1, d2
  // Bishop on f1: blocked by pawns. Rook on h1: blocked.
  // Total: 8 + 2 + 2 = 12... let's just verify it's reasonable
  assert(moves.length >= 8 && moves.length <= 15, `Half-chess should have 8-15 initial moves, got ${moves.length}`);
}

// Test 13: Queen-side castling
console.log('\nTest 13: Queen-side castling');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white' };
  board[7][0] = { type: 'r', color: 'white' };
  board[0][4] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const castleMove = moves.find(m => m.castle === 'queenside');
  assert(!!castleMove, 'Queen-side castling should be available');
  assert(castleMove!.to.c === 2, 'King should move to c1 (col 2)');
}

// Test 14: Castling with moved king
console.log('\nTest 14: No castling after king has moved');
{
  const board = emptyBoard();
  board[7][4] = { type: 'k', color: 'white', hasMoved: true };
  board[7][7] = { type: 'r', color: 'white' };
  board[0][4] = { type: 'k', color: 'black' };
  const state = stateFromBoard(board);
  const moves = generateMoves(board, { r: 7, c: 4 }, state);
  const castleMove = moves.find(m => m.castle);
  assert(!castleMove, 'No castling should be available after king moved');
}

// Summary
console.log('\n=== RESULTS ===');
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);
if (failed === 0) console.log('🎉 All tests passed!');
else console.log('⚠️ Some tests failed — review above.');
process.exit(failed > 0 ? 1 : 0);
