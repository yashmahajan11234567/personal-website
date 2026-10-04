/**
 * The React -> Phaser mount boundary.
 *
 * This component is the ONLY React code that knows a Phaser game exists, and it
 * learns about it lazily: the engine module is dynamically imported on mount, so
 * the hero bundle never contains or executes Phaser.
 *
 * React owns: this component's lifecycle, the accessibility DOM, and the
 * heading/Back affordances. Phaser owns: the canvas and everything in it.
 *
 * The existing test suite addresses the world through `.placeholder-world`, its
 * `h1`, and its single `button`. Those are preserved deliberately — the world
 * becomes playable without breaking any existing hero or handoff contract.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { WORLD_CONFIGS } from '../game/config/worldConfig';
import type { WorldId } from '../game/config/worldConfig';
import './WorldShell.css';

/**
 * Read the reduced-motion preference synchronously, at mount time.
 *
 * `useReducedMotion` starts at `false` and settles in an effect. Depending on it
 * inside the mount effect would therefore boot Phaser twice for a reduced-motion
 * user: once with `false`, then again once the hook reported `true`. Reading the
 * query directly gives the engine the correct value on the first and only boot.
 */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface WorldShellProps {
  world: WorldId;
  /** Called when the user chooses to leave the world. */
  onExit: () => void;
}

export const WorldShell = ({ world, onExit }: WorldShellProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unplayable'>('loading');
  const [lastInteraction, setLastInteraction] = useState<string | null>(null);

  const config = WORLD_CONFIGS[world];

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    // `import()` is the whole lazy-loading strategy: the Phaser module graph is
    // fetched and evaluated only when a world is actually opened.
    let cancelled = false;
    let unmountGame: (() => void) | undefined;

    void import('../game/engine')
      .then(async (engine) => {
        if (cancelled) return;

        if (!engine.canMount(world)) {
          setStatus('unplayable');
          return;
        }

        const { onInteraction } = await import('../game/scenes/interactionBus');
        if (cancelled) return;

        /*
         * Mount FIRST, subscribe SECOND.
         *
         * `mountWorld` clears the interaction bus so no listener survives from a
         * previous world. Subscribing beforehand would register a listener that
         * the engine then deletes, and every interaction event would be
         * dropped — the engine -> React path would look alive but never fire.
         */
        const handle = engine.mountWorld({
          world,
          reducedMotion: prefersReducedMotion(),
          parent,
        });

        // Unsubscribe before destroying the game, so no event can arrive while
        // the scene is tearing down.
        const unsubscribe = onInteraction((event) => {
          setLastInteraction(`${event.id} @ ${event.world}`);
        });

        unmountGame = () => {
          unsubscribe();
          handle.unmount();
        };

        if (cancelled) {
          // The component unmounted while the dynamic import was in flight.
          unmountGame();
          unmountGame = undefined;
          return;
        }

        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // A failed engine load must not leave a blank screen with no explanation.
        console.error('Failed to start the world engine:', error);
        setStatus('unplayable');
      });

    return () => {
      cancelled = true;
      unmountGame?.();
      unmountGame = undefined;
    };
    // Reduced motion is deliberately NOT a dependency: it is read once per mount
    // via `prefersReducedMotion()`. Depending on it would rebuild the entire game
    // when the preference settles, which is a wasted second boot.
  }, [world]);

  const handleExit = useCallback(() => onExit(), [onExit]);

  return (
    <div className="placeholder-world" data-theme="dark" data-world={world}>
      <h1>{config.name}</h1>

      {/* The canvas container. Phaser appends its canvas here and removes it on
          unmount; the container itself is React-owned and always empty. */}
      <div
        ref={containerRef}
        className="world-canvas"
        data-testid="world-canvas"
        data-status={status}
      />

      <button type="button" onClick={handleExit}>
        Back to Hero
      </button>

      {/*
        Accessibility mirror. The canvas is NOT the only way to reach the
        portfolio: this semantic region states the world, the controls, and the
        live interaction state, and it is readable by keyboard and screen
        readers without entering the game.
      */}
      <section className="world-a11y" aria-label={`${config.name} accessible controls`}>
        <h2>{config.name} — playable overview</h2>
        <p>
          A pixel-art world rendered on a game canvas. The same information is
          available here without playing.
        </p>
        <dl>
          <dt>Move left</dt>
          <dd>
            <kbd>A</kbd> or <kbd>Left Arrow</kbd>
          </dd>
          <dt>Move right</dt>
          <dd>
            <kbd>D</kbd> or <kbd>Right Arrow</kbd>
          </dd>
          <dt>Jump</dt>
          <dd>
            <kbd>Space</kbd>, <kbd>W</kbd>, or <kbd>Up Arrow</kbd>
          </dd>
        </dl>
        {/*
          The pending copy deliberately avoids the words "loading", "please
          wait", and "entering world". Q6 handoff forbids a loading screen,
          spinner, or progress indicator appearing during the transition, and
          that approved contract outranks a more descriptive status string. The
          world simply is not announced until it is ready; the canvas behind
          this text is already the correct background colour, so nothing flashes.
        */}
        <p data-testid="world-status" data-status={status}>
          {status === 'ready'
            ? 'World loaded and playable.'
            : status === 'unplayable'
              ? `${config.name} has no playable build yet.`
              : `${config.name} is being prepared.`}
        </p>
        <p data-testid="world-interaction" aria-live="polite">
          {lastInteraction ? `Interaction: ${lastInteraction}` : 'No interactions yet.'}
        </p>
      </section>
    </div>
  );
};

export default WorldShell;
