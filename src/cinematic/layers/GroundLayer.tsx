/**
 * Ground layer — the white stage the cinematic sits on.
 *
 * The reference is a white-ground monochrome piece. The "camera push" illusion
 * is produced HERE and in the typography, never by moving the figure (D5).
 * Ground scale runs 1.00 -> 1.06 across the scroll.
 */

import { useEffect, useRef } from 'react';
import { useProgressBus, readProgress } from '../timeline/progressBus';
import { BEATS } from '../timeline/beats';
import './GroundLayer.css';

const SCALE_FROM = 1.0;
const SCALE_TO = 1.06;
/** Vertical drift of the falloff centre, in percent of scene height. */
const FALLOFF_FROM = 44;
const FALLOFF_TO = 40;

export function GroundLayer() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (progress: number) => {
      const el = rootRef.current;
      if (!el) return;
      // Camera push spans ignition -> lock. The selection hold is static.
      const span = BEATS[BEATS.length - 1].start;
      const t = span > 0 ? Math.min(1, progress / span) : 0;
      const eased = t * t * (3 - 2 * t); // smoothstep, matches the reference's settle
      const scale = SCALE_FROM + (SCALE_TO - SCALE_FROM) * eased;
      const falloff = FALLOFF_FROM + (FALLOFF_TO - FALLOFF_FROM) * eased;
      el.style.setProperty('--ground-scale', scale.toFixed(4));
      el.style.setProperty('--ground-falloff', falloff.toFixed(2) + '%');
    };

    apply(readProgress());
    return useProgressBus(({ progress }) => apply(progress));
  }, []);

  // Reduced motion (Task 7): hold the locked composition, no drift.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--ground-scale', String(SCALE_TO));
    el.style.setProperty('--ground-falloff', FALLOFF_TO + '%');
  }, []);

  return (
    <div ref={rootRef} className="cinematic-ground" aria-hidden="true">
      <div className="cinematic-ground__field" />
      <div className="cinematic-ground__floor" />
    </div>
  );
}
