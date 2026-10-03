# Architecture

How the portfolio is put together, and why the few genuinely difficult parts are the way
they are.

## The shape of the app

```
main.tsx
  |
  v
App.tsx .................. routing shell: which world is mounted
  |
  +-- "hero" ---------> CinematicHero
  |                        |
  |                        +-- GroundLayer      (back)
  |                        +-- TypographyLayer  (type)
  |                        +-- FigureLayer      (figure)
  |                        +-- BoardLayer       (the two plates)
  |                        +-- GrainLayer       (vignette/noise)
  |                        +-- HandoffLayer     (wipe)
  |
  +-- "data-world" ---> placeholder
  +-- "cloud-world" -> placeholder
```

Everything visible is CSS and absolutely-positioned layers. There is no canvas frame
sequence in the live hero and no `<video>`; those were the earlier approach and were
removed. The only image is `figure-anchor.webp`.

## Three layers of state

**1. URL (`src/App.tsx`)**

The hash is the routing source of truth. `#/data-world` and `#/cloud-world` are the two
non-hero routes; anything else is the hero.

The rule that makes Back work is that there are exactly two functions:

- `applyHash()` - the **only** reader. Called on mount and on every `hashchange`.
- `syncUrl()` - the **only** writer.

Writing `location.hash` fires `hashchange`, which would otherwise loop, so `syncUrl` is
guarded against re-entering itself. Before this rule existed, Back removed the hash but
left the world mounted, because the URL was only read once on mount.

**2. Zustand store (`src/store/gameStore.ts`)**

Holds the current world and the selected path. Fine-grained subscriptions; nothing
performance-sensitive reads the whole store.

**3. Scroll progress bus (`src/cinematic/timeline/progressBus.ts`)**

ScrollTrigger writes a single normalised progress value here; layers subscribe to it.
Layers do **not** create their own ScrollTriggers, so there is exactly one scroll
listener and one pin in the document.

## Hero architecture

### Layer order is the composition

z-index order is part of the approved design and is deliberate:

| z | Layer | Why there |
|---|-------|-----------|
| 0 | ground | the wash everything sits on |
| 3 | typography | the words |
| 4 | figure | **above** the words - the figure occludes them |
| 6 | boards | the selectable plates, behind the figure by DOM order |
| 7 | WorldBoard buttons | hit targets, above the plates |
| 8 | grain | unifies the whole frame |
| 9 | handoff | the wipe, above everything |
| 40 | hero root during handoff | promoted so the wipe is never clipped |

The figure sits above the typography on purpose. The placard in `figure-anchor.webp` is
baked into the image, and the words pass behind it. Equal z-index on the plates plus later
DOM order is what puts them behind the figure.

### Type corridors

The two words are laid out in **separate rectangles** with the figure between them:

```ts
PERSONAL:  { x: 0.017, y: 0.344, width: 0.398, height: 0.260 }
PORTFOLIO: { x: 0.567, y: 0.344, width: 0.429, height: 0.260 }
```

These are frozen. They were tuned against a reference and then explicitly accepted, down
to the residual ~1.8px difference at 1920x1080. Do not retune them casually.

Because each word has its own box, neither can ever overlap the figure. The original
approach used one oversized headline box for both words, which made any font-size change
move the words relative to the figure.

### The runtime fitter

This is the most fragile part of the codebase and the part most likely to break silently.

The words must fill their corridor exactly at any viewport, so the font size is **solved at
runtime** rather than hardcoded:

1. Set a temporary `font-size` on the glyph element.
2. Measure the **painted advance width** of the actual glyph run. This is measured on a
   canvas using the real font, not from `getBoundingClientRect()`, because the box model
   reports layout width rather than inked width and League Gothic is narrow.
3. Solve for the size whose advance equals the corridor width.
4. Apply it, then re-measure to confirm.

Measured result: `200.18px` at 1440x900, `266.89px` at 1920x1080, `190.05px` at 1366x768,
`177.82px` at 1280x720, `54.17px` at 390x844.

#### Why reduced motion broke it

`src/styles/globals.css` contains:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
  }
}
```

The fitter writes an inline `font-size` and immediately reads the resulting width. Under
that rule the read returned a **stale** value - 677.5px or 841px instead of the true ~281px
- because the transition machinery had not settled. The wrong advance produced a wildly
oversized font size and clipped type.

Two fixes were tried:

- **An async two-frame settle.** Achieved correct parity but broke idempotence - a
  test failed because a re-run produced a different result. Rejected.
- **Synchronous transition suppression.** Wrap only the two measurement reads in
  `transition = "none"`, measure, restore. This is what shipped.

The rule: **suppress transitions around measurement, never around a whole render pass.**

## Selection architecture

`src/cinematic/selection/`

- `selectionGeometry.ts` - frozen corridor boxes and plate geometry, as fractions of the
  viewport.
- `WorldBoard.tsx` - each path is a real `<button>`. Focus, Enter/Space activation, and ARIA
  come from the platform rather than from hand-rolled handlers.
- `useWorldSelection.ts` - hover/focus state, and the **two-tap rule** for touch (the first
  tap arms, the second activates) so a tap does not fire on scroll-gesture release.

### The handoff

`HandoffLayer` + `handoffTiming.ts` run a timed sequence: the chosen plate scales to 1.045
while the other recedes to 0.3, the type fades to 0.22, the figure to 0.45, and the handoff
wipe fades in. The world mounts at the end.

### Keyboard access

Enter or Space while focus is inside the hero scrolls to the selection hold. Once there,
both boards get `tabIndex=0` and can be tabbed to and activated. Guarded off coarse
pointers so it never competes with the touch path.

## World architecture

`boardContent.ts` holds every viewer-facing string, deliberately separated from pixels and
JSX so copy can be replaced without touching artwork:

```ts
data:  { lines: ['DATA ANALYST', 'DATA ENGINEER'], ... }
cloud: { lines: ['DEVOPS', 'CLOUD'], ... }
```

**The two world interiors are placeholders.** They render a title and a "Back to Hero"
button. Nothing more. This is the honest current state - the projects, experience,
certifications, and contact sections do not exist yet.

## Scroll lifecycle

`timeline/activeTimeline.ts` keeps a handle on the active timeline so it can be destroyed
deterministically. `destroy()` is idempotent.

**It must be called during the render phase, not in an effect.** React commits DOM deletion
(`removeChild`) before effect cleanup runs, and ScrollTrigger owns a pin-spacer node React
does not know about. If React removes the hero first, ScrollTrigger calls `removeChild` on
an already-detached node, which throws and unmounts the entire app. This is the single most
fragile ordering constraint in the app and is commented as such in `App.tsx`.
