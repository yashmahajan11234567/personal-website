# Testing

## The suite

```bash
npx playwright test qa/phase1/
```

To skip the environment spec:

```bash
npx playwright test qa/phase1/ --grep-invert environment
```

Playwright starts the dev server itself (`reuseExistingServer: true`), so `npm run dev` does
not need to be running first. The config uses a single desktop project at 1440x900 and
`workers: 1` - the hero is a single shared document, so parallel workers fight over it.

`trace: 'off'` is deliberate. With traces enabled, Playwright streamed recordings into
`test-results/` during a run and cleaned the directory out from under still-running tests,
producing six teardown failures unrelated to what they asserted.

## Spec files

| File | Covers |
|---|---|
| `cinematic.spec.ts` | Hero rendering, scroll choreography, layer state |
| `handoff.spec.ts` | Hero-to-world transition and world mount |
| `reduced-motion-responsive.spec.ts` | Reduced motion across viewports |
| `touch.spec.ts` | Touch two-tap selection and hit targets |
| `typography-refine.spec.ts` | Type geometry, corridors, cap heights |
| `environment.spec.ts` | Environment layer (see known limitations) |

## Diagnostic harnesses

The `qa/*.mjs` files are **not** tests. They are standalone scripts that print exact
measurements:

```bash
node qa/probe-capheight.mjs      # cap height per word
node qa/probe-tracking.mjs       # letter-spacing
node qa/probe-idempotence.mjs    # fitter re-run stability
node qa/verify-v3.mjs            # multi-viewport hero verification
```

They require the dev server running, exit non-zero on some checks, and are meant to be run
by hand. `qa/_legacy-2026-09-30/` holds superseded specs from the previous approach; they
reference a renderer that no longer exists and are kept only for history.

## Browser and device coverage

Verified manually, against both the dev server and the production build:

| Browser | Viewports | Motion |
|---|---|---|
| Chrome | 1920x1080, 1440x900, 1366x768, 1280x720 | normal + reduced |
| Edge | 1920x1080, 1440x900, 1366x768, 1280x720 | normal + reduced |
| Chrome mobile emulation | 412x915, 390x844, 375x812 | normal + reduced |

**Firefox: not tested** - it was not installed on the verification machine. Safari and real
handsets are also untested.

## What was verified by measurement

- **Typography parity** - normal and reduced motion produce identical geometry at every
  approved viewport (delta `0.0px`).
- **Approved baseline** - `200.18px` at 1440x900, `266.89px` at 1920x1080, `190.05px` at
  1366x768, `177.82px` at 1280x720, `54.17px` at 390x844.
- **No horizontal overflow** at any tested viewport.
- **Focus ring visibility** - confirmed by pixel diff (196,229 changed pixels at 1440x900),
  not by reading computed style, which samples mid-transition and lies.
- **No overlap** between the words and the figure at the selection hold.
- **Clean console and network** - zero console errors, zero 4xx/5xx.
- **Browser Back** - hero -> Data -> Back, hero -> Cloud -> Back, and direct deep links all
  restore the hero.
- **Touch targets** - >=44x44 px, >=72x72 px on coarse pointers.

## Known limitations

**Six failing assertions.** `typography-refine.spec.ts` and `cinematic.spec.ts` contain
cap-height expectations written *before* the corridor redesign. The redesign changed the
numbers, so these assertions are stale rather than a regression. They have not been
updated because they encode the old composition, and rewriting them is a judgement call
about which values are now canonical.

Latest run: **98 passed, 6 failed** (excluding the environment spec).

**`environment.spec.ts`** covers `src/cinematic/environment/`, which is **not imported** by
the live hero - `CinematicHero.tsx` explicitly excludes it. It is dead code retained for
later. Hence `--grep-invert environment` in most runs.

**No accessibility automation.** No axe run, no screen-reader test, no formal audit.
Keyboard access, focus visibility, and the semantic heading were verified manually; nothing
here constitutes a WCAG conformance claim.

**No performance testing.** No Lighthouse run and no Core Web Vitals measurement. The
bundle figures in the README are file sizes, nothing more.

**Single project.** The Playwright config defines one desktop project. Mobile and Edge
coverage came from manual verification, not from the suite.
