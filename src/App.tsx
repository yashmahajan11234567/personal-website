import { useEffect } from 'react';
import { CinematicHero } from './components/Hero';
import { destroyActiveTimeline } from './cinematic/timeline/activeTimeline';
import { useGameStore } from './store/gameStore';
import type { Path } from './store/gameStore';
import './App.css';

function App() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const setCurrentWorld = useGameStore((s) => s.setCurrentWorld);
  const reset = useGameStore((s) => s.reset);

  // Deep-link support, retained from the previous implementation.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/data-world') {
      setCurrentWorld('data-world');
    } else if (hash === '#/cloud-world') {
      setCurrentWorld('cloud-world');
    }
  }, [setCurrentWorld]);

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
    window.location.hash = `#/${path}-world`;
  };

  const returnToHero = () => {
    destroyActiveTimeline();
    reset();
    window.location.hash = '';
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
