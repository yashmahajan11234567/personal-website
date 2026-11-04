import { useEffect, useRef } from 'react';
import type * as THREE from 'three';

/**
 * Drag-to-rotate for the SELECTED island only.
 *
 * Pointer events + pointer capture on the island group: on down we record
 * {startX, startRot}; on move we set rotation.y = startRot + dx * sensitivity;
 * on up the current rotation simply stays (no reset, no snap, unlimited).
 * A small movement threshold distinguishes a click (select) from a drag.
 * stopPropagation on move prevents the drag from triggering canvas-level
 * handlers. Rotation is applied to an INNER group so it never fights the
 * camera/position tweens on the outer group.
 */
export function useDragRotate(enabled: boolean, innerRef: React.RefObject<THREE.Group | null>) {
  const drag = useRef<{ startX: number; startRot: number; dragging: boolean; moved: boolean }>({
    startX: 0,
    startRot: 0,
    dragging: false,
    moved: false,
  });

  useEffect(() => {
    if (!enabled) return;
    const g = innerRef.current;
    if (!g) return;

    const SENSITIVITY = 0.0085;
    const THRESHOLD = 6; // px before a press counts as a drag

    const onDown = (e: any) => {
      drag.current = { startX: e.clientX, startRot: g.rotation.y, dragging: true, moved: false };
      e.target?.setPointerCapture?.(e.pointerId);
      e.stopPropagation();
    };
    const onMove = (e: any) => {
      if (!drag.current.dragging) return;
      const dx = e.clientX - drag.current.startX;
      if (Math.abs(dx) > THRESHOLD) drag.current.moved = true;
      g.rotation.y = drag.current.startRot + dx * SENSITIVITY;
      e.stopPropagation();
    };
    const onUp = (e: any) => {
      if (!drag.current.dragging) return;
      drag.current.dragging = false;
      e.stopPropagation();
    };

    // R3F attaches these as DOM listeners on the canvas via the group's
    // onPointer* props; here we bind through the object's event system.
    g.addEventListener('pointerdown' as any, onDown as any);
    g.addEventListener('pointermove' as any, onMove as any);
    g.addEventListener('pointerup' as any, onUp as any);
    g.addEventListener('pointercancel' as any, onUp as any);
    return () => {
      g.removeEventListener('pointerdown' as any, onDown as any);
      g.removeEventListener('pointermove' as any, onMove as any);
      g.removeEventListener('pointerup' as any, onUp as any);
      g.removeEventListener('pointercancel' as any, onUp as any);
    };
  }, [enabled, innerRef]);

  /** True if the last pointer interaction was a drag (used to suppress click). */
  return drag;
}
