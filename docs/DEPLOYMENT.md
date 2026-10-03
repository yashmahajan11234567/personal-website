# Deployment

Intended target: **Vercel**.

## Build

```bash
npm install
npm run build
```

`npm run build` runs `tsc -b && vite build`, so a type error fails the build before Vite is
even invoked. Output lands in `dist/`.

Verified output: **23 files, 566 KB**, of which JS + CSS is 122.4 KB gzipped.

## Environment variables

**There are none.** The app makes no runtime API calls and reads no configuration. A
successful build needs nothing but Node and npm.

`.env` and `.env.*` are gitignored. If that ever changes, the variable must be added to
Vercel's project settings, never committed.

## Vercel setup

1. Go to <https://vercel.com/new> and import the repository.
2. Framework preset: **Vite** (detected automatically).
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Deploy.

No `vercel.json` is needed, and none is committed.

### Why no SPA rewrite rule is required

Routing is hash-based (`#/data-world`, `#/cloud-world`). The fragment never reaches the
server, so a direct visit to a world URL requests `/`, gets `index.html`, and works. A
history-API router would have needed a rewrite to `index.html`; this one does not.

## Post-deploy checklist

Work through this before telling anyone the site is live.

**Build and assets**

- [ ] The deployment reports a successful build
- [ ] `dist/` is served and the page renders
- [ ] No `analysis/` directory in the deployed output
- [ ] Font files are served (League Gothic, Archivo Black) and no request goes to a
      third-party font host
- [ ] `figure-anchor.webp` loads

**Function**

- [ ] The hero renders and the type fits its corridor
- [ ] Scrolling drives the choreography
- [ ] Hovering/focusing a plate raises it and dims the other
- [ ] Selecting Data reaches `#/data-world`
- [ ] Selecting Cloud reaches `#/cloud-world`
- [ ] Browser Back from a world restores the hero
- [ ] Direct visits to both world URLs work, including on refresh
- [ ] An unknown hash falls back to the hero

**Responsive**

- [ ] 1920x1080, 1440x900, 1366x768, 1280x720
- [ ] 412x915, 390x844, 375x812
- [ ] No horizontal overflow anywhere
- [ ] Touch selection works on a real phone

**Accessibility**

- [ ] With `prefers-reduced-motion: reduce`, animation is suppressed and the composition is
      unchanged
- [ ] Keyboard-only: Enter/Space from the hero reaches both boards and activates them
- [ ] Focus ring is visible on each board
- [ ] A real `<h1>` is present in the accessibility tree

**Health**

- [ ] Console is free of errors
- [ ] No 4xx or 5xx responses
- [ ] Lighthouse on mobile, if you care about the number - none has been run, so treat any
      figure as unmeasured

## Content status, as deployed

The world interiors are placeholders. A visitor who picks a path lands on a page with a
title and a "Back to Hero" button, not projects or experience. That is expected at this
stage and is documented in the README rather than hidden.
