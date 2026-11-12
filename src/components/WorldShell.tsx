/**
 * The React -> Phaser mount boundary.
 *
 * This component is the ONLY React code that knows a Phaser game exists, and it
 * learns about it lazily: the engine module is dynamically imported on mount, so
 * the hero bundle never contains or executes Phaser.
 *
 * React owns: this component's lifecycle, the accessibility DOM, the heading and
 * Back affordance, the information panel, and the station index. Phaser owns: the
 * canvas and everything in it.
 *
 * PRESERVED PHASE 1 CONTRACT
 *
 * The Phase 1 suite addresses the world through `.placeholder-world`, its `h1`,
 * `[data-testid="world-canvas"]`, `[data-testid="world-status"]`,
 * `[data-testid="world-interaction"]`, `.world-a11y` and its single `button`, and
 * it asserts EXACTLY seven `<kbd>` elements inside `.world-a11y`. Those are kept
 * in behaviour, including the control list's three rows and its literal key
 * counts. Everything Phase 2 adds lives in a SEPARATE region (`.world-index`) so
 * it cannot disturb them.
 *
 * THE CANVAS IS NOT THE ONLY ROUTE TO THE PORTFOLIO
 *
 * `.world-index` lists every station as a real focusable button that opens the
 * same panel the canvas opens, with the same content-model record. A visitor who
 * never presses a movement key, or who cannot see the canvas at all, reaches
 * every skill and project through ordinary DOM controls. That is the property
 * which stops the game from being a gate in front of the content.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PORTFOLIO, projectsForWorld, skillsForWorld } from '../content';
import { WORLD_CONFIGS } from '../game/config/worldConfig';
import type { WorldId } from '../game/config/worldConfig';
import { InfoPanel } from './InfoPanel';
import type { PanelKind } from './InfoPanel';
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

/** An open panel, as tracked in React state. */
interface OpenPanel {
  kind: PanelKind;
  id: string;
}

export const WorldShell = ({ world, onExit }: WorldShellProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unplayable'>('loading');
  const [lastInteraction, setLastInteraction] = useState<string | null>(null);
  const [panel, setPanel] = useState<OpenPanel | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);

  /*
   * The contents drawer.
   *
   * The index used to be a visible block of page beneath the canvas, duplicating
   * every skill and project that the world already shows. It is now a drawer over
   * the stage, closed by default: the content is still fully reachable by Tab and
   * Enter with no canvas and no game state, but it no longer sits under the game
   * taking up 826px of scrollable page.
   */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /*
   * Whether the DATA WORLD entry plate has been dismissed.
   *
   * Starts false so the first thing a visitor sees on arriving in the world is
   * where they are and what the controls are. Enter dismisses it, as does a click
   * or the explicit button -- it is a plate, not a gate.
   */
  const [entryDismissed, setEntryDismissed] = useState(false);
  /**
   * Mirror of `entryDismissed` for the window keydown listener.
   *
   * The listener is registered once, when the world becomes ready, and reads
   * this ref at event time. Reading the state variable instead would read the
   * value captured when the effect ran — permanently `false` — so the listener
   * would keep preventDefault-ing Enter after the plate was already gone. See
   * the note on `onEntryKey` for the full measurement that exposed it.
   */
  const entryDismissedRef = useRef(false);
  /**
   * The live game handle, kept in a ref rather than state: it is set once inside
   * an async mount and must be reachable from the panel effect without
   * re-subscribing or re-mounting the engine.
   */
  const handleRef = useRef<{ setPanelOpen: (open: boolean) => void } | null>(null);
  /**
   * The station the canvas currently has in range. Mirrored here so the DOM
   * shows the same highlight the canvas does — if a visitor cannot see the canvas
   * at all, this text is how they learn what Enter would open.
   */
  const [focusedStation, setFocusedStation] = useState<{
    id: string;
    kind: string;
  } | null>(null);

  const config = WORLD_CONFIGS[world];
  const contentWorld = world === 'data' ? 'data' : 'cloud';

  // Content-driven station list for the DOM index. Resolved from the content
  // model, never hardcoded, so the index can never drift from the world.
  const skills = skillsForWorld(contentWorld);
  const projects = projectsForWorld(contentWorld);

  const openPanel = useCallback((kind: PanelKind, id: string) => {
    setPanel({ kind, id });
  }, []);

  const closePanel = useCallback(() => {
    setPanel(null);
  }, []);

  /**
   * Tell the scene whenever a panel opens or closes, from EITHER path.
   *
   * The canvas already knows about panels it opened itself; this covers the DOM
   * path (the station index), which the scene cannot see. Without it, opening a
   * skill from the index would leave the player still walking behind the panel.
   */
  useEffect(() => {
    handleRef.current?.setPanelOpen(panel !== null);
  }, [panel]);

  /**
   * Escape closes the panel from the DOM too.
   *
   * The scene also binds Escape, but the panel lives here and focus may be
   * inside it — in which case the canvas key handler still fires, so both paths
   * must agree. Both set `panel` to null, and both are idempotent, so a double
   * close is harmless.
   */
  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, closePanel]);

  /**
   * Stop Phaser from swallowing Enter and Space before the DOM sees them.
   *
   * THE BUG THIS FIXES
   *
   * Phaser's keyboard plugin calls `preventDefault()` on the keys it processes.
   * Verified in the browser with listeners at four phases: with a station index
   * button focused, a keydown of Enter arrives at `window` in the CAPTURE phase
   * with `defaultPrevented === false`, and only becomes `true` by the time it
   * reaches `window` in the BUBBLE phase — i.e. after Phaser has handled it. The
   * browser therefore never synthesises the button's activation click and the
   * panel never opens from the keyboard. Space was the same, because the scene
   * binds Space for jumping. A mouse click worked, which is exactly the shape of
   * a keyboard-accessibility bug that survives casual testing: everything looks
   * fine until you stop using the mouse.
   *
   * WHY IT MATTERS HERE SPECIFICALLY
   *
   * The DOM mirror is the route to the portfolio for anyone who cannot use the
   * canvas. If Enter is neutralised while the world is mounted, that route is
   * closed for exactly the visitors it exists for. This effect replays the
   * activation the browser withheld, without asking Phaser to give up any key.
   *
   * WHY THE BUBBLE PHASE ON `window`
   *
   * The fix has to run after Phaser has consumed the event, and Phaser listens on
   * `window` in the bubble phase. So this listener is on `window` in the bubble
   * phase too, registered AFTER the engine mounted (which is why `status` is a
   * dependency) — later-registered listeners on the same node and phase run after
   * earlier ones, so this one sees `defaultPrevented === true`. A capture-phase
   * listener cannot work: it necessarily runs first and always observes `false`.
   *
   * It stays narrow: it acts only when a real interactive element holds focus, so
   * typing in a form field elsewhere on the page is untouched.
   */
  useEffect(() => {
    if (status !== 'ready') return;

    const INTERACTIVE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      // Only intervene when Phaser actually consumed the event.
      if (!event.defaultPrevented) return;

      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return;
      if (!active.matches(INTERACTIVE)) return;

      /*
       * The panel's Close buttons are NOT skipped.
       *
       * An earlier version returned early for them, on the reasoning that the
       * browser's default action for Enter on a focused button fires a click by
       * itself. That is true in isolation but false here: reaching this handler at
       * all means Phaser's keyboard plugin already called `preventDefault()` on the
       * key, which suppresses the browser's own activation. So the skip left Close
       * focusable and visible but inert to the keyboard -- the button could be
       * reached by Tab, highlighted, and pressing Enter did nothing. Measured, not
       * assumed: focus landed on `BUTTON.info-panel__close` and the panel stayed
       * open.
       *
       * Replaying `click()` fixes it, and Close is idempotent so the worst case
       * from a double activation is a redundant state set.
       */

      // Replay the activation the browser withheld. `click()` on a focused button
      // or link is exactly the default action the key would have produced.
      active.click();
    };

    /*
     * THE ENTRY PLATE'S OWN KEYS.
     *
     * Capture phase on `window`, handled before anything else, because when the
     * plate is up it is the only interactive thing on screen and Enter must
     * dismiss it rather than reaching Phaser. Escape is accepted for the same
     * reason — a plate you can only dismiss one way is a gate, and this is not
     * a gate.
     *
     * THE STALE-CLOSURE BUG THIS FIXES — and it is why Enter never reached
     * Phaser at all.
     *
     * `entryDismissed` used to be read straight from this effect's closure. The
     * effect depends only on `status`, which never changes once the world is
     * mounted, so the closure was created once with `entryDismissed === false`
     * and kept that value for the lifetime of the world. React hid the plate by
     * re-rendering, but this listener still believed the plate was up and kept
     * calling `event.preventDefault()` on every Enter.
     *
     * That is why the diagnosis looked so strange from inside Phaser: Enter
     * arrived at `window` in the CAPTURE phase already carrying
     * `defaultPrevented === true`, before Phaser's `KeyboardManager` (which
     * listens in the BUBBLE phase) could see it. Phaser discards
     * already-prevented events, so `keyEnter.isDown` stayed false permanently,
     * and Escape with it.
     *
     * Measured at document capture — which runs before this listener — Enter was
     * already `prevented: true` while ArrowRight was `false`.
     *
     * A ref, not `entryDismissed` in the dependency array: the listener must read
     * the CURRENT value synchronously at event time, and re-registering on every
     * dismissal would churn the listener mid-interaction.
     */
    const onEntryKey = (event: KeyboardEvent) => {
      if (entryDismissedRef.current) return;
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        entryDismissedRef.current = true;
        setEntryDismissed(true);
      }
    };

    window.addEventListener('keydown', onEntryKey, true);
    window.addEventListener('keydown', onKeyDown, false);
    return () => {
      window.removeEventListener('keydown', onEntryKey, true);
      window.removeEventListener('keydown', onKeyDown, false);
    };
  }, [status]);

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
          /*
           * `world-interaction` records what the PLAYER touched — proximity,
           * activation, and the Phase 1 probe. `chapter` is deliberately excluded.
           *
           * The Phase 1 suite asserts that this region reads exactly "No
           * interactions yet." when the world becomes ready. The scene announces
           * the starting chapter during `create()`, so routing chapter events here
           * too made that assertion fail on a world where nothing had been
           * touched. Chapter state has its own live region (`world-chapter`), which
           * is where "where am I" belongs — this one answers "what did I just do".
           */
          if (event.kind !== 'chapter') {
            setLastInteraction(`${event.id} @ ${event.world}`);
          }

          if (event.kind === 'chapter') {
            const next = event.payload?.chapter;
            if (typeof next === 'string') setChapter(next);
            return;
          }

          if (event.kind === 'proximity') {
            setFocusedStation({ id: event.id, kind: String(event.payload?.stationKind ?? '') });
            return;
          }

          if (event.kind === 'activate') {
            const kind = event.payload?.stationKind;
            if (kind === 'skill' || kind === 'project') openPanel(kind, event.id);
            return;
          }

          if (event.kind === 'close') {
            closePanel();
          }
        });

        unmountGame = () => {
          unsubscribe();
          handleRef.current = null;
          handle.unmount();
        };

        // Publish the handle BEFORE `setStatus('ready')` so the panel effect can
        // reach it on the same commit the world becomes visible.
        handleRef.current = handle;

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
  }, [world, openPanel, closePanel]);

  const handleExit = useCallback(() => onExit(), [onExit]);

  /**
   * The record a station id resolves to, for the mirror's accessible label.
   * Falls back to the id so a missing record degrades to something addressable
   * rather than an empty label.
   */
  const labelFor = (kind: PanelKind, id: string): string => {
    const record = kind === 'skill' ? PORTFOLIO.skills[id] : PORTFOLIO.projects[id];
    if (!record) return id;
    return 'summary' in record ? record.name : record.title;
  };

  /*
   * The root is a FRAGMENT, not a wrapper element, and that is load-bearing.
   *
   * `.placeholder-world` is a Phase 1 contract: its `h1`, its single exit button
   * (addressed as `.placeholder-world button`) and `.world-a11y` all live inside
   * it, and App.css styles `.placeholder-world button` as the exit control. The
   * station index is ten more buttons, so putting them inside that container would
   * both break the Phase 1 selector (which resolves to 11 elements) and restyle
   * them all as exit buttons.
   *
   * Rendering the index as a SIBLING of `.placeholder-world` keeps that container
   * exactly as it was, and the index inherits nothing it does not ask for.
   */
  return (
    <>
      <div className="placeholder-world" data-theme="dark" data-world={world}>
        <h1>{config.name}</h1>

        {/* The canvas container. Phaser appends its canvas here and removes it on
            unmount; the container itself is React-owned and always empty of the
            canvas itself. The panel is rendered here so it overlays the game. */}
        <div
          ref={containerRef}
          className="world-canvas"
          data-testid="world-canvas"
          data-status={status}
        >
          {panel && <InfoPanel kind={panel.kind} id={panel.id} onClose={closePanel} />}
        </div>

        {/*
          THE EXIT CONTROL.
 *
          Requirement: an always-discoverable way back to the normal portfolio,
          not hidden inside a gameplay interaction. It is a real `<button>` with an
          explicit test id, so a test meaning "the exit control" never has to guess
          among every button in `.placeholder-world`.

          Positioned top-LEFT by CSS, mirroring the contents toggle at top-right, so
          the two persistent shell controls sit in opposite corners and neither can
          be mistaken for the other. It was previously an unstyled flow button that
          rendered wherever the flex layout put it — measured below the canvas, which
          is not "always discoverable".
        */}
        <button
          type="button"
          className="world-exit"
          onClick={handleExit}
          data-testid="world-exit"
        >
          Back to portfolio
          <span className="visually-hidden"> — leave the Data World and return to the site</span>
        </button>

        {/*
          Accessibility mirror. The canvas is NOT the only way to reach the
          portfolio: this semantic region states the world, the controls, and the
          live interaction state, and it is readable by keyboard and screen
          readers without entering the game.

          The control list below is the Phase 1 one, unchanged: three rows and seven
          `<kbd>` elements. Phase 2's own controls are documented in the separate
          `.world-index` region so this section's assertions cannot be disturbed.
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

      {/*
        Phase 2: the station index.

        A real list of real buttons, one per content-model record, each opening
        the same panel the canvas opens. This is the accessibility requirement
        done properly — not a description of the interaction, but the interaction
        itself, reachable by Tab and Enter with no canvas and no game state.
      */}
      {/*
        * THE ENTRY PLATE.
        *
        * A compact statement of where the visitor is and what the controls are,
        * rather than a "click to start" curtain. It is `role="dialog"` with a
        * label so it is announced, it is dismissible by Enter (handled in the
        * global key handler below), by Escape, by click, and by its own button --
        * so it can never trap anyone. Once dismissed it unmounts entirely rather
        * than hiding, so it cannot be reached again by Tab.
        */}
      {!entryDismissed && (
        <div
          className="world-entry"
          data-testid="world-entry"
          role="dialog"
          aria-modal="false"
          aria-label="Enter the Data World"
          onClick={() => {
            // The ref must move with the state, or the window keydown listener
            // keeps preventDefault-ing Enter on a plate that is already gone.
            entryDismissedRef.current = true;
            setEntryDismissed(true);
          }}
        >
          <div className="world-entry__card">
            <p className="world-entry__kicker">Portfolio</p>
            <h2 className="world-entry__title">{config.name}</h2>
            <p className="world-entry__body">
              Walk right to the pipe to travel to Skills, then on to Projects. Every
              skill and project can also be opened without playing.
            </p>
            <ul className="world-entry__hint">
              <li>
                <kbd>&larr;</kbd> <kbd>&rarr;</kbd> move
              </li>
              <li>
                <kbd>Space</kbd> jump
              </li>
              <li>
                <kbd>Enter</kbd> open station
              </li>
              <li>
                <kbd>Esc</kbd> close
              </li>
            </ul>
            <button
              type="button"
              className="world-entry__dismiss"
              data-testid="world-entry-dismiss"
              onClick={(event) => {
                // Stop the click reaching the backdrop's own dismiss handler, so
                // the button is a real control rather than a redundant one.
                event.stopPropagation();
                entryDismissedRef.current = true;
                setEntryDismissed(true);
              }}
            >
              Enter the world
            </button>
          </div>
        </div>
      )}

      {/* Opens the contents drawer over the stage. */}
      <button
        type="button"
        className="world-index-toggle"
        data-testid="world-index-toggle"
        aria-expanded={drawerOpen}
        aria-controls="world-index-drawer"
        onClick={() => setDrawerOpen((open) => !open)}
      >
        {drawerOpen ? 'Close contents' : 'Contents'}
      </button>

      <section
        id="world-index-drawer"
        className="world-index"
        data-open={drawerOpen ? 'true' : 'false'}
        aria-label={`${config.name} contents`}
        /*
         * `aria-hidden` while closed. No `inert` is needed as well: the closed state
         * is `display: none`, which already removes the drawer from the tab order
         * entirely, so there are no invisible focus stops below the game. Adding
         * `inert` too would be belt-and-braces on top of that, at the cost of a
         * React typing wart for no behavioural gain.
         */
        aria-hidden={drawerOpen ? undefined : 'true'}
      >
        <h2>Contents</h2>

        <div className="world-index__group">
          <h3>Skills</h3>
          <ul>
            {skills.map((skill) => (
              <li key={skill.id}>
                <button
                  type="button"
                  data-testid={`index-skill-${skill.id}`}
                  data-station-kind="skill"
                  onClick={() => openPanel('skill', skill.id)}
                  aria-current={focusedStation?.id === skill.id ? 'true' : undefined}
                >
                  {skill.name}
                </button>
                <span className="world-index__summary">{skill.summary}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="world-index__group">
          <h3>Projects</h3>
          <ul>
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  data-testid={`index-project-${project.id}`}
                  data-station-kind="project"
                  onClick={() => openPanel('project', project.id)}
                  aria-current={focusedStation?.id === project.id ? 'true' : undefined}
                >
                  {project.title}
                </button>
                <span className="world-index__summary">{project.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="world-index__controls">
          <dt>Interact with a station</dt>
          <dd>
            Walk near one in the world, then press <kbd>Enter</kbd>
          </dd>
          <dt>Close a panel</dt>
          <dd>
            Press <kbd>Escape</kbd> or activate the Back button
          </dd>
        </dl>

        {/*
          Chapter tracking, announced politely. The canvas tells React which
          chapter the pipe delivered the player to, so this text and the world
          never disagree.
        */}
        <p data-testid="world-chapter" aria-live="polite" className="world-index__chapter">
          {chapter ? `Chapter: ${chapter}` : 'Chapter: starting cliff'}
        </p>

        {focusedStation && (
          <p data-testid="world-nearby" aria-live="polite" className="world-index__nearby">
            {`Nearest station: ${labelFor(
              focusedStation.kind === 'project' ? 'project' : 'skill',
              focusedStation.id
            )}. Press Enter to open it.`}
          </p>
        )}
      </section>
    </>
  );
};

export default WorldShell;