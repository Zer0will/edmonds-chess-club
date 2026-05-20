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

## Phase 4: Scroll-Driven 3D Chess Experience (COMPLETE)
- [x] Audit current site stack and choose 3D approach — Option A (Three.js) + Option C (CSS lite fallback) + reduced-motion none tier
- [x] Use procedural geometry instead of glTF — LatheGeometry for rotational pieces, ExtrudeGeometry for knight silhouette (zero asset loading, instant first paint)
- [x] Install and lazy-load Three.js (dynamic import after first paint via requestIdleCallback)
- [x] Build capability detection (reduced-motion / no-WebGL / CPU < 4 cores / 2g-3g / saveData / device memory < 4GB / small touch viewport)
- [x] Build prefers-reduced-motion fallback (none tier renders nothing)
- [x] Build Scene3D component with MeshStandardMaterial (PBR), 3-point lighting (key gold, fill purple, rim purple-magenta), ambient purple haze
- [x] Implement scroll-driven parallax — 10 pieces across 4 depth layers (foreground 1.0-1.2, mid 0.5-0.7, back 0.3-0.4)
- [x] Implement scroll-driven rotation — knights Y-rotate, bishops tilt, kings/queens slow spin
- [x] Implement section entry choreography — staggered fly-in by scrollAnchor offset, smooth lerp into position
- [x] Implement ambient idle motion — phase-offset sine wave float per piece
- [x] Implement cursor parallax with smooth lerp (desktop only — skipped on coarse pointer)
- [x] Implement IntersectionObserver-based render pause when canvas off-screen
- [x] Implement visibilitychange pause when tab hidden
- [x] Implement 3D capture tumble on Play page (720° rotation + gravity fall + fade-out)
- [x] Add runtime FPS monitoring: if sustained <30fps, gracefully degrade to lite CSS tier
- [x] Cleanup on unmount: cancel RAF, dispose all geometries/materials/renderer
- [x] Visual QA in real browser — dramatic foreground bishop & queen, depth-layered pieces, logo and copy fully readable
- [x] In-game Play page QA — pieces atmospherically frame the board without interfering
- [x] TypeScript clean, multiplayer regression test passing
- [x] Self-review checklist completed (all four roles)
- [x] Save final checkpoint
