# Rooke — Feature Roadmap & Improvement Ideas

Rooke is a full-featured web-based chess platform built with **Next.js 16**, **React 19**, **PostgreSQL**, and the **Stockfish WASM** engine. It covers single-player AI games, puzzle training, opening study, multiplayer, and game analysis.

This document catalogues known gaps, partially-built features, and longer-term improvements so that future contributors can pick up where things left off.

---

## Table of Contents

1. [Critical / Blocking Issues](#1-critical--blocking-issues)
2. [Multiplayer Improvements](#2-multiplayer-improvements)
3. [Game Analysis & History](#3-game-analysis--history)
4. [Opening Trainer & Explorer](#4-opening-trainer--explorer)
5. [Puzzle System](#5-puzzle-system)
6. [User Profiles & Social Features](#6-user-profiles--social-features)
7. [Rating & Statistics](#7-rating--statistics)
8. [UI & UX Improvements](#8-ui--ux-improvements)
9. [Performance & Infrastructure](#9-performance--infrastructure)
10. [Testing & Quality](#10-testing--quality)

---

## 1. Critical / Blocking Issues

These items prevent core functionality from working correctly and should be fixed first.

### 1.1 Server-side Time Control Enforcement

**Files:** `src/app/api/multiplayer/[id]/route.ts`, `src/app/multiplayer/[id]/page.tsx`

The database schema stores `white_time_remaining_ms`, `black_time_remaining_ms`, and `last_move_timestamp` columns, but the server-side move handler does not subtract elapsed time when a move is submitted. This means:

- A player can take unlimited time regardless of the time control chosen.
- Clocks show `0` on the client until the first game fetch initialises them from the `time_control` string.
- There is no server-enforced timeout or auto-resignation when a player runs out of time.

**What to implement:**
1. On every `POST /api/multiplayer/[id]` (move submission), calculate the elapsed time since `last_move_timestamp` and subtract it from the active player's remaining time.
2. If the remaining time drops to 0 or below, end the game immediately and record the result as a timeout loss.
3. Include `white_time_remaining_ms` and `black_time_remaining_ms` in the GET response so the client can initialise clocks from the server.
4. Apply the increment (from the `time_control` string, e.g. `"3+2"`) after each move.

### 1.2 Opening Explorer "Add to Repertoire" Button

**File:** `src/app/explore/page.tsx`

The "+ Repertoire" button is rendered in the UI but has no `onClick` handler — clicking it does nothing.

**What to implement:**
- Wire the button to `POST /api/openings` (or a new `/api/user-repertoire` endpoint) to save the current board position and move history as a new opening line in the user's repertoire.
- The button should be disabled for unauthenticated users with a tooltip saying "Log in to save".

---

## 2. Multiplayer Improvements

### 2.1 Real-time Move Sync via WebSockets (or Server-Sent Events)

**Files:** `src/app/multiplayer/[id]/page.tsx`

The game board currently polls `/api/multiplayer/[id]` every **1 second**. This causes:
- Visible move lag for the opponent.
- Unnecessary API calls when the game is idle.

**What to implement:**
- Replace the polling loop with a WebSocket connection or Server-Sent Events (SSE) stream.
- Next.js Route Handlers support SSE via `ReadableStream`. See the [Next.js docs on streaming responses](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming).
- The server should push a `gameUpdate` event whenever a move is made, a draw is offered/accepted/declined, or the game ends.
- Keep the existing polling as a fallback when the WebSocket/SSE connection drops (the `connectionStatus` state is already wired for this).

### 2.2 Quick Play Matchmaking

**Files:** `src/app/api/multiplayer/quick-play/route.ts`, `init.sql` (`quick_play_pool` table)

The `quick_play_pool` table and API route skeleton exist but there is no UI entry point for quick play and no matching logic.

**What to implement:**
1. Add a "Quick Play" button to the multiplayer lobby page (`/multiplayer/page.tsx`).
2. `POST /api/multiplayer/quick-play` should add the user to the pool with their preferred time control.
3. A background task (or a check on each POST) should look for a compatible opponent in the pool (same time control, opposite color preference) and create a `multiplayer_games` row, then redirect both players to the new game.
4. Add a "Searching…" spinner / cancel button while the user waits.

### 2.3 Spectator Mode

**File:** `src/app/multiplayer/spectate/page.tsx`

The spectate page and its CSS module exist, but the implementation is incomplete — the board is not rendered and game state is not fetched.

**What to implement:**
- List all `in_progress` multiplayer games via `GET /api/multiplayer/active`.
- Let any user click into a game and view it with the existing `ChessBoard` in `readOnly` mode.
- Auto-refresh the spectated game the same way the player view does.

### 2.4 Post-game Review from Multiplayer

After a multiplayer game ends, there is no way to review the moves with annotations or engine analysis. The `/history` page only shows games from the `games` table (AI games), not `multiplayer_games`.

**What to implement:**
- Add a "Review Game" button on the game-over screen in `/multiplayer/[id]`.
- Either extend the history page to accept a multiplayer game ID, or add a `/multiplayer/[id]/review` route that reuses the `GameReview` component from the history page.

---

## 3. Game Analysis & History

### 3.1 Engine Analysis for Multiplayer Games

**File:** `src/app/history/page.tsx`

The history page runs engine analysis (Stockfish in a Web Worker) on single-player (`games` table) entries only. Multiplayer games from `multiplayer_games` are not shown here.

**What to implement:**
- Extend `GET /api/games` (or add `GET /api/games?include_multiplayer=true`) to return multiplayer games alongside single-player ones.
- Alternatively, add a separate tab/section in the history page for multiplayer games.

### 3.2 Best Move / Variation Explorer in Analysis

**Files:** `src/app/history/page.tsx`, `src/lib/analysis.ts`

The `AnalyzedMove` interface already stores `pv` (principal variation) and `bestMove`, but the history review UI does not display them.

**What to implement:**
- Below each move in the move list, show the best alternative move in a muted style (e.g. "Best: Nf6").
- Allow the user to click the best move to explore that variation on the board (without permanently branching the game tree).
- Show the top-3 engine candidate moves with their evaluation scores for the selected position.

### 3.3 Adjustable Engine Depth in Analysis

**File:** `src/app/history/page.tsx`

Analysis depth is hardcoded. Deeper analysis gives more accurate classifications but takes longer.

**What to implement:**
- Add a "Depth" slider (e.g. 10–24) next to the "Analyse Game" button.
- Show an estimated time warning when depth > 18 on a long game.

### 3.4 Export Annotated PGN

The history page allows downloading a plain PGN, but user annotations (glyphs and comments) are stored in React state and are **not** included in the exported file.

**What to implement:**
- Serialize annotation state into PGN comment format (`{ comment }`) and NAG symbols (e.g. `$1` for `!`, `$2` for `?`) when building the export string.
- Optionally persist annotations to the database so they survive a page refresh.

### 3.5 Brilliant Move Classification

**File:** `src/lib/analysis.ts`

The `MoveClassification` type supports `'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'`, but the analysis display uses only five categories. Chess.com-style **Brilliant** (`!!`) moves — ones that sacrifice material for a long-term advantage — are not detected.

**What to implement:**
- Add `'brilliant'` to the `MoveClassification` union.
- Classify a move as brilliant when: (a) it is the engine's top choice, (b) the piece moved is not immediately recaptured (no recapture in the PV at depth ≤ 2), and (c) the evaluation improves by ≥ 50 cp relative to the second-best move.

---

## 4. Opening Trainer & Explorer

### 4.1 Spaced Repetition Review Queue UI

**Files:** `src/app/learn/page.tsx`, `src/lib/spacedRepetition.ts`

The SM-2 spaced repetition algorithm is fully implemented and data is stored in `trainer_stats`, but the **learn page does not surface a "Review due today" queue** to the user.

**What to implement:**
- Add a "Due for review" badge / counter on the Learn page and dashboard.
- Add a "Review Now" mode that iterates over all `opening_line` rows where `next_review <= Date.now()` and presents them in sequence.
- After each line is practised, update the ease factor and next review timestamp via the existing `POST /api/trainer-stats` endpoint.

### 4.2 Opening Explorer Move Statistics

**File:** `src/app/explore/page.tsx`

The explorer shows move frequency from the built-in opening database but does not show real win/draw/loss percentages because these are not stored in the `opening_lines` data.

**What to implement (two options):**
- **Option A (local):** Aggregate the user's own game history by position to calculate personal W/D/L stats per move.
- **Option B (external):** Integrate the free [Lichess opening API](https://lichess.org/api#tag/Opening-Explorer) (`https://explorer.lichess.ovh/lichess`) to fetch master-game statistics for any position. This requires no API key and covers millions of games.

### 4.3 Custom Opening Line Reordering

**File:** `src/app/learn/[id]/page.tsx`

Lines within a custom opening can be created but not reordered. Users often want to arrange lines from most important to least important.

**What to implement:**
- Add drag-and-drop reordering for lines in the custom opening editor (e.g. using the HTML5 drag-and-drop API or a library like `@dnd-kit/core`).
- Persist the order in a new `sort_order` integer column on `opening_lines`.

---

## 5. Puzzle System

### 5.1 Expand Puzzle Database

**File:** `src/data/puzzles.ts`

The puzzle set is hardcoded in a TypeScript file with around 100 entries. This limits variety and makes it impossible to add puzzles without a code deployment.

**What to implement:**
- Move puzzles to the PostgreSQL database (new `puzzles` table with columns: `id`, `fen`, `moves` (JSONB), `rating`, `themes` (text[]), `source`).
- Seed the database from [Lichess's open puzzle database](https://database.lichess.org/#puzzles) (CSV format, 3 M+ puzzles, creative commons license).
- Update `GET /api/puzzles` to query the database with filters for rating range and themes.
- Keep the existing `puzzle_stats` table unchanged — it already uses a string `puzzle_id`.

### 5.2 Puzzle Themes / Filtering

**File:** `src/app/puzzles/page.tsx`

Puzzles can be filtered by difficulty (Easy/Medium/Hard) but not by tactical theme (fork, pin, skewer, back rank, etc.).

**What to implement:**
- Add a `themes` column (text array) to the puzzles table (or the hardcoded data).
- Add a theme filter chip row above the puzzle board.
- Persist the user's last-used theme filter in `localStorage`.

### 5.3 Puzzle Rush / Timed Mode

A timed mode where the user solves as many puzzles as possible in a fixed time (e.g. 3 minutes) would add a competitive, replayable training mode.

**What to implement:**
- Add a "Puzzle Rush" button on the puzzles page.
- Show a countdown timer; on expiry, display a summary of puzzles solved and a high score comparison.
- Store the high score in `localStorage` or, if authenticated, in a new `puzzle_rush_scores` table.

---

## 6. User Profiles & Social Features

### 6.1 Public Profile Pages

**Files:** `src/app/api/users/[id]/route.ts`, database `users` table

The `users` table has `display_name`, `bio`, and `avatar_url` columns. No public profile page exists.

**What to implement:**
- Add a `/profile/[username]` page (or `/users/[id]`) that shows:
  - Display name, bio, member since date.
  - Rating badges (bullet, blitz, rapid, classical, puzzles).
  - Recent games (last 10, with results and opponents).
  - Win/draw/loss pie chart.
  - "Challenge" and "Add Friend" buttons for logged-in visitors.

### 6.2 Avatar Upload

**File:** `src/app/settings/page.tsx`

The `avatar_url` column exists in the database but the settings page has no file-upload control.

**What to implement:**
- Add an avatar upload section to the settings page.
- Store images in a public folder or an object-storage bucket (e.g. AWS S3, Cloudflare R2, or simply `/public/avatars/`).
- Update the `avatar_url` via `PUT /api/users` and display it in the sidebar and on profile pages.

### 6.3 Real-time Notifications (Push or Badge)

**File:** `src/app/api/notifications/route.ts`, `src/components/Sidebar.tsx`

Challenge and friend-request counts appear on the dashboard only after a manual page load. There is no persistent notification bell.

**What to implement:**
- Add a notification bell icon to the `Sidebar` component with an unread-count badge.
- Poll `GET /api/notifications` every 30 seconds (or use SSE) to keep the badge count up to date.
- Optionally request **Web Push** permission and send push notifications when the user receives a challenge or it becomes their turn. (Requires a service worker, which is already registered at `public/sw.js`.)

### 6.4 In-game Chat for Spectators

**File:** `src/components/GameChat.tsx`, `src/app/multiplayer/[id]/page.tsx`

The `GameChat` component and `game_chat` table exist, but the chat panel is only shown to game participants, not spectators.

**What to implement:**
- Show the chat panel (read-only by default) to spectators on the spectate page.
- Optionally allow spectators to post in a separate "spectator chat" channel.

---

## 7. Rating & Statistics

### 7.1 Separate Puzzle Rating

**File:** `src/app/api/puzzle-stats/rating/route.ts`

The puzzle rating system is partially built (the route exists), but there is no ELO/Glicko update logic for puzzles — the route likely returns a static or empty value.

**What to implement:**
- After each puzzle attempt, call the rating update endpoint with the solve result (correct/incorrect).
- Use the existing Glicko-2 implementation in `src/lib/rating.ts` with a `rating_type` of `'puzzle'`.
- Display the puzzle rating on the puzzles page and in the stats dashboard.

### 7.2 Rating History Chart — More Granularity

**File:** `src/components/RatingChart.tsx`, `src/app/api/ratings/history/route.ts`

The rating chart works, but history is only recorded when a game is completed. For users who play infrequently this produces sparse data.

**What to implement:**
- Record a daily snapshot of each active rating in `rating_history` via a cron job or lazily on the first game of each day.
- Add a time-range selector to the chart (last 7 days / 30 days / 1 year / all time).

### 7.3 Opening Statistics on Profile

**File:** `src/app/api/stats/openings/route.ts`

Opening stats (win % per opening) are calculated server-side but only shown on the personal stats page. They are not visible on public profiles.

**What to implement:**
- Expose opening stats via `GET /api/users/[id]/stats` and render them on the public profile page (see §6.1).

---

## 8. UI & UX Improvements

### 8.1 Mobile Layout Polish

The app renders on mobile (PWA manifest is present), but several pages were built desktop-first:

- The history page side-panel and move list overflow on narrow screens.
- The stats page heatmap and chart do not resize responsively.
- The multiplayer game panel overlaps the board on small viewports.

**What to implement:**
- Add responsive CSS breakpoints (or CSS Grid `auto-fit`) to the history, stats, and multiplayer game pages.
- Consider a bottom-sheet panel pattern (slide-up) for move lists and chat on mobile.

### 8.2 Keyboard Navigation on the Board

**File:** `src/components/ChessBoard.tsx`

The board is fully mouse/touch driven. Keyboard navigation (arrow keys to cycle moves, `f` to flip, `Enter` to confirm promotion) would make the app more accessible and faster to use.

**What to implement:**
- Add `tabIndex`, `onKeyDown` handlers to the `ChessBoard` wrapper div.
- Arrow-left / Arrow-right: step back / forward through history when reviewing.
- `f`: flip board.
- `Escape`: deselect the active square.

### 8.3 Promotion Piece Selector

**File:** `src/components/ChessBoard.tsx`

Pawn promotion currently auto-promotes to a queen. A visual picker (showing queen/rook/bishop/knight) should appear when a pawn reaches the back rank.

**What to implement:**
- Detect when the user drags or clicks a pawn to the 8th (or 1st) rank.
- Render a small overlay with the four promotion choices using the existing `getPieceSvg` helper.
- Resolve the `handleMove` promise with the chosen piece symbol.

### 8.4 Board Orientation Persistence

**File:** `src/lib/settings.ts`

The user's board flip preference is lost on page reload; it is only stored in component state.

**What to implement:**
- Add a `boardFlipped` key to the `Settings` interface in `src/lib/settings.ts`.
- Save/restore it alongside `boardTheme`, `pieceSet`, etc.

### 8.5 Dark / Light Theme Toggle

The app uses a dark-first global CSS. Some users prefer a light theme.

**What to implement:**
- Add a `theme: 'dark' | 'light' | 'system'` option to settings.
- Use CSS custom properties (`--bg-primary`, `--text-primary`, etc.) throughout `globals.css` and the module files.
- Apply the correct set of variables via a `data-theme` attribute on `<html>`.

### 8.6 Loading Skeletons

Most data-fetching pages show a blank screen or a spinner while loading. Skeleton placeholders would improve the perceived performance.

**What to implement:**
- Add a reusable `<Skeleton />` component (an animated grey rectangle) and use it wherever `loading === true` in page components.

---

## 9. Performance & Infrastructure

### 9.1 Stockfish Web Worker Pooling

**File:** `src/lib/engine.ts`

A new Stockfish `Worker` is created for every engine call. Workers are expensive to spin up; spawning several during game analysis (one per move) causes UI jank.

**What to implement:**
- Maintain a singleton Web Worker that is reused across calls.
- Queue analysis requests so only one `go` command is active at a time.
- Provide a `terminate()` function that disposes of the worker when the user navigates away (use `useEffect` cleanup).

### 9.2 Database Connection Pooling Configuration

**File:** `src/lib/db.ts`

The PostgreSQL `Pool` is created with default settings. Under load (many concurrent users), the pool may exhaust connections.

**What to implement:**
- Set explicit `max`, `idleTimeoutMillis`, and `connectionTimeoutMillis` values based on the expected load and the PostgreSQL `max_connections` setting.
- Add a `pool.on('error', ...)` handler to log unexpected client errors.

### 9.3 API Route Input Validation

Several API routes cast request body fields directly to their types without validation (e.g. `from`, `to`, and `promotion` in the move handler).

**What to implement:**
- Add lightweight validation (e.g. check that `from` and `to` match `/^[a-h][1-8]$/`) before passing values to `chess.js`.
- Return `400 Bad Request` with a descriptive message for invalid input.
- Consider adding [Zod](https://zod.dev/) for schema validation across all routes.

### 9.4 Rate Limiting

There are no rate limits on auth endpoints (`/api/auth/login`, `/api/auth/register`), making them vulnerable to brute-force attacks.

**What to implement:**
- Add a simple in-memory rate limiter (e.g. sliding-window counter per IP) in the Next.js middleware (`src/middleware.ts`).
- Allow at most 10 login attempts per minute per IP; return `429 Too Many Requests` on breach.
- For production, use a Redis-backed counter so limits survive server restarts.

### 9.5 Docker Compose Health Checks & Restart Policy

**File:** `docker-compose.yml`

The `web` service depends on `db`, but there is no health check to confirm PostgreSQL is ready before the application starts.

**What to implement:**
- Add a `healthcheck` to the `db` service (`pg_isready -U postgres`).
- Add `depends_on: db: condition: service_healthy` to the `web` service.
- Add `restart: unless-stopped` to both services.

---

## 10. Testing & Quality

### 10.1 Unit Tests

There are no automated tests in the repository. The following areas are most critical:

| Area | Suggested Framework | What to Test |
|---|---|---|
| `src/lib/rating.ts` | Jest / Vitest | Glicko-2 calculations, edge cases (RD decay, first game) |
| `src/lib/spacedRepetition.ts` | Jest / Vitest | SM-2 interval/ease factor updates |
| `src/lib/analysis.ts` | Jest / Vitest | `classifyMove`, `calculateAccuracy`, `parseInfoLine`, `uciToSan` |
| `src/lib/timeControl.ts` | Jest / Vitest | Time string parsing, increment application |
| API routes | Jest + `node-mocks-http` | Request validation, auth guards, DB interactions (mock `pg`) |

### 10.2 End-to-End Tests

**Suggested framework:** Playwright

Priority flows to cover:
1. Register → Log in → Play a game vs AI → Verify game saved in history.
2. Challenge a friend → Accept challenge → Play a move → Resign.
3. Solve a puzzle → Verify streak and rating update.

### 10.3 TypeScript Strict Mode

**File:** `tsconfig.json`

`"strict": true` is set, but several files use `any` casts (e.g. `from: from as any` in `analysis.ts`). These should be replaced with proper types from `chess.js`.

### 10.4 ESLint `react-hooks/exhaustive-deps` Violations

Several `useCallback` and `useEffect` hooks carry `// eslint-disable-line react-hooks/exhaustive-deps` comments to silence missing-dependency warnings. These should be fixed properly to prevent stale-closure bugs.

---

## Priority Summary

| # | Item | Priority | Effort |
|---|---|---|---|
| 1.1 | Server-side time control enforcement | 🔴 High | Medium |
| 1.2 | Opening Explorer "Add to Repertoire" | 🔴 High | Low |
| 2.1 | WebSocket / SSE real-time sync | 🔴 High | High |
| 2.2 | Quick Play matchmaking | 🟡 Medium | Medium |
| 2.3 | Spectator mode board | 🟡 Medium | Low |
| 2.4 | Multiplayer post-game review | 🟡 Medium | Medium |
| 3.2 | Best move / variation display in analysis | 🟡 Medium | Medium |
| 3.4 | Export annotated PGN | 🟡 Medium | Low |
| 4.1 | Spaced repetition review queue UI | 🟡 Medium | Low |
| 5.1 | Expand puzzle database (Lichess CSV) | 🟡 Medium | Medium |
| 6.1 | Public profile pages | 🟡 Medium | Medium |
| 6.3 | Notification bell in sidebar | 🟡 Medium | Low |
| 8.3 | Promotion piece selector | 🟡 Medium | Low |
| 9.4 | Rate limiting on auth endpoints | 🔴 High | Low |
| 10.1 | Unit tests | 🟡 Medium | High |
| 5.3 | Puzzle Rush / timed mode | 🟢 Low | Medium |
| 6.2 | Avatar upload | 🟢 Low | Medium |
| 8.5 | Light/dark theme toggle | 🟢 Low | Medium |
| 9.1 | Stockfish worker pooling | 🟢 Low | Low |
| 10.2 | End-to-end tests (Playwright) | 🟢 Low | High |
