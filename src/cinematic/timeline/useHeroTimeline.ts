/**
 * The single scroll trigger that owns the cinematic timeline.
 *
 * Design constraints (plan section 17):
 * - ONE ScrollTrigger for the whole cinematic. No per-layer triggers -- that is
 *   what produced the medium swap in the superseded build.
 * - Scroll position IS the timeline. No trigger-then-play.
 * - Progress is written to the progress bus, never to React state.
 * - Full teardown on unmount; refresh-safe on resize and font load.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { progressBus } from './progressBus';
import { SELECTION_START, trackHeightVh } from './beats';

gsap.registerPlugin(ScrollTrigger);

/** Scrub smoothing. 0.6 keeps the motion physical without lagging the input. */
const SCRUB = 0.6;

export interface HeroTimelineOptions {
  /** Container the cinematic lives in. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Disabled for reduced motion (Task 7) and after a world is selected. */
  enabled: boolean;
  /**
   * Called when the cinematic reaches the selection hold (beat S5).
   * Fires once per entry into the beat.
   */
  onReachSelection?: () => void;
  /** Called when the cinematic leaves the selection hold. */
  onLeaveSelection?: () => void;
}

export interface HeroTimelineHandle {
  /** Restore scroll control and re-measure. Used after a cancelled handoff. */
  resume: () => void;
  /** Permanently stop scroll control (world selected). */
  stop: () => void;
  /** Recompute geometry. */
  refresh: () => void;
}

export function useHeroTimeline({
  containerRef,
  enabled,
  onReachSelection,
  onLeaveSelection,
}: HeroTimelineOptions): React.RefObject<HeroTimelineHandle> {
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const handleRef = useRef<HeroTimelineHandle>({
    resume: () => {},
    stop: () => {},
    refresh: () => {},
  });
  const inSelectionRef = useRef(false);
  // Keep callbacks in refs so the effect does not re-subscribe on every render.
  const onReachRef = useRef(onReachSelection);
  const onLeaveRef = useRef(onLeaveSelection);
  onReachRef.current = onReachSelection;
  onLeaveRef.current = onLeaveSelection;

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const context = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: () => `+=${window.innerHeight * (trackHeightVh(window.innerWidth) / 100)}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: SCRUB,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // The only write path for scroll progress. No React setState.
          progressBus.write(self.progress);
        },
        onRefresh: (self) => {
          progressBus.write(self.progress);
        },
      });

      triggerRef.current = st;

      const unsubscribe = progressBus.subscribe(({ progress }) => {
        const nowIn = progress >= SELECTION_START;
        if (nowIn && !inSelectionRef.current) {
          inSelectionRef.current = true;
          onReachRef.current?.();
        } else if (!nowIn && inSelectionRef.current) {
          inSelectionRef.current = false;
          onLeaveRef.current?.();
        }
      });

      handleRef.current = {
        resume: () => {
          st.enable();
          st.refresh();
        },
        stop: () => {
          st.disable(false);
        },
        refresh: () => {
          ScrollTrigger.refresh();
        },
      };

      // Store the unsubscribe for cleanup via a closure variable.
      (context as unknown as { _unsub?: () => void })._unsub = unsubscribe;
    }, container);

    // Cleanup
    return () => {
      const unsub = (context as unknown as { _unsub?: () => void })._unsub;
      unsub?.();
      context.revert();
      triggerRef.current = null;
      inSelectionRef.current = false;
    };
  }, [containerRef, enabled]);

  // Resize + font-load refresh, debounced.
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const onResize = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    // Fonts change text metrics; re-measure once they land.
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [enabled]);

  return handleRef;
}
