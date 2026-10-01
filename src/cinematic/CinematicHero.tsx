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
import { GroundLayer } from './layers/GroundLayer';
import { AccentGlowLayer } from './layers/AccentGlowLayer';
import { BoardLayer } from './layers/BoardLayer';
import { FigureLayer } from './layers/FigureLayer';
import { TypographyLayer } from './layers/TypographyLayer';
import { GrainLayer } from './layers/GrainLayer';
import { WorldBoard } from './selection/WorldBoard';
import { useWorldSelection } from './selection/useWorldSelection';
import { boardRect, layoutMode } from './selection/selectionGeometry';
import { WORLD_BOARDS } from './data/boardContent';
import { useGameStore } from '../store/gameStore';
import type { Path } from '../store/gameStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './CinematicHero.css';

export interface CinematicHeroProps {
  /**
   * Fired once, on explicit world selection. Task 8 owns the handoff; until
   * then this hands the path to the app so the world can mount.
   */
  onWorldSelected: (path: Path) => void;
}

export function CinematicHero({ onWorldSelected }: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const selectPath = useGameStore((s) => s.selectPath);
  const selectedPath = useGameStore((s) => s.selectedPath);

  const [announcement, setAnnouncement] = useState('');
  const viewportWidth = useViewportWidth();

  /**
   * Selection latches ONCE the hold has been reached.
   *
   * Without this, focusing a board can scroll the page slightly, which drops
   * progress back below the S5 gate, which unmounts the boards and dumps focus
   * onto <body> — producing a Tab loop that can never leave the hero.
   */
  const hasReachedSelectionRef = useRef(reducedMotion);
  const [selectionLatched, setSelectionLatched] = useState(reducedMotion);

  const handleReached = useCallback(() => {
    if (hasReachedSelectionRef.current) return;
    hasReachedSelectionRef.current = true;
    setSelectionLatched(true);
  }, []);

  // Under reduced motion the final composition is shown immediately and both
  // boards are live. Nothing is auto-selected (brief section 15).
  const selectionEnabled = reducedMotion || selectionLatched;

  const timeline = useHeroTimeline({
    containerRef,
    enabled: !reducedMotion,
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

      selectPath(path);
      setAnnouncement(`${WORLD_BOARDS[path].worldName} world selected. Loading.`);
      onWorldSelected(path);
    },
    [selectPath, onWorldSelected, timeline]
  );

  const handlers = useWorldSelection({
    enabled: selectionEnabled,
    onSelect: handleSelect,
    onAnnounce: setAnnouncement,
  });

  return (
    <div
      ref={containerRef}
      className="cinematic-hero"
      data-reduced-motion={reducedMotion || undefined}
      data-selection={selectionEnabled ? 'open' : 'closed'}
      data-selected={selectedPath ?? undefined}
      data-mode={layoutMode(viewportWidth)}
    >
      <GroundLayer />
      <AccentGlowLayer />
      <BoardLayer settled={reducedMotion} />
      <FigureLayer />
      <TypographyLayer settled={reducedMotion} />

      {/* Interactive controls, positioned over the plates. */}
      {selectionEnabled &&
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

      {/* Screen-reader state. Announcements are polite and atomic. */}
      <div className="cinematic-hero__sr" aria-live="polite" aria-atomic="true">
        {announcement ||
          (selectionEnabled
            ? 'Choose your path: Data, or Cloud and DevOps.'
            : '')}
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
