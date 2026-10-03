/**
 * Accent glow layer — world identity by hover, nothing else (D4).
 *
 * The scene is MONOCHROME at rest. Hovering or focusing a world board produces
 * a restrained atmospheric wash behind that side of the scene:
 *   Data  -> light blue
 *   Cloud -> light orange
 * Removing hover returns the scene to full monochrome.
 *
 * Constraints from the decision:
 * - NOT a coloured card, NOT a large gradient panel, NOT a border tint.
 * - Sits BEHIND the plates and the figure, so the figure never takes a cast.
 * - Decorative only: it carries no information, so it cannot create a contrast
 *   regression. Board text is measured against the monochrome ground.
 * - ONLY ACTIVE DURING SELECTION PHASE: no atmosphere during PERSONAL/PORTFOLIO phase.
 * - FULL VIEWPORT ATMOSPHERE: covers the entire cinematic environment, not local to text.
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import './AccentGlowLayer.css';

export function AccentGlowLayer() {
  const dataRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLDivElement>(null);
  const active = useGameStore(
    (s) => s.hoveredBoard ?? s.focusedBoard ?? s.selectedPath
  );
  const cinematicPhase = useGameStore((s) => s.cinematicPhase);
  const isHandoff = useGameStore((s) => s.isHandoff);

  // Gate: atmosphere only during selection phase
  const inSelectionPhase = cinematicPhase === 'selection';

  useEffect(() => {
    const apply = () => {
      if (!inSelectionPhase) {
        // Force monochrome outside selection phase
        if (dataRef.current) {
          dataRef.current.style.setProperty('--glow-alpha', '0');
        }
        if (cloudRef.current) {
          cloudRef.current.style.setProperty('--glow-alpha', '0');
        }
        return;
      }
      
      if (dataRef.current) {
        dataRef.current.style.setProperty(
          '--glow-alpha',
          active === 'data' ? '1' : '0'
        );
      }
      if (cloudRef.current) {
        cloudRef.current.style.setProperty(
          '--glow-alpha',
          active === 'cloud' ? '1' : '0'
        );
      }
    };
    apply();
  }, [active, inSelectionPhase]);

  /**
   * During the handoff the selected world's accent blooms. The [data-intensifying]
   * hook is a plain attribute rather than a CSS transition on --glow-alpha,
   * because AccentGlowLayer writes --glow-alpha imperatively and a transition on
   * it would fight that write.
   */
  return (
    <div
      className="cinematic-glow"
      aria-hidden="true"
      data-active={active ?? 'none'}
      data-intensifying={isHandoff || undefined}
      data-phase={inSelectionPhase ? 'selection' : 'other'}
    >
      <div ref={dataRef} className="cinematic-glow__wash cinematic-glow__wash--data" />
      <div ref={cloudRef} className="cinematic-glow__wash cinematic-glow__wash--cloud" />
    </div>
  );
}
