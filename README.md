# Little Sudoku

A mobile-first Sudoku game for curious minds of all ages. Includes 4×4, 6×6, and 9×9 puzzles, optional direct-conflict hints, undo/erase, a short rule guide, keyboard play, and a completion celebration.

## Run locally

Requires Node.js 22 or newer. No dependencies to install.

```sh
npm run dev
```

Open http://127.0.0.1:5173. Set `PORT` to change the port.

```sh
npm test
npm run check
```

## Hosting

Serve `dist/` using any static web host. There is no backend or database. Game state is memory-only and resets on refresh. Google Fonts are optional; system fonts are the fallback. `dist/` contains authored source and is intentionally tracked; no build step is required.

See [DESIGN.md](DESIGN.md) for the style, interaction contracts, and architecture.
