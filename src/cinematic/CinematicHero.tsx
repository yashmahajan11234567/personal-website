/**
 * Cinematic hero — the composition root.
 *
 * Layers, back to front:
 *   0  GroundLayer      white stage, carries the camera-push illusion
 *   1  AccentGlowLayer  hover-only world colour (D4)
 *   2  BoardLayer       the two information plates
 *   3  FigureLayer      the immobile anchor (D5)
 *   4  TypographyLayer  PERSONAL / PORTFOLIO
 *   5  WorldBoard x2    the interactive controls
 *   6  GrainLayer       vignette + noise
 *
 * Note the figure sits ABOVE the boards and BELOW the typography. That ordering
 * is what keeps the figure from being dragged along by board animation while
 * still letting the headline words pass over it, as in the reference.
 *
 * This component owns no timing. The single ScrollTrigger lives in
 * useHeroTimeline; progress flows through progressBus.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHeroTimeline } from './timeline/useHeroTimeline';
import { progressBus } from './timeline/progressBus';
import { GroundLayer } from './layers/GroundLayer';
import { HaloLayer } from './layers/HaloLayer';
import { FragmentLayer } from './layers/FragmentLayer';
import { BoardLayer } from './layers/BoardLayer';
import { FigureLayer } from './layers/FigureLayer';
import { SpotlightLayer } from './layers/SpotlightLayer';
import { TypographyLayer } from './layers/TypographyLayer';
import { GrainLayer } from './layers/GrainLayer';
import { WorldBoard } from './selection/WorldBoard';
import { useWorldSelection } from './selection/useWorldSelection';
import { HandoffLayer } from './handoff/HandoffLayer';
import { HANDOFF_MS } from './handoff/handoffTiming';
import { boardRect, layoutMode } from './selection/selectionGeometry';
import { trackHeightVh } from './timeline/beats';
import { WORLD_BOARDS, HERO_HEADING } from './data/boardContent';
import { useGameStore } from '../store/gameStore';
import type { Path } from '../store/gameStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './CinematicHero.css';

export interface CinematicHeroProps {
  /**
   * Fired when the handoff has PLAYED OUT and the world should mount. Not on
   * the click itself — Task 8 keeps the cinematic on screen for the duration of
   * the transition and calls this at the end of it.
   */
  onWorldSelected: (path: Path) => void;
}

export function CinematicHero({ onWorldSelected }: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const selectPath = useGameStore((s) => s.selectPath);
  const selectedPath = useGameStore((s) => s.selectedPath);
  const isHandoff = useGameStore((s) => s.isHandoff);
  const setHandoff = useGameStore((s) => s.setHandoff);
  const hoveredBoard = useGameStore((s) => s.hoveredBoard);
  const focusedBoard = useGameStore((s) => s.focusedBoard);
  /*
   * The plate's hover scale resolves its active plate exactly the way the
   * atmosphere does (AccentGlowLayer reads the same three fields in the same
   * order), so the scale and the coloured light are always driven by ONE piece
   * of state and cannot disagree. Focus is included deliberately: a keyboard
   * user must get the same "this plate is active" response as a pointer user,
   * and the visible focus ring is not a substitute for it.
   */
  const activeBoard = hoveredBoard ?? focusedBoard ?? selectedPath;
  /*
   * The hover scale is suppressed once a world is chosen. Once the handoff
   * starts, the CHOSEN plate becomes dominant through its own animation on the
   * slot (HandoffLayer.css, scale 1.045), and the other recedes -- so leaving
   * the hover scale on would stack a second 1.04 on the same plate and take it
   * past ~1.09, which reads as a jump rather than a hand-off. It also keeps the
   * atmosphere, which is keyed off the same resolution, from staying lit for a
   * plate the user is no longer choosing.
   *
   * The effect is hover-scoped by design, so it has no business outliving the
   * choice that made it.
   */
  const scaleTarget = selectedPath ? null : activeBoard;

  const [announcement, setAnnouncement] = useState('');
  const viewportWidth = useViewportWidth();

  /*
   * Selection latches ONCE the hold has been reached.
   *
   * Without this, focusing a board can scroll the page slightly, which drops
   * progress back below the S5 gate, which unmounts the boards and dumps focus
   * onto <body> — producing a Tab loop that can never leave the hero.
   *
   * It starts FALSE even under reduced motion: reaching the hold must be
   * something the user scrolls to, never something handed to them at load.
   */
  const hasReachedSelectionRef = useRef(false);
  const [selectionLatched, setSelectionLatched] = useState(false);

  /*
   * KEYBOARD SHORTCUT TO THE SELECTION HOLD.
   *
   * Selection normally latches when scroll progress crosses S5, which a mouse
   * or trackpad user reaches in seconds. A keyboard-only user cannot: the two
   * WorldBoards are not rendered at all until `selectionLatched` is true
   * (see the board-target block below), so there is nothing to Tab to, and
   * nothing else on the page is focusable. Measured before this change: 14 Tab
   * presses reached only the skip link and <body>.
   *
   * So the boards get a keyboard route that does not require scrolling: pressing
   * Enter or Space while focus is inside the hero scrolls to the hold, which
   * lets the existing progress-driven latch fire exactly as it does for a
   * pointer. Nothing about the selection itself is bypassed — the same
   * `enabled` flag, the same handlers, the same transition, the same focus ring.
   * Only the ARRIVAL is changed.
   *
   * Scroll-only and keyboard-only by construction:
   *   - guarded on coarse pointers, so it cannot fire on a phone or tablet,
   *     which would hijack the touch two-tap path;
   *   - guarded on !reducedMotion, because the reduced-motion track has no pin
   *     and a programmatic scroll would land somewhere different from where a
   *     scroll-driven user would be;
   *   - the listener is on the hero element, so it only runs while focus is
   *     genuinely inside the cinematic.
   */
  useEffect(() => {
    if (reducedMotion) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    /*
     * The listener lives on `window`, not on the hero container (audit
     * 2026-10-16, K2). On the container it required focus INSIDE the hero,
     * but the hero is tabIndex={-1} and the page's only tab stop is the skip
     * link — so a keyboard-only user could never trigger this route and could
     * not reach the world boards at all. The guards below keep the shortcut
     * safe now that every keydown is seen: it fires only when the world is
     * not yet selected, no modal owns the event, and focus is not on a
     * control whose Enter/Space means "activate this".
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      if (event.defaultPrevented || event.repeat) return;
      // Once a world is chosen the shortcut has nothing to offer: the hero is
      // on its way out, and Enter/Space belong to whatever is focused there.
      if (useGameStore.getState().currentWorld !== 'hero') return;
      // A modal dialog (info panel, cloud card) owns the keyboard; never steal.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      // Never intercept when focus is already on a control: Enter/Space there
      // means "activate this", and stealing it would break board selection.
      const active = document.activeElement;
      if (active && active !== document.body && containerRef.current?.contains(active)) {
        const tag = active.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
          return;
        }
      }
      event.preventDefault();
      containerRef.current?.focus();
      window.scrollTo({
        top: (document.documentElement.scrollHeight - window.innerHeight) * 0.7,
        behavior: 'smooth',
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reducedMotion]);

  // Sync cinematicPhase to store so AccentGlowLayer can gate atmosphere to selection phase
  useEffect(() => {
    const unsubscribe = progressBus.subscribe(({ phase }) => {
      useGameStore.getState().setCinematicPhase(phase);
    });
    // Initialize with current phase
    useGameStore.getState().setCinematicPhase(progressBus.getPhase());
    return () => unsubscribe();
  }, []);

  const handleReached = useCallback(() => {
    if (hasReachedSelectionRef.current) return;
    hasReachedSelectionRef.current = true;
    setSelectionLatched(true);
  }, []);

  const selectionEnabled = selectionLatched;

  /*
   * The timeline runs under reduced motion too.
   *
   * Disabling it is what produced the reported failure: with no ScrollTrigger
   * the layers fell back to their settled state, so the FINAL Data/Cloud
   * selection composition rendered at page load and the opening
   * PERSONAL/PORTFOLIO state never appeared. Reduced motion should remove the
   * easing, not the scroll-driven progression -- nothing auto-plays either
   * way, because progress only ever changes when the user scrolls.
   */
  const timeline = useHeroTimeline({
    containerRef,
    enabled: true,
    reducedMotion,
    onReachSelection: handleReached,
  });

  /**
   * Tear down the ScrollTrigger BEFORE this component unmounts.
   *
   * ScrollTrigger's pin mutates the DOM directly (pin-spacer insertion and
   * removal). Letting React unmount the hero first makes its cleanup throw
   * "Failed to execute 'removeChild' on 'Node'", which unmounts the entire app.
   * An empty-dependency cleanup runs before React removes the DOM, so this is
   * the safe place to kill the trigger.
   */
  useEffect(() => {
    return () => {
      timeline.current.destroy();
    };
  }, [timeline]);

  const handleSelect = useCallback(
    (path: Path) => {
      // Tear the pinned ScrollTrigger down NOW, while the hero's DOM is still
      // mounted and ScrollTrigger's pin-spacer is still a child of <body>.
      //
      // React unmounting the hero first makes ScrollTrigger's own cleanup throw
      // "Failed to execute 'removeChild' on 'Node'", which tears down the whole
      // app — the hash updates but the world never renders. Effect-cleanup
      // ordering cannot fix this reliably, so the kill happens in the handler.
      timeline.current.destroy();

      // Hold the hero on screen and play the handoff (Task 8). The world mounts
      // when it finishes, not now — see the effect below.
      selectPath(path);
      setHandoff(true);
      setAnnouncement(`${WORLD_BOARDS[path].worldName} world selected. Entering.`);
    },
    [selectPath, setHandoff, timeline]
  );

  /**
   * Mount the world when the handoff has finished.
   *
   * The veil dissolves to exactly the world placeholder's background colour, so
   * the swap is invisible. Under reduced motion there is no transition, so the
   * world mounts immediately (delay 0) and nothing flashes.
   */
  useEffect(() => {
    if (!isHandoff || !selectedPath) return;

    if (reducedMotion) {
      onWorldSelected(selectedPath);
      return;
    }

    const timer = window.setTimeout(() => {
      onWorldSelected(selectedPath);
    }, HANDOFF_MS);

    // If the hero unmounts first (user navigates back mid-transition), do not
    // fire the callback into an unmounted tree.
    return () => window.clearTimeout(timer);
  }, [isHandoff, selectedPath, reducedMotion, onWorldSelected]);

  const handlers = useWorldSelection({
    enabled: selectionEnabled,
    onSelect: handleSelect,
    onAnnounce: setAnnouncement,
  });

  return (
    /*
     * The track wrapper supplies the document's scroll height under reduced
     * motion, where ScrollTrigger does not pin and therefore contributes no
     * pin-spacing of its own.
     *
     * When the pin IS active (normal motion) the wrapper must contribute NO
     * height, or the two would add up and the track would be twice as long as
     * intended. Hence the conditional height.
     */
    <div
      className="cinematic-track"
      data-reduced-motion={reducedMotion || undefined}
      style={
        reducedMotion
          ? ({ height: `${trackHeightVh(viewportWidth)}vh` } as React.CSSProperties)
          : undefined
      }
    >
    <div
      ref={containerRef}
      className="cinematic-hero"
      /* Focusable so the keyboard shortcut below has somewhere to live: the hero
       * is otherwise an unscoped div, and a keydown on <body> would fire the
       * shortcut even with focus parked on unrelated UI. No visible outline —
       * the cinematic has nothing to outline. */
      tabIndex={-1}
      data-reduced-motion={reducedMotion || undefined}
      data-selection={selectionEnabled ? 'open' : 'closed'}
      data-selected={selectedPath ?? undefined}
      data-handoff={isHandoff || undefined}
      data-handoff-static={reducedMotion || undefined}
      data-mode={layoutMode(viewportWidth)}
      style={{ '--handoff-ms': `${HANDOFF_MS}ms` } as React.CSSProperties}
    >
      <GroundLayer />
      {/*
       * THE ONE REAL HEADING.

       * PERSONAL and PORTFOLIO are type art: glyph runs fitted to measured boxes
       * and placed as fractions of the frame. They read as a pair of words, not
       * as a heading, and "PERSONAL PORTFOLIO" tells a screen reader nothing
       * about whose portfolio this is.

       * This h1 carries that identity in real text. It is visually hidden, so
       * it occupies no space, paints no pixels, and cannot move the approved
       * composition — the words on screen are still the type art, untouched.

       * The type art is NOT aria-hidden: a test asserts nothing interactive is
       * aria-hidden, and more importantly the words are real content that a
       * sighted user reads. They stay exposed; this heading simply names the
       * page above them.
       */}
      <h1 className="cinematic-hero__heading">{HERO_HEADING}</h1>
      {/*
       * NO HOVER COLOUR.
       *
       * AccentGlowLayer (the blue/orange multiply wash) and EnvironmentLayer
       * (the pipe network / cloud field) are no longer mounted. Hovering a
       * board now changes the plate's scale and nothing else -- the backdrop
       * stays the same pale ground it has for the whole cinematic.
       *
       * Both are left in place on disk, unmounted, rather than deleted: the
       * store fields they read (hoveredBoard / focusedBoard) and the handoff
       * sequencing are shared with the plate scale and the board targets, so
       * only the two colour layers were pulled, not their state.
       */}
      <BoardLayer hoveredBoard={scaleTarget} />
      <HaloLayer />
      <FragmentLayer />
      <FigureLayer />
      <SpotlightLayer disabled={reducedMotion} />
      <TypographyLayer />

      {/* Interactive controls, positioned over the plates. */}
      {selectionEnabled &&
        !isHandoff &&
        (['data', 'cloud'] as Path[]).map((path) => (
          <div
            key={path}
            className="cinematic-hero__board-target"
            style={targetStyle(path, viewportWidth)}
          >
            <WorldBoard
              path={path}
              enabled={selectionEnabled}
              locked={selectedPath !== null}
              chosen={selectedPath === path}
              handlers={handlers}
            />
          </div>
        ))}

      <GrainLayer />

      {/* Task 8: the dissolve that resolves the cinematic into the world. */}
      <HandoffLayer reducedMotion={reducedMotion} />

      {/* Screen-reader state. Announcements are polite and atomic. */}
      <div className="cinematic-hero__sr" aria-live="polite" aria-atomic="true">
        {announcement ||
          (selectionEnabled
            ? 'Choose your path: Data, or Cloud and DevOps.'
            : '')}
      </div>
    </div>
    </div>
  );
}

/**
 * Viewport width for board-target placement. The hit area must track the same
 * measured rects as the plate artwork, so it re-measures on resize. Resize is
 * rare; it is scroll that must never re-render.
 */
function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return width;
}

/**
 * Position a board target over its plate. Uses the same measured rects as
 * BoardLayer so the hit area and the artwork cannot drift apart.
 */
function targetStyle(path: Path, viewportWidth: number): React.CSSProperties {
  const rect = boardRect(path, viewportWidth);
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };
}
