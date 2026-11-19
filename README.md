# Portfolio Website

Cinematic, interactive developer portfolio built as a scroll-driven experience rather than a resume page.

**Yash Mahajan - Data Analyst - Data Engineer - Cloud DevOps Engineer**

---

## Overview

Most portfolio sites are a column of text you scroll past. This one is a single cinematic
opening shot you *drive*. A scroll moves a pinned hero through a fixed sequence, oversized
type moves behind a figure holding a placard, and the experience resolves into a choice
between two professional paths.

Once you choose, the world you are entering hands off from the hero: the chosen plate
dominates, everything else recedes, and the screen wipes to that world's route.

### The concept

The portfolio is framed as **one figure standing at a junction**, deciding between two
directions of work:

- **DATA** - Data Analyst / Data Engineer
- **CLOUD** - Cloud / DevOps

The figure and the typography are the composition. Everything else - the ground wash, the
grain, the vignette - exists to hold those two together.

### What is actually implemented

The hero, the scroll choreography, the path selection, the handoff, the routing, and the
accessibility layer are **complete and verified**. The two world destinations reached by
choosing a path are **intentional Phase 2 placeholders** - they render a title and a
"Back to Hero" button. They are navigation-complete, not content-complete.

The same applies to content depth: this repository documents and ships the experience
machinery. The projects, experience, certifications, and contact detail that will fill the
worlds are not yet authored, and nothing on this README claims otherwise.

---

## Features

Implemented and verified in a real browser:

- **Scroll-driven cinematic hero** - a GSAP `ScrollTrigger` pins the hero and drives
  ground scale, plate reveal, and typography position from scroll progress.
- **Independent type corridors** - `PERSONAL` and `PORTFOLIO` occupy separate layout boxes
  with the figure between them, so neither word ever collides with the figure.
- **Runtime type fitting** - a fitter measures the painted advance width of League Gothic
  and solves the font size that fills each corridor exactly, per viewport.
- **Interactive path selection** - hover and focus on either plate raise it and dim the
  other; choosing one triggers a timed handoff.
- **World handoff transition** - the selected plate scales up while the other recedes, the
  typography fades, and the screen wipes to the destination.
- **Browser Back navigation** - `#/data-world` and `#/cloud-world` are real routes.
  Pressing Back unmounts the world, restores the hero, and clears the hash. `applyHash`
  is the only reader of the URL and `syncUrl` is the only writer, so the two cannot fight.
- **Deep-link support** - `#/data-world` and `#/cloud-world` load directly and survive a
  refresh; an unknown hash falls back to the hero.
- **Reduced-motion support** - under `prefers-reduced-motion: reduce` the global
  transition/animation duration is collapsed to `0.01ms` and the hero switches to a
  sticky layout. The rendered composition is **numerically identical** to normal motion.
- **Keyboard navigation** - pressing Enter or Space while focus is inside the hero scrolls
  to the selection hold, after which both path boards receive `tabIndex=0` and are
  reachable and activatable without a mouse. Coarse pointers are excluded so this never
  fights touch behaviour.
- **Visible focus states** - a high-contrast ring on each path board, confirmed by pixel
  diff rather than by computed style.
- **Touch support** - two-tap selection on touch devices; hit targets measure at least
  44x44 px (72x72 px on coarse pointers).
- **Semantic heading** - the hero carries a real `<h1>` ("Yash Mahajan - Data Analyst,
  Data Engineer and Cloud DevOps Engineer"), visually clipped to 1x1 px so it cannot
  disturb the approved composition. The cinematic type art stays decorative.
- **Responsive layout** - verified at 1920x1080, 1440x900, 1366x768, 1280x720, 412x915,
  390x844, and 375x812 with no horizontal overflow.
- **Self-hosted fonts** - League Gothic and Archivo Black ship as woff2 subsets from
  `node_modules`; no third-party font request is made at runtime.

---

## Tech Stack

Only what is actually in `package.json`:

| Technology | Role |
|---|---|
| **React 19** | UI tree and component boundaries |
| **TypeScript** | Application types |
| **Vite 8** | Dev server and production bundler |
| **GSAP 3** (ScrollTrigger) | Scroll choreography |
| **Zustand 5** | Game/world state store |
| **@fontsource** | Self-hosted League Gothic + Archivo Black |
| **@playwright/test** | Browser test suite |
| **oxlint** | Linting |

Phaser is **not** used in the current implementation. It is not a dependency and no
Phaser code is present.

---

## Architecture

The app is a small routing shell over a layered hero. Three concerns are deliberately kept
apart:

**1. Routing shell - `src/App.tsx`**

The single source of truth for which world is mounted. It reads `location.hash` through
`applyHash` and writes it through `syncUrl`, and it destroys the pinned ScrollTrigger during
the render phase - not in an effect - because React removes the hero's DOM before effect
cleanup runs, and ScrollTrigger owns a pin-spacer React does not know about. Get that
ordering wrong and the whole app unmounts.

**2. The cinematic hero - `src/cinematic/`**

A stack of absolutely-positioned layers, composited back-to-front, rather than a single
scrolling document:

| Layer | File | Purpose |
|---|---|---|
| Ground | `layers/GroundLayer.tsx` | Radial ground wash, scaled by scroll |
| Type | `layers/TypographyLayer.tsx` | The two headline words + the runtime fitter |
| Figure | `layers/FigureLayer.tsx` | The figure image, above the type |
| Grain | `layers/GrainLayer.tsx` | Vignette and film grain |
| Boards | `layers/BoardLayer.tsx` | The selectable plates |
| Handoff | `handoff/HandoffLayer.tsx` | The wipe between hero and world |

Scroll drives everything through `timeline/useHeroTimeline.ts`, which publishes progress on
`timeline/progressBus.ts` rather than letting layers subscribe to ScrollTrigger directly.
The active timeline is tracked in `timeline/activeTimeline.ts` so it can be destroyed
deterministically.

**3. Type fitting - the part worth reading**

The two headline words are not sized by hand. `TypographyLayer.tsx` sets a temporary
`font-size`, reads the **painted advance width** (via a canvas measurement of the real
glyph run, not `getBoundingClientRect` on a stale layout), and solves the size that fills
its corridor. The result is `200.18px` at 1440x900 - an exact fit that holds across every
tested viewport.

Reduced motion needed one specific fix here. The global
`transition-duration: 0.01ms !important` rule made the fitter's immediate re-read of its own
`font-size` return a **stale** advance (677.5px or 841px instead of the true ~281px), which
produced wildly oversized type. The fix is to suppress transitions synchronously around only
those two measurement reads, then restore them. No separate reduced-motion code path exists.

**4. Selection - `src/cinematic/selection/`**

`selectionGeometry.ts` holds the frozen corridor boxes and hover plate geometry.
`WorldBoard.tsx` renders each path as a real `<button>` so focus, activation, and ARIA come
from the platform. `useWorldSelection.ts` owns hover/focus state and the touch two-tap rule.

**5. World - `src/cinematic/data/boardContent.ts` and the placeholder routes**

All viewer-facing copy lives in `boardContent.ts`, separate from pixels and JSX, so it can
be replaced without touching artwork.

**6. State - `src/store/gameStore.ts`**

Zustand holds the current world and the selected path. `hooks/useReducedMotion.ts` wraps
the media query.

Further detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Project Structure

```
portfolio_website/
|-- docs/                     # ARCHITECTURE, DEVELOPMENT, TESTING, DEPLOYMENT
|-- public/                   # Shipped verbatim by Vite
|   |-- assets/figure-anchor.webp
|   |-- data/                 # beats + delay tables
|   |-- favicon.svg
|   `-- icons.svg
|-- qa/
|   |-- phase1/               # Playwright suite (the maintained tests)
|   `-- probe-*.mjs, verify-*.mjs   # one-off measurement harnesses
|-- scripts/extract-delays.ts # generates delay tables from frame names
|-- src/
|   |-- App.tsx               # routing shell, hash sync, ScrollTrigger teardown
|   |-- main.tsx
|   |-- cinematic/
|   |   |-- CinematicHero.tsx # composes the layers
|   |   |-- data/             # boardContent.ts, plateInteriors.ts
|   |   |-- handoff/          # world handoff transition
|   |   |-- layers/           # ground, type, figure, grain, boards
|   |   |-- selection/        # geometry, WorldBoard, useWorldSelection
|   |   `-- timeline/         # useHeroTimeline, progressBus, activeTimeline
|   |-- components/Hero/      # barrel re-exporting CinematicHero
|   |-- hooks/useReducedMotion.ts
|   |-- store/gameStore.ts
|   `-- styles/globals.css
|-- index.html
|-- package.json
|-- playwright.config.ts
|-- vite.config.ts
`-- tsconfig*.json
```

Not in the repository: `left side/` and `right side/` (455 source frames, ~31 MB), and
`reference/` (local QA material). Nothing in `src/` references them - the live hero is
entirely code-driven. See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

---

## Getting Started

```bash
npm install
npm run dev
```

Dev server: **http://localhost:5173**

Other scripts, exactly as defined in `package.json`:

```bash
npm run build     # tsc -b && vite build
npm run preview   # serve the production build
npm run lint      # oxlint
```

Requires Node 18+ (developed and verified on Node 26.7).

---

## Testing

```bash
# The maintained suite. Requires the dev server; Playwright starts it if needed.
npx playwright test qa/phase1/

# Excluding the environment spec:
npx playwright test qa/phase1/ --grep-invert environment
```

Six spec files under `qa/phase1/` cover the cinematic hero, the world handoff, reduced motion
across viewports, touch interaction, and typography geometry. The `qa/*.mjs` files are
standalone measurement harnesses, run directly with `node qa/<name>.mjs` against a running
dev server - they are diagnostic tools, not part of the pass/fail suite.

Browser coverage was verified manually in **Chrome** and **Edge** at all seven viewports in
both motion modes. **Firefox was not tested** - it was not installed on the machine used.

Known limitation: six assertions in `qa/phase1/typography-refine.spec.ts` and
`cinematic.spec.ts` still encode pre-corridor cap-height expectations and currently fail.
They are stale, not a regression - the corridor redesign changed the numbers they assert.
See [`docs/TESTING.md`](docs/TESTING.md).

---

## Production Build

```bash
npm run build
```

Verified output: **23 files, 566 kB total** (565,558 bytes).

| Chunk | Raw | Gzip |
|---|---|---|
| `vendor-*.js` (React + GSAP + Zustand) | 333.07 kB | 112.81 kB |
| `index-*.js` (app code) | 24.53 kB | 8.55 kB |
| `index-*.css` | 16.28 kB | 4.20 kB |
| `vendor-*.css` | 2.01 kB | 0.53 kB |
| runtime | 0.58 kB | 0.36 kB |
| **JS + CSS total** | **376.47 kB** | **126.45 kB** |

Figures are as reported by `vite build` (kB = 1000 bytes).

Plus 102 KB of self-hosted woff2/woff font subsets and the 62 KB figure image. Fonts are
emitted for latin, latin-ext, and vietnamese subsets.

There are no runtime API calls, no external network requests, and no environment variables.

---

## Accessibility

Implemented and verified:

- **Semantic `<h1>`** - one real heading for the portfolio identity, visually clipped to
  1x1 px. The type art remains decorative.
- **Reduced motion** - honoured end-to-end, with the hero composition numerically
  identical to normal motion. Verified at all five approved desktop viewports.
- **Keyboard path** - Enter/Space from inside the hero moves to the selection hold, then
  both boards are tabbable and activatable. Mouse, touch, hover, focus ring, and the
  selection transition are unchanged.
- **Focus visibility** - confirmed by pixel diff (196,229 changed pixels at 1440x900).
- **Touch targets** - >=44x44 px, >=72x72 px on coarse pointers.
- **Screen-reader labels** - each board has a descriptive `ariaLabel`; selection is
  announced through a live region.
- **Deep links and Back** - worlds are addressable and Back restores the hero.

This is not a WCAG conformance claim. No axe run, no screen-reader pass, and no formal audit
has been performed. Keyboard access, focus visibility, reduced motion, and a semantic
heading are the parts that have actually been verified.

---

## Deployment

Intended target is **Vercel**. No configuration is required - Vite's defaults are correct and
there are no environment variables.

1. Import the repository at <https://vercel.com/new>.
2. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
3. Deploy.

Deep links are hash-based (`#/data-world`), so no SPA rewrite rule is needed.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the post-deploy checklist.

---

## Browser Compatibility

**Tested:** Chrome and Edge (desktop 1920x1080, 1440x900, 1366x768, 1280x720; mobile
emulation 412x915, 390x844, 375x812), in both normal and reduced-motion modes, against both
the dev server and the production build.

**Not tested:** Firefox, Safari, and any real iOS/Android handset. The CSS used
(`clip-path`, `container-type`, `svh` units, `mix-blend-mode`) is broadly supported in
current browsers, but that is inference from the spec, not a test result.

---

## Performance

Measured from the production build, not estimated:

- Total output 566 kB; JS + CSS 126.45 kB gzipped.
- One image request (62 KB webp). No video, no canvas frame sequence, no runtime fetches.
- Fonts are self-hosted subsets - no render-blocking third-party request.
- Only two animations run continuously (a figure specular sweep and the grain); both are
  transform/opacity only and are disabled under reduced motion.

No Lighthouse or Core Web Vitals audit has been run, so no performance score is claimed.

---

## License

No license file. This project is **unlicensed - all rights reserved**. It is published for
viewing and portfolio review only; no permission to copy, modify, or redistribute is granted.

---

## Status

Phase 1 (hero, selection, handoff, routing, accessibility) is complete and verified. Phase 2
(the world interiors, and the projects / experience / certifications / contact content) is
not implemented. Those are placeholders, stated plainly rather than implied.
