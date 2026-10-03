# Development

## Prerequisites

- **Node.js 18 or newer.** Verified on 26.7.
- **npm** (ships with Node).
- A Chromium-family browser for the Playwright suite.

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

Serves on **http://localhost:5173**. Vite is configured with `open: true`, so it launches
your browser. Note that Playwright's `baseURL` is `http://localhost:5173` and **not**
`127.0.0.1` - Vite binds to `localhost` only, and switching to `127.0.0.1` breaks the
suite.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b && vite build` - typecheck then bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint |

## Workflow

1. Edit under `src/`.
2. `npm run dev` and look at http://localhost:5173.
3. `npm run build` before considering anything done - it typechecks.
4. If you touched layout or typography, verify across viewports **and both motion modes**.
   A change that looks right in Chrome at 1440x900 can be wrong in reduced motion or at
   375x812.

## Measuring, not eyeballing

The hero's approved composition is specified in numbers. `qa/*.mjs` are standalone
measurement harnesses that print exact values instead of asking you to judge a screenshot:

```bash
node qa/probe-capheight.mjs
node qa/probe-tracking.mjs
node qa/verify-v3.mjs
```

They expect the dev server to already be running. They are diagnostic tools, not tests -
only `qa/phase1/` is a real pass/fail suite.

When you change something visual, prefer measuring before and after over trusting your eye.
The type fitter in particular will look plausible while being wrong.

## Things that will bite you

**Do not retune `selectionGeometry.ts` casually.** The corridor boxes are frozen and were
accepted with a known residual difference. They are not a bug to be cleaned up.

**Do not add a second reduced-motion code path.** One fitter serves both modes. The
reduced-motion problem was fixed by suppressing transitions around measurement; a parallel
implementation will drift from the normal one.

**`public/` is shipped verbatim.** Anything dropped in `public/` lands in every build even
if nothing references it. A directory of unused PNGs once added ~12 MB to every bundle.
Reference material belongs outside `public/` - it now lives in `reference/`, which is
gitignored.

**Fonts are self-hosted.** League Gothic and Archivo Black come from `@fontsource`
packages. Do not add a Google Fonts `<link>`; it reintroduces a render-blocking third-party
request.

**Phaser is not in use.** If you see it referenced anywhere in older notes, it is stale.

## Not in the repository

These exist on a full working copy and are deliberately excluded:

| Path | Size | What it is |
|---|---|---|
| `left side/` | 232 webp frames | Source frame sequence, superseded |
| `right side/` | 223 webp frames | Source frame sequence, superseded |
| `reference/` | ~12 MB + video | QA reference material and analysis PNGs |
| `.kilo/` | ~38 MB | Nested editor-agent worktree (a full project copy) |

**Nothing in `src/` references any of them.** The live hero is entirely code-driven. The
frame sequences are historical: an earlier build used a canvas frame-sequence renderer, and
`src/components/Hero/index.ts` documents what was removed. If you need to regenerate the
delay tables, `scripts/extract-delays.ts` reads frame names from those directories.
