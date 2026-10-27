import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { CinematicHero } from './components/Hero';
import { WorldShell } from './components/WorldShell';
import { destroyActiveTimeline } from './cinematic/timeline/activeTimeline';
import { useGameStore } from './store/gameStore';
import type { Path } from './store/gameStore';
import './App.css';
import { LoadingScreen } from './components/LoadingScreen';

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
  const isLoading = useGameStore((s) => s.isLoading);
  const setLoading = useGameStore((s) => s.setLoading);
  const [loadingProgress, setLoadingProgress] = useState(0);

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

  useEffect(() => {
    if (!isLoading) return;
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const minTime = 5000;
    const startedAt = performance.now();
    const controller = new AbortController();
    const tasks: Promise<unknown>[] = [];

    const img = new Image();
    img.src = '/assets/figure-anchor.webp';
    tasks.push(new Promise((resolve) => {
      if (img.complete) return resolve(null);
      img.addEventListener('load', () => resolve(null), { once: true, signal: controller.signal });
      img.addEventListener('error', () => resolve(null), { once: true, signal: controller.signal });
    }));

    if (document.fonts && document.fonts.ready) {
      tasks.push(Promise.race([
        document.fonts.ready.catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]));
    }

    let ready = false;
    let done = false;
    const finish = () => {
      if (done) return;
      const elapsed = performance.now() - startedAt;
      if (!ready) {
        window.setTimeout(finish, 100);
        return;
      }
      const remaining = Math.max(0, minTime - elapsed);
      if (remaining > 0) {
        window.setTimeout(finish, remaining);
        return;
      }
      done = true;
      setLoadingProgress(100);
      window.setTimeout(() => setLoading(false), 150);
    };

    let p = 3;
    setLoadingProgress(3);
    const tick = () => {
      if (done) return;
      if (!ready) {
        p = Math.min(92, p + Math.max(2, (92 - p) * 0.12 + Math.random() * 3));
        setLoadingProgress(Math.round(p));
        if (!done) requestAnimationFrame(tick);
        return;
      }
      p = Math.min(100, p + Math.max(2, (100 - p) * 0.14 + Math.random() * 2));
      setLoadingProgress(Math.round(p));
      if (!done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    Promise.allSettled(tasks).then(() => {
      if (done) return;
      ready = true;
      finish();
    });

    const timeout = window.setTimeout(() => {
      if (done) return;
      ready = true;
      finish();
    }, 8000);

    finish();

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isLoading, setLoading]);

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
        {isLoading ? (
          <LoadingScreen progress={loadingProgress} onComplete={() => {}} />
        ) : currentWorld === 'hero' && <CinematicHero onWorldSelected={handleWorldSelected} />}
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
