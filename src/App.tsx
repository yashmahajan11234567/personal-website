import { useEffect } from 'react';
import { CinematicHero } from './components/Hero';
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
   * World selection. Task 8 replaces this with the restrained handoff
   * transition; until then the world mounts directly so the path through the
   * cinematic can be verified end to end.
   */
  const handleWorldSelected = (path: Path) => {
    setCurrentWorld(path === 'data' ? 'data-world' : 'cloud-world');
    window.location.hash = `#/${path}-world`;
  };

  const returnToHero = () => {
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
