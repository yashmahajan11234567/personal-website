import { useCallback, useEffect } from 'react';
import { CinematicHero } from './components/Hero';
import { destroyActiveTimeline } from './cinematic/timeline/activeTimeline';
import { useGameStore } from './store/gameStore';
import type { Path } from './store/gameStore';
import './App.css';

/** Every world this app can address with a URL. */
const HASH_WORLDS = {
  '#/data-world': 'data-world',
  '#/cloud-world': 'cloud-world',
} as const;

type HashWorld = (typeof HASH_WORLDS)[keyof typeof HASH_WORLDS];

function worldForHash(hash: string): HashWorld | 'hero' {
  return HASH_WORLDS[hash as keyof typeof HASH_WORLDS] ?? 'hero';
}

function App() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const setCurrentWorld = useGameStore((s) => s.setCurrentWorld);
  const reset = useGameStore((s) => s.reset);

  /**
   * Keep state and URL in step, in BOTH directions.
   *
   * This used to read `location.hash` once on mount, so only a fresh load
   * resolved a deep link. Everything after that was one-way: entering a world
   * pushed a hash, but nothing listened for it to change again. Pressing the
   * browser Back button therefore cleared the hash while the world stayed
   * mounted — a recruiter who shared #/data-world and hit Back was trapped.
   *
   * Two separate concerns, deliberately not merged:
   *
   *   - `applyHash` is the ONLY place the hash is read. It runs on mount (deep
   *     link) and on every hashchange (back, forward, manual edit).
   *   - `syncUrl` is the ONLY place the hash is written, and it is skipped when
   *     the hash already says what we want. That guard is what stops the two
   *     from looping: without it, the hashchange listener would fire on our own
   *     write and re-enter the world we just left.
   *
   * Leaving a world must also tear down the pinned ScrollTrigger first, and it
   * must happen while the hero's DOM is still mounted (see the render-phase
   * call below) or ScrollTrigger removes its pin-spacer after React has already
   * deleted it, which throws and unmounts the app.
   */
  const applyHash = useCallback(
    (hash: string) => {
      const next = worldForHash(hash);
      if (next === 'hero') {
        // Only reset when there is actually a world to leave. A hashchange
        // that fires while the hero is already up must not disturb scroll
        // position or the cinematic's own state.
        if (useGameStore.getState().currentWorld !== 'hero') reset();
        return;
      }
      if (useGameStore.getState().currentWorld === next) return;
      destroyActiveTimeline();
      setCurrentWorld(next);
    },
    [reset, setCurrentWorld],
  );

  useEffect(() => {
    applyHash(window.location.hash);
    // One named reference, not two inline arrows: removeEventListener only
    // removes the exact function passed to addEventListener, so an arrow
    // written twice would leave the listener attached for the app's lifetime.
    const onHashChange = () => applyHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyHash]);

  /**
   * Leaving the hero for ANY reason — selection, deep link, back button — must
   * kill the pinned ScrollTrigger before React deletes the hero's DOM.
   * ScrollTrigger owns a pin-spacer that React does not know about; if React
   * removes the hero first it calls removeChild on a node that is already
   * detached, which throws and unmounts the entire app.
   *
   * This MUST happen during the render phase, not in an effect. React commits
   * the deletion (commitDeletionEffectsOnFiber -> removeChild) before any
   * effect cleanup runs, so an effect is already too late by the time it fires.
   * Doing it here means the trigger is dead before React starts removing nodes.
   *
   * destroy() is idempotent — it guards on its own `destroyed` flag — so running
   * it on every render of a non-hero world is safe.
   */
  if (currentWorld !== 'hero') {
    destroyActiveTimeline();
  }

  /**
   * The one place the URL is written.
   *
   * The `if` is what keeps the two directions from fighting: `applyHash`
   * listens for `hashchange`, and assigning `location.hash` fires it. Without
   * this guard, returning to the hero would write an empty hash, the listener
   * would see it, and since the hero is already mounted it would do nothing —
   * but the same write during a world change would re-enter the world the user
   * just backed out of. Only write when the URL disagrees with the target.
   *
   * Assigning the same value is also what creates a history entry, so the guard
   * is what makes Back step through real navigation rather than no-op entries.
   */
  const syncUrl = (hash: string) => {
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  /**
   * World selection (Task 8).
   *
   * This now fires at the END of the handoff transition, not on the click —
   * CinematicHero holds itself on screen while it resolves into the chosen
   * world, then calls this once. So the hash is only written when the world is
   * genuinely mounted, which keeps the URL honest about what is on screen.
   */
  const handleWorldSelected = (path: Path) => {
    // Belt and braces alongside the effect below: the effect covers worlds that
    // change without going through here, but this guarantees the trigger is
    // already dead by the time this state change is rendered.
    destroyActiveTimeline();
    setCurrentWorld(path === 'data' ? 'data-world' : 'cloud-world');
    syncUrl(`#/${path}-world`);
  };

  const returnToHero = () => {
    destroyActiveTimeline();
    reset();
    syncUrl('');
  };

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <main id="main">
        {currentWorld === 'hero' && <CinematicHero onWorldSelected={handleWorldSelected} />}
        
        {currentWorld === 'data-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Data World — Phase 2</h1>
            <button type="button" onClick={returnToHero}>
              Back to Hero
            </button>
          </div>
        )}

        {currentWorld === 'cloud-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Cloud World — Phase 2</h1>
            <button type="button" onClick={returnToHero}>
              Back to Hero
            </button>
          </div>
        )}

        {currentWorld === 'experience' && (
          <div className="placeholder-world">
            <h1>Experience Section — Phase 5</h1>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
