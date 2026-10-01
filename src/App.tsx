import { useEffect, useState } from 'react';
import { CinematicHero } from './components/Hero';
import { useGameStore } from './store/gameStore';
import './App.css';

function App() {
  const { 
    currentWorld, 
    setCurrentWorld,
  } = useGameStore();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/data-world') {
      setCurrentWorld('data-world');
    } else if (hash === '#/cloud-world') {
      setCurrentWorld('cloud-world');
    }
  }, [setCurrentWorld]);

  const handleHeroTransitionComplete = (path: 'data' | 'cloud') => {
    console.log('[App] Hero transition complete, entering:', path);
    setCurrentWorld(`${path}-world`);
    window.location.hash = `#/${path}-world`;
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return <div style={{ padding: '2rem', color: 'red' }}>An error occurred. Check console.</div>;
  }

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to main content</a>
      <main id="main" onError={handleError}>
        {currentWorld === 'hero' && (
          <CinematicHero onTransitionComplete={handleHeroTransitionComplete} />
        )}
        
        {currentWorld === 'data-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Data World — Phase 2</h1>
            <button onClick={() => { setCurrentWorld('hero'); window.location.hash = ''; }}>Back to Hero</button>
          </div>
        )}

        {currentWorld === 'cloud-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Cloud World — Phase 2</h1>
            <button onClick={() => { setCurrentWorld('hero'); window.location.hash = ''; }}>Back to Hero</button>
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
