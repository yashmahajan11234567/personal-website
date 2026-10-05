# Known Limitations

Limitations that are measured, understood, and accepted rather than fixed.
Each entry states what was measured, when, and why it was not fixed.

---

## Enter and Escape never reached Phaser's keyboard plugin — FIXED

**Status:** FIXED (was: accepted limitation)
**Impact:** 0 tests. Both previously failing tests now pass.

This had TWO independent causes. I had found only the first when I parked it
last session, and documented the second only after the correction pass demanded
that Enter actually work.

### Cause 1 — a stale closure preventDefault-ed every Enter

`WorldShell.tsx`'s entry-plate listener read `entryDismissed` from its closure.
That effect depends only on `status`, which never changes once the world mounts,
so the closure was created once with `entryDismissed === false` and kept it for
the lifetime of the world. React hid the plate by re-rendering, but the listener
still believed the plate was up and called `event.preventDefault()` on every
Enter — in the CAPTURE phase, before Phaser's bubble-phase `KeyboardManager`
could queue the event.

That is what produced the measurement that looked so strange: at document
capture, `Enter.defaultPrevented === true` while `ArrowRight.defaultPrevented ===
false`. Phaser discards already-prevented events, so `keyEnter.isDown` never
became true.

Fixed with a ref (`entryDismissedRef`) so the listener reads the current value at
event time, kept in sync at all three dismissal sites (key, backdrop click,
button click). Verified: Enter now arrives `prevented: false`.

### Cause 2 — teardown stripped Phaser's own key state

`WorldScene.ts`'s shutdown handler called `removeAllListeners()` on a list that
included `keyEnter` and `keyEscape`. In Phaser 4 a `Key` updates `isDown` inside
its own `on('down')` handler, so `removeAllListeners()` does not merely detach
gameplay callbacks — it detaches the Key's state tracking. After it ran,
`keyEnter`, `keyEscape`, `keyA`, `keyD` and `keyW` could never become true again
regardless of input.

Fixed by removing Enter and Escape from that list. They carry no jump-buffering
handlers (those are registered only for the jump keys), so nothing leaks.

### What I got wrong before

I documented this as diagnosed-but-unidentified and attributed it to an unknown
upstream `preventDefault`. The `defaultPrevented` measurement was correct; my
conclusion that the cause was outside my own code was wrong. Both causes were in
this repository. I should not have parked it as "pre-existing, cause unknown"
without testing the two code paths I had written myself.

### A measurement trap worth recording

`plugin.keys.Enter` is `undefined` — Phaser keys its registry by keyCode, not by
name. Reading `keys.Enter` reported "keyEnter does not exist" even when the key
worked perfectly. The correct probe is `keys[13]` for Enter and `keys[27]` for
Escape. An early version of my own diagnostic was wrong because of this, and I
nearly misread a working fix as a second bug.

## Known non-defects, and why some tests are timing-sensitive

Not limitations of the product — recorded because they look like bugs in a log.

### The jump test's landing time varies 700–1100ms

Measured across five consecutive runs at 25–28fps, the player becomes grounded at
700, 800, 1000, 1000 and 1100ms. Gravity integrates per frame, so the arc length
in wall-clock time depends on frame rate. The test originally slept a fixed
1200ms, leaving as little as 100ms of margin; under the load of a 261-test full
run it failed with `grounded === false`.

The test now polls for the landing with a 5s ceiling. The physics was never
wrong: the arc measured 560 -> 533 -> 560, back to exactly its resting height.

### The entry plate legitimately covers the canvas

`.world-entry` is a deliberate full-viewport cover at z-index 40 — measured at
1440x900 occupying `1440x900@0,0` while the canvas sits at `172,108`. It is
supposed to cover the canvas, because it is the "press to enter" state.

Phase 1's `hero -> world -> back -> world round trip is clean` asserted the
canvas was topmost without dismissing the plate, so it failed at all 7 viewports
once the plate shipped. Two distinct selector problems came with it:

1. The plate intercepts pointer events aimed at the exit button, so the click
   waited the full 45s timeout.
2. `.placeholder-world button` — Phase 1's original exit selector — became
   ambiguous, because the plate lives INSIDE `.placeholder-world` and brought
   its own button. Phase 1 named a container rather than a control, so the
   selector was always ambiguous once a second button joined it.

Both are fixed in the test, by dismissing the plate and addressing
`[data-testid="world-exit"]`. No product code was changed for either.

### Lint is not configured

There is no ESLint configuration in this repository and none was added, because
adding one purely to make a run report "passed" would be theatre rather than
verification. Verification here is TypeScript (`tsc -b`), the Playwright suite,
and the production build. Lint is reported as **NOT CONFIGURED / SKIPPED**, not
as passing.
## Correction pass notes (2026-10-05)

### Tube geometry was overshot on the first attempt

The supplied reference is a tall rectangular column with a height:width ratio of
about 1.33. My first correction set the tube to 36x72 — ratio **2.00**, a narrow
chimney rather than the reference's column. Measured and corrected to 44x60
(ratio **1.36**, within 2% of the reference). The original was 60x52, ratio
0.87, i.e. wider than tall, which is why it read as a wall housing.

Recorded because the intermediate value shipped into a passing `tsc -b` and a
passing build. Geometry being type-correct and buildable is not evidence that it
looks right.

### Moving the exit pipes caused a real regression, caught by an existing test

Pushing the exit pipes from a 70px to a 150px right margin stopped their sign and
plate being clipped at the canvas edge — but in SKILLS it left the last station
(streamlit) only 60px from the exit pipe, against a required 80px clearance.
`chapter-architecture.spec.ts` caught it.

Fixed by widening SKILLS from 1100 to 1200 rather than letting the pipe sit on
top of a station. Widening a chapter to create clearance is preferable to moving
the station, because the station positions are content and the chapter width is
layout.

That change then broke a *different* existing test, which had hardcoded
`expect(worldWidth).toBe(1100)`. Fixed by importing `SKILLS_WIDTH`. A test that
repeats a config constant will fail the next time anyone tunes that config, and
it reports a deliberate layout decision as a failure.

### A HELD DIRECTION KEY STOPPED WORKING AFTER EVERY TUBE — FIXED

This was the most serious defect found in the correction pass, and it was
invisible to the entire existing suite.

**Symptom:** a player walking right into a tube arrived in the next chapter
unable to move. The key was still physically held, but the character stood still
until the visitor released and pressed it again.

**Cause:** Phaser's `KeyboardPlugin.shutdown()` DELETES every Key the plugin
created. The chapter swap is `scene.stop()` + `scene.start()`, so on arrival the
player has brand-new Key objects with `isDown === false`. A key held ACROSS that
boundary produces no new `keydown` — a human holding `d` keeps holding it — so
nothing ever sets `isDown` back to true.

**Measured, not inferred** (walk right from START into SKILLS):

| t | phase | keyD | intentVelocityX | player x |
|---|---|---|---|---|
| 4.0s | approach | true | 90 | 476 |
| 7.9s | entering | true | 0 | 750 (locked) |
| 12.3s | idle (arrived) | **false** | **0** | 144 |
| 27.0s | idle | false | 0 | 144 |

**Fix:** the scene tracks held key codes at the window level
(`heldAtSwap`), which survives the swap, and `createInputKeys` re-applies that
state to the freshly created Phaser Keys. Released in `shutdown()` so the window
listeners do not leak one pair per chapter swap, and cleared on `blur` so
alt-tabbing mid-travel cannot leave a key stuck down.

**Two earlier attempts were wrong, and both looked plausible:**

1. Removing `removeAllListeners()` from the keys in `shutdown()`. This was a real
   problem — it strips Phaser's own `isDown` tracking — but it was not the cause
   here, and removing it changed nothing. The plugin shutdown deletes the keys
   regardless.
2. Asking Phaser's freshly created keys which keys are down. They are all `false`
   by definition, so they can never answer the question. That loop was dead code
   and was deleted.

**Why the whole suite missed it:** every pre-existing travel test releases the
direction key before or during the transition, so the new scene sees a normal
keydown and works. The bug needs a key held continuously across arrival. The
regression test now does exactly that, and it was mutation-checked: with the
re-adoption removed it fails with `keyD: false`.

### Exit pipes needed a real margin, not the tube's width

The clipping fix is worth stating as a rule: the margin from the chapter edge has
to clear the WIDEST thing the pipe draws — the sign board and the destination
plate — not just the tube body. A 44px tube with a 132px sign beside it needs
more than 70px of margin.

