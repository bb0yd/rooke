# Next Dev Handoff

Updated: 2026-03-07

## What Was Finished

The guided learning system is now more user-specific and less sequential.

Completed in this repo:

1. Personalized planning
   - The learn flow now ranks lessons per user instead of following a mostly fixed order.
   - It uses:
     - live skill profile
     - recent game-analysis mistakes
     - pacing from recent training sessions
     - retention pressure from due reviews
     - transfer-check pressure after recent study

2. Richer training evidence
   - `training_sessions` now stores:
     - `attempts`
     - `successes`
     - `first_try_successes`
     - `hints_used`
     - `elapsed_ms`
     - `metadata`

3. Move-level coaching evidence
   - Game analysis stores per-move evidence in `game_analysis_moves`.
   - The planner can react to recurring themes like forks, pins, hanging pieces, and weakest phase.

4. Personalized repair drills
   - Tactics can now pull from exact missed positions in the user’s own games.

5. Opening retention
   - Opening review due-ness is now part of planning.
   - Opening sessions log into `training_sessions`.
   - Learn can deep-link into opening review mode.

6. Tactics and endgame review infrastructure
   - Added `training_item_reviews` for scheduled review outside openings.
   - Tactics and endgames now write review progress.
   - Due tactic/endgame reviews can be prescribed by the planner.

7. Transfer-check signal
   - If a user studied recently but has not yet played an analyzed game afterward, the planner can push a transfer-check coaching game.

## Local DB Status

Applied to local dev database:

- host: `localhost`
- port: `5432`
- db: `rooke_dev`
- user: `rooke`

Confirmed:

- `training_sessions` has the richer evidence columns
- `training_item_reviews` exists

## Verification

Passed locally:

- `npm test`
- `npx tsc --noEmit`

Current test count:

- 90 tests passing

## Most Important Next Step

Build a coach-debug / lesson-outcomes page.

Reason:

The learning engine is now using more signals, but there is still no good way to inspect:

- why a lesson was chosen
- what the system thinks is due
- what recently improved
- what failed to transfer into games

Without that visibility, the next improvements will be slower and harder to trust.

## Recommended Scope For Tomorrow

Create one new internal/debug page that answers:

1. What is the user’s current learner state?
   - skill profile
   - focus areas
   - pacing by module
   - retention signals
   - review signals
   - transfer signals

2. Why did the planner choose today’s lesson queue?
   - ranked exercises
   - priority score
   - `whyNow`
   - `paceHint`
   - source evidence

3. What is due for review?
   - openings from `trainer_stats`
   - tactics/endgames from `training_item_reviews`

4. What did not transfer?
   - show recent training blocks that still do not have a post-training analyzed game

## Suggested Implementation

Start with:

1. Add a new debug route
   - example: `/api/learn/debug`

2. Return:
   - profile
   - focus areas
   - pace
   - retention
   - review
   - transfer
   - ranked plan
   - recent severe `game_analysis_moves`
   - due `training_item_reviews`

3. Build one simple internal page
   - example: `/learn/debug`

4. Make sure the page is read-only
   - do not mix debug visualization with write actions

## Key Files To Read First

- `src/lib/trainingPlan.ts`
- `src/lib/learnerState.ts`
- `src/lib/learnerFocus.ts`
- `src/lib/trainingPace.ts`
- `src/lib/trainingReview.ts`
- `src/app/api/training-plan/route.ts`
- `src/app/api/training-review/route.ts`
- `src/components/TacticalTrainer.tsx`
- `src/components/EndgameTrainer.tsx`
- `src/components/OpeningTrainer.tsx`
- `src/lib/gameAnalyzer.ts`
- `init.sql`

## Notes

- The system is now much closer to `diagnose -> prescribe -> drill -> review -> verify transfer`.
- The main weakness now is observability, not lack of signals.
- If tomorrow’s dev improves visibility first, later planner changes will be much safer.
