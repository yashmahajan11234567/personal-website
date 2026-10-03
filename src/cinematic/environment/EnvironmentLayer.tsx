/**
 * Environment layer — the world waking up under the user's attention.
 *
 * One canvas per world (PIP for Data, clouds for Cloud), driven by a single
 * progress value advanced in a shared rAF loop. Sits BEHIND the figure, the
 * plates and the typography at all times.
 *
 * Design constraints, and how each is met:
 *
 *  - "The world is waking up because I am looking at it."
 *      A single monotonic progress value advances toward a target over ~950ms.
 *      Leave runs the identical path in reverse, so the two directions cannot
 *      drift apart.
 *
 *  - "Do NOT instantly remove everything" / "No blank frame."
 *      The animation state lives in a REF, not in the effect closure, and the
 *      loop is installed once with `[]`. The first version kept `state` and
 *      `elapsed` as locals inside the effect and listed `visible` in its
 *      dependency array, so every hover change tore the loop down and rebuilt it
 *      with progress reset to 0. Measured consequences: the PIP dropped to 0.00%
 *      the instant the pointer left, and Data -> Cloud showed a ~180ms blank
 *      frame (PIP 0.00% while the clouds were still at 0.00%) -- exactly the
 *      "no flashing, no blank frame" the brief forbids.
 *
 *  - "Not a generic overlay."
 *      Generated geometry composited as light over the wash, not a tinted image
 *      or a CSS gradient.
 *
 *  - "Must not interfere with ScrollTrigger."
 *      This layer never reads progressBus and never writes it. The rAF loop is
 *      cancelled whenever progress is at its target, so during scroll it costs
 *      nothing.
 *
 *  - "No PIP / clouds / blue / orange during PERSONAL/PORTFOLIO."
 *      Gated on cinematicPhase === 'selection', the same gate the wash already
 *      uses, so the two cannot disagree.
 *
 *  - "Do not stack on the handoff."
 *      Suppressed once a world is chosen, matching the plate hover scale, so
 *      the handoff's own 1.045 dominance is not compounded.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  drawEnvironment,
  sizeCanvas,
  stepProgress,
  type EnvironmentKind,
} from './render';
import './EnvironmentLayer.css';

interface LoopState {
  data: number;
  cloud: number;
  elapsed: number;
  target: EnvironmentKind | null;
  raf: number;
  last: number;
  paintAll: () => void;
  tick: (now: number) => void;
}

export function EnvironmentLayer() {
  const dataRef = useRef<HTMLCanvasElement>(null);
  const cloudRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<LoopState | null>(null);

  /*
   * Resolved exactly the way the wash and the plate scale resolve it, so all
   * three react to the same world. Priority: hover, then focus, then selection.
   */
  const hovered = useGameStore((s) => s.hoveredBoard);
  const focused = useGameStore((s) => s.focusedBoard);
  const selected = useGameStore((s) => s.selectedPath);
  const phase = useGameStore((s) => s.cinematicPhase);
  const reducedMotion = useReducedMotion();

  const active = hovered ?? focused ?? null;

  // Suppressed once chosen, so it does not outlive the decision that raised it.
  const visible: EnvironmentKind | null =
    phase === 'selection' && !selected && (active === 'data' || active === 'cloud')
      ? active
      : null;

  useEffect(() => {
    const data = dataRef.current;
    const cloud = cloudRef.current;
    if (!data || !cloud) return;

    const canvasFor = (kind: EnvironmentKind) => (kind === 'data' ? data : cloud);

    const measure = (canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      sizeCanvas(canvas, rect.width, rect.height);
    };

    const state: LoopState = {
      data: 0,
      cloud: 0,
      elapsed: 0,
      target: null,
      raf: 0,
      last: 0,
      paintAll: () => {},
      tick: () => {},
    };

    const paint = (kind: EnvironmentKind) => {
      drawEnvironment(canvasFor(kind), kind, {
        progress: kind === 'data' ? state.data : state.cloud,
        elapsed: state.elapsed,
      });
    };

    state.paintAll = () => {
      measure(data);
      measure(cloud);
      paint('data');
      paint('cloud');
    };

    state.tick = (now: number) => {
      // Clamp dt so a background tab or a GC pause does not teleport the
      // environment to its final state -- the build must stay watchable, and an
      // unclamped jump would skip straight through the crossfade.
      const dt = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;

      const targetData = state.target === 'data' ? 1 : 0;
      const targetCloud = state.target === 'cloud' ? 1 : 0;

      const d = stepProgress(state.data, targetData, dt);
      const c = stepProgress(state.cloud, targetCloud, dt);
      state.data = d.value;
      state.cloud = c.value;

      // Only advance elapsed while something is actually on screen, so an
      // idle scene is not burning frames animating an invisible drift.
      if (state.target !== null) state.elapsed += dt;

      state.paintAll();

      state.raf = !d.done || !c.done ? requestAnimationFrame(state.tick) : 0;
    };

    loopRef.current = state;
    state.paintAll();

    const onResize = () => state.paintAll();
    window.addEventListener('resize', onResize);

    return () => {
      if (state.raf) cancelAnimationFrame(state.raf);
      window.removeEventListener('resize', onResize);
      loopRef.current = null;
    };
    // Installed ONCE. Progress lives on the ref, so a target change never
    // rebuilds the loop and never resets the build -- that reset was what
    // produced the instant vanish on leave and the blank frame on crossfade.
  }, []);

  /*
   * Push the target in. Progress is deliberately NOT reset here, so a hover
   * change is always continuous: the outgoing environment recedes while the
   * incoming one builds, and the two overlap because each canvas advances its
   * own monotonic value from wherever it currently sits.
   */
  useEffect(() => {
    const state = loopRef.current;
    if (!state) return;

    state.target = visible;

    /*
     * Reduced motion: no build animation and no drift. The environment appears
     * at its final state immediately, which is the same contract the rest of
     * the cinematic uses under reduced motion -- the state is still reachable,
     * it just does not animate into place.
     */
    if (reducedMotion) {
      state.data = visible === 'data' ? 1 : 0;
      state.cloud = visible === 'cloud' ? 1 : 0;
      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
      }
      state.paintAll();
      return;
    }

    // Wake whenever the loop is idle, so any target change animates and a
    // settled scene still repaints.
    if (!state.raf) {
      state.last = performance.now();
      state.raf = requestAnimationFrame(state.tick);
    }
  }, [visible, reducedMotion]);

  return (
    <div
      className="cinematic-env"
      aria-hidden="true"
      data-testid="cinematic-environment"
      data-active={visible ?? 'none'}
      data-phase={phase}
      data-reduced={reducedMotion || undefined}
    >
      {/* Data world: the PIP network. Faint enough to sit behind the figure. */}
      <canvas ref={dataRef} className="cinematic-env__canvas cinematic-env__canvas--data" />
      {/* Cloud world: the cloud field. */}
      <canvas ref={cloudRef} className="cinematic-env__canvas cinematic-env__canvas--cloud" />
    </div>
  );
}