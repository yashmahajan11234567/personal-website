import { useEffect, useRef } from 'react';
import './LoadingScreen.css';

export interface LoadingScreenProps {
  progress: number;
  onComplete: () => void;
}

/** Total frames / cells in the sprite sheet. */
const FRAME_COUNT = 16;

/** ms per frame (~2.4s per full turn). Driven by CSS steps, not React state. */
const FRAME_MS = 150;

export function LoadingScreen({ progress, onComplete }: LoadingScreenProps) {
  const filled = Math.max(0, Math.min(16, Math.round((progress / 100) * 16)));

  const rafRef = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion: freeze on first frame, no animation loop at all.
    if (reduced) return;

    const start = performance.now();

    const step = () => {
      // Compute the active frame purely from time, updating a CSS variable.
      // This avoids React state updates every ~150ms and keeps one stable loop.
      const frame = Math.floor((performance.now() - start) / FRAME_MS) % FRAME_COUNT;
      document.documentElement.style.setProperty('--loading-voxel-frame', String(frame));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      onComplete();
    }
  }, [progress, onComplete]);

  return (
    <div className="loading-screen" data-testid="loading-screen">
      <div className="loading-screen__bg" aria-hidden="true" />
      <div className="loading-screen__grain" aria-hidden="true" />
      <div className="loading-screen__scanlines" aria-hidden="true" />

      <div className="loading-screen__voxel-wrap" aria-hidden="true">
        <div className="loading-screen__ring loading-screen__ring--outer" />
        <div className="loading-screen__ring loading-screen__ring--inner" />
        <div className="loading-screen__voxel-sprite" />
      </div>

      <h1 className="loading-screen__heading">INITIALIZING PORTFOLIO</h1>

      <div className="loading-screen__segments" aria-label="Loading progress">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className={`loading-screen__segment${i < filled ? ' loading-screen__segment--filled' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="loading-screen__bar-wrap">
        <div className="loading-screen__bar">
          <div className="loading-screen__bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="loading-screen__pct">{progress}%</span>
      </div>
      <p className="loading-screen__status">LOADING WORLDS...</p>

      <div className="loading-screen__sr" aria-live="polite" aria-atomic="true">
        Initializing portfolio. {progress}% loaded.
      </div>
    </div>
  );
}
