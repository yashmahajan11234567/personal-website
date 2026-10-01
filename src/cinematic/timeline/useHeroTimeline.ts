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
import { setActiveTimeline } from './activeTimeline';
import { SELECTION_START, trackHeightVh } from './beats';

gsap.registerPlugin(ScrollTrigger);

/** Scrub smoothing. 0.6 keeps the motion physical without lagging the input. */
const SCRUB = 0.6;

export interface HeroTimelineOptions {
  /** Container the cinematic lives in. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Disabled only after a world is selected. */
  enabled: boolean;
  /**
   * Drop the scrub easing and the pin, but KEEP the scroll-driven timeline.
   *
   * Reduced motion must not skip the cinematic to its final frame. Doing that
   * was the reported defect: the opening PERSONAL/PORTFOLIO state never
   * rendered and the Data/Cloud selection appeared immediately. Here the
   * timeline still tracks the scrollbar 1:1, so progression is identical --
   * there is simply no easing, and no pin to fight with.
   */
  reducedMotion?: boolean;
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
  /**
   * Destroy the trigger outright.
   *
   * MUST be called before the hero unmounts. ScrollTrigger's pin wraps the
   * pinned element in a pin-spacer and mutates that DOM directly; if React
   * unmounts the hero first, ScrollTrigger's cleanup throws
   * "Failed to execute 'removeChild' on 'Node'" and takes the whole tree down.
   */
  destroy: () => void;
  /** Recompute geometry. */
  refresh: () => void;
}

export function useHeroTimeline({
  containerRef,
  enabled,
  reducedMotion = false,
  onReachSelection,
  onLeaveSelection,
}: HeroTimelineOptions): React.RefObject<HeroTimelineHandle> {
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const handleRef = useRef<HeroTimelineHandle>({
    resume: () => {},
    stop: () => {},
    destroy: () => {},
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

    // Declared OUTSIDE the context callback: referencing `context` from inside
    // its own initialiser is a temporal-dead-zone error.
    let unsubscribe: (() => void) | undefined;
    let destroyed = false;

    const context = gsap.context(() => {
      const st = ScrollTrigger.create({
        trigger: container,
        start: 'top top',
        end: () => `+=${window.innerHeight * (trackHeightVh(window.innerWidth) / 100)}`,
        /*
         * Under reduced motion: no pin (the hero uses sticky positioning, which
         * keeps the same scroll range without ScrollTrigger rewriting the box)
         * and no scrub, so progress tracks the scrollbar exactly.
         *
         * `start: 'top top'` still resolves to 0 under sticky, because the
         * track wrapper above provides the full range; what the end value
         * describes is the same document distance as the pinned case.
         */
        pin: !reducedMotion,
        pinSpacing: !reducedMotion,
        anticipatePin: reducedMotion ? 0 : 1,
        scrub: reducedMotion ? true : SCRUB,
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

      unsubscribe = progressBus.subscribe(({ progress }) => {
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
        destroy: () => {
          // Idempotent. React may also run the effect cleanup, which calls
          // context.revert(); killing twice makes ScrollTrigger remove the
          // pin-spacer a second time and throw.
          if (destroyed) return;
          destroyed = true;
          unsubscribe?.();
          context.revert();
          ScrollTrigger.refresh();
        },
        refresh: () => {
          ScrollTrigger.refresh();
        },
      };

      // Register so any world change can tear this down synchronously.
      setActiveTimeline(handleRef.current);
    }, container);

    return () => {
      // destroy() may already have run (the click handler or destroyActiveTimeline
      // tore it down before React got here). Guard so the trigger is reverted
      // exactly once.
      if (destroyed) {
        unsubscribe = undefined;
        setActiveTimeline(null);
        return;
      }
      destroyed = true;
      unsubscribe?.();
      context.revert();
      triggerRef.current = null;
      inSelectionRef.current = false;
      // Backstop: whatever unmounts a pinned hero must not leave a stale
      // handle registered for the next one.
      setActiveTimeline(null);
    };
  }, [containerRef, enabled, reducedMotion]);

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
