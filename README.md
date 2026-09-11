# Little Sudoku

A mobile-first Sudoku game for curious minds of all ages. Includes 4×4, 6×6, and 9×9 puzzles, optional direct-conflict hints, undo/erase, a short rule guide, keyboard play, and a completion celebration.

## Run locally

Requires Node.js 22 or newer. No dependencies to install.

```sh
npm run dev
```

Open http://127.0.0.1:5173. This serves `src/` directly: edit the source and refresh your browser to see changes. Set `PORT` to change the port.

```sh
npm test
npm run check
```

## Build and preview

```sh
npm run build
```

This recreates `dist/` from `src/`, removing stale output first. Edit files in `src/`; changes made directly to `dist/` are overwritten by the next build. The build uses Node.js only, with no dependencies to install.

```sh
npm start
```

This builds the app and serves `dist/` locally at http://127.0.0.1:5173.

## Hosting

Run `npm run build`, then serve `dist/` using any static web host. For hosts with build settings, use `npm run build` as the build command and `dist` as the output directory. The generated `dist/` directory is ignored by Git.

There is no backend or database. Game state is memory-only and resets on refresh. Google Fonts are optional; system fonts are the fallback.

See [DESIGN.md](DESIGN.md) for the style, interaction contracts, and architecture.
