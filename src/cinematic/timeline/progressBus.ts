/**
 * rAF-coalesced progress bus.
 *
 * Scroll progress must NOT enter React state. The current build calls
 * setScrollProgress on every scroll tick, re-rendering the component tree at
 * input rate -- the main performance defect of the superseded implementation.
 *
 * Instead ScrollTrigger's onUpdate writes the raw value here; subscribers are
 * notified at most once per animation frame, no matter how many scroll events
 * fire. Reads are synchronous against the latest value, so layers can sample
 * progress from their own tween callbacks without waiting a frame.
 */

import { useEffect, useRef } from 'react';
import type { CinematicPhase } from './beats';
import { clamp01, phaseAt } from './beats';

export interface ProgressSnapshot {
  progress: number;
  phase: CinematicPhase;
}

type Listener = (snapshot: ProgressSnapshot) => void;

class ProgressBus {
  private value = 0;
  private phase: CinematicPhase = 'ignition';
  private listeners = new Set<Listener>();
  private frame: number | null = null;
  /** Diagnostics: how many raw writes arrived since the last frame flush. */
  private pendingWrites = 0;

  /** Called from ScrollTrigger.onUpdate. Never triggers React work. */
  write(progress: number): void {
    const next = clamp01(progress);
    if (next === this.value) return;
    this.value = next;
    this.phase = phaseAt(next);
    this.pendingWrites += 1;
    this.schedule();
  }

  get(): number {
    return this.value;
  }

  getPhase(): CinematicPhase {
    return this.phase;
  }

  /** Snapshot count of raw writes coalesced into the last flush. */
  getPendingWrites(): number {
    return this.pendingWrites;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Force an immediate flush. Used when a layer mounts mid-scrub. */
  flush(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    this.emit();
  }

  private schedule(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.emit();
    });
  }

  private emit(): void {
    this.pendingWrites = 0;
    const snapshot: ProgressSnapshot = { progress: this.value, phase: this.phase };
    for (const listener of this.listeners) listener(snapshot);
  }
}

export const progressBus = new ProgressBus();

/**
 * Subscribe to progress changes outside React's render cycle.
 * The returned callback fires at most once per animation frame.
 */
export function useProgressBus(listener: (snapshot: ProgressSnapshot) => void): void {
  const ref = useRef(listener);
  ref.current = listener;

  useEffect(() => {
    const unsubscribe = progressBus.subscribe((snapshot) => ref.current(snapshot));
    return unsubscribe;
  }, []);
}

/** Read the latest progress without subscribing. Safe inside tween callbacks. */
export function readProgress(): number {
  return progressBus.get();
}

export function readPhase(): CinematicPhase {
  return progressBus.getPhase();
}
