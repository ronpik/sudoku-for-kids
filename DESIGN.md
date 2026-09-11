# Little Sudoku

## Style and user experience

A calm, encouraging puzzle surface for children learning Sudoku and adults who want a quick game. Open directly into a 4×4 puzzle; offer 6×6 and 9×9 with equally prominent size controls. The board is the primary surface, with a separate large number pad. Indigo identifies choices and player entries; dark ink identifies fixed clues. Thick borders identify boxes. Soft gold distinguishes the teaching aid. Use short, reassuring copy, without scores, time pressure, penalties, accounts, or competitive distractions.

Mobile stacks the board, number entry, undo/erase, and hints. Desktop puts controls beside the board. Small-screen 9×9 cells are necessarily smaller than the number pad; the separate pad supplies generous input targets. System fonts remain available if optional web fonts do not load. Native modal dialogs contain keyboard focus. The grid supports arrow keys and roving focus, digit entry, Delete/Backspace, and undo. Hints supplement red with exclamation marks, accessible invalid states, and a written explanation.

## Behavior

- Sizes: 4×4 uses 2×2 boxes; 6×6 uses 2-row × 3-column boxes; 9×9 uses 3×3 boxes.
- Select a cell, then tap or type a number. Fixed clues can be inspected but cannot change. No automatic cell advance; the player retains control.
- Friendly hints start enabled and can be toggled at any time. Highlight every participant in direct duplicate groups in rows, columns, or boxes, including clues. Never compare an entry with a hidden answer to mark an error. Legal but incorrect guesses remain unmarked.
- Undo and erase update progress and conflicts immediately. Progress means formerly empty squares filled, regardless of correctness.
- Completion requires every square filled with no rule violation, even when hints are off. Celebrate once per completion, with an option to keep viewing the finished puzzle.
- Confirm puzzle replacement when unsolved player entries would be lost. Cancel preserves the game state. Page reload starts a new game; progress is not saved.

## Architecture

The app is a static site with no framework, package dependencies, database, API, accounts, cookies, analytics, or browser storage. Authored HTML, CSS, and ES modules live in `src/`. Run `npm run build` to copy them into a clean `dist/` directory, then serve `dist/` from any static host. No transpilation or bundling is needed.

`src/sudoku.js` is a pure domain module: board configuration, constraint units, duplicate detection, completion, randomized generation, and solution counting. Flat arrays store integers, with zero representing empty cells. Generation permutes a valid solution, then removes clues only when a bounded MRV/bitmask search proves uniqueness. Exhausted searches restore the attempted removal. Clue counts are generation targets, not a claim of formal human difficulty.

`src/puzzle-worker.js` performs generation away from the main thread. `src/app.js` owns in-memory state and UI actions: size, clues, current values, selection, hints, undo history, and completion. It never needs the generated answer for validation. Worker failure falls back to a short bounded generation pass. Changing size replaces the complete puzzle configuration atomically.

The optional WebMCP adapter exposes reading and entering numbers through the same actions as the UI, validates input, and is inert in unsupported browsers. No separate data store exists.

`scripts/build.mjs` recreates the generated output using Node filesystem APIs. `scripts/serve.mjs` is a dependency-free local server: `npm run dev` serves source files, while `npm start` rebuilds and serves production output. Node's built-in test runner verifies rules, uniqueness with a separate reference solver, exhaustion safety, and domain rejection. Browser checks cover mobile/desktop interaction, help and replacement dialogs, completion, and exact conflict highlighting.
