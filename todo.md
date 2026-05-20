# Edmonds Chess Club — Project TODO

## Phase 1: Static Site (Complete)
- [x] Logo-derived design system with CSS variables
- [x] Cinzel + Inter font pairing
- [x] Home page with hero, features, events, CTAs
- [x] About page with mission, history, meeting info
- [x] Variants page with Standard and Half-Chess rules
- [x] Play page with lobby and game UI
- [x] Stats page with local stats tracking
- [x] Chess engine with full rule support
- [x] Standard chess and Half-Chess variants
- [x] AI with 4 difficulty levels (minimax + alpha-beta)
- [x] Drag-and-drop and click-to-move on chess board
- [x] Mobile responsive board (320px-4K)
- [x] Keyboard navigation and ARIA labels

## Phase 2: Multiplayer Upgrade
- [x] Install backend dependencies (express, ws, mysql2, jose, nanoid)
- [x] Database schema: users, games, moves with auto-init on startup
- [x] Session/JWT authentication using Manus OAuth
- [x] Backend API: auth/me, oauth/callback, games/create, games/open, games/mine, leaderboard
- [x] WebSocket server for real-time game rooms (mounted on Vite dev server)
- [x] Lobby UI: create game, browse open games, refresh
- [x] Multiplayer game UI: live opponent moves, game state sync, chat, invite link
- [x] Server-authoritative chess move validation (all rules + piece-color check)
- [x] Persistent leaderboard with Elo rating (K=32)
- [x] User profile page with stats and game history
- [x] Login/logout flow integrated into Layout (Sign In button + user avatar dropdown)
- [x] Multiplayer end-to-end test passing (room create, join, moves, illegal move rejection, persistence)
- [x] Resign and draw offer/accept flows
- [x] Spectator mode for late joiners
- [x] Auto-reconnect WebSocket on disconnect

## Phase 3: QA & Polish
- [x] Visual QA on multiplayer lobby — clean layout, OAuth URL works, all controls present
- [x] Visual QA on leaderboard page — empty state and styling correct
- [x] End-to-end Scholar's Mate test with two authenticated users — ratings update +16/-16
- [x] Guest multiplayer test — moves, illegal-move rejection, persistence
- [x] Security: WebSocket session verification — clients cannot forge userId
- [x] TypeScript and LSP report no errors
- [x] Mobile responsiveness verified — lobby uses `grid lg:grid-cols-2` (stacks on mobile), buttons in `grid-cols-2` keep touch targets >= 40px, padding scales `p-6 sm:p-8`. Board sizing was already verified in phase 1 QA.
- [x] TypeScript downlevelIteration errors fixed (`for-of` Set/Map replaced with `forEach`)
- [x] Final checkpoint saved
