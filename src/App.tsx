import { Suspense, lazy, useCallback, useEffect } from 'react';
import { CinematicHero } from './components/Hero';
import { WorldShell } from './components/WorldShell';
import { destroyActiveTimeline } from './cinematic/timeline/activeTimeline';
import { useGameStore } from './store/gameStore';
import type { Path } from './store/gameStore';
import './App.css';

/*
 * Cloud World is code-split (audit 2026-10-16, K3). three.js + R3F weigh
 * ~1.4 MB minified and the hero must not pay for them: `lazy()` moves the
 * whole stack into a chunk that loads only when the route mounts — the same
 * on-demand strategy WorldShell already uses for Phaser. While the chunk
 * loads, the Suspense fallback paints the app background (no flash of a
 * wrong color behind the unmounting hero).
 */
const CloudWorld3D = lazy(() =>
  import('./cloud-world-3d').then((m) => ({ default: m.CloudWorld3D })),
);

const HASH_WORLDS = {
  '#/data-world': 'data-world',
  '#/cloud-world': 'cloud-world',
} as const;

type HashWorld = (typeof HASH_WORLDS)[keyof typeof HASH_WORLDS];

function worldForHash(hash: string): HashWorld | 'hero' {
  return HASH_WORLDS[hash as keyof typeof HASH_WORLDS] ?? 'hero';
}

/*
 * In-page anchors (K1, audit 2026-10-16). The skip link and other `#foo`
 * anchors are NOT routes: navigating to one must never unmount the current
 * world. Before this guard, activating the skip link inside either world
 * wrote `#main`, `worldForHash` resolved it to 'hero', and `applyHash`
 * called `reset()` — ejecting the user from the world they were reading.
 * Only an EMPTY hash means "leave the world and return to the hero".
 */
function isInPageAnchor(hash: string): boolean {
  return hash !== '' && !hash.startsWith('#/');
}

function App() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const setCurrentWorld = useGameStore((s) => s.setCurrentWorld);
  const reset = useGameStore((s) => s.reset);

  const applyHash = useCallback(
    (hash: string) => {
      // In-page anchors (#main etc.) are not routes: keep the current world
      // mounted and let the browser's own scroll-to-anchor do its work.
      if (isInPageAnchor(hash)) return;
      const next = worldForHash(hash);
      if (next === 'hero') {
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
    const onHashChange = () => applyHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [applyHash]);

  if (currentWorld !== 'hero') {
    destroyActiveTimeline();
  }

  const syncUrl = (hash: string) => {
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  const handleWorldSelected = (path: Path) => {
    destroyActiveTimeline();
    if (path === 'data') {
      setCurrentWorld('data-world');
      syncUrl('#/data-world');
    } else if (path === 'cloud') {
      setCurrentWorld('cloud-world');
      syncUrl('#/cloud-world');
    }
  };

  const returnToHero = () => {
    destroyActiveTimeline();
    reset();
    syncUrl('');
  };

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to main content</a>
      <main id="main">
        {currentWorld === 'hero' && <CinematicHero onWorldSelected={handleWorldSelected} />}
        {currentWorld === 'data-world' && (
          <WorldShell key="data-world" world="data" onExit={returnToHero} />
        )}
        {currentWorld === 'cloud-world' && (
          <Suspense
            fallback={<div className="cloud-world-loading" aria-hidden="true" />}
          >
            <CloudWorld3D key="cloud-world" onExit={returnToHero} />
          </Suspense>
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
