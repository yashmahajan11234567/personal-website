/** Cloud World 2.0 — TouchControls (virtual stick + action buttons) */

import { useEffect, useRef, useState } from 'react';
import { input } from '../player/state';
import '../styles/cloudWorld2.css';

const DEAD_ZONE = 0.12;
const STICK_RADIUS = 60; // visual radius

export function TouchControls() {
  const knobRef = useRef<HTMLDivElement>(null);
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const [touchId, setTouchId] = useState<number | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Only mount on coarse pointer devices
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    if (!mql.matches) return;
    // No cleanup needed for matchMedia listener in this pattern
  }, []);

  const clampStick = (dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy);
    if (dist <= STICK_RADIUS) return { x: dx, y: dy };
    const ratio = STICK_RADIUS / dist;
    return { x: dx * ratio, y: dy * ratio };
  };

  const applyDeadZone = (v: number) => (Math.abs(v) < DEAD_ZONE ? 0 : v);

  const updateInput = (dx: number, dy: number) => {
    const clamped = clampStick(dx, dy);
    const normX = clamped.x / STICK_RADIUS;
    const normY = clamped.y / STICK_RADIUS;
    input.x = applyDeadZone(normX);
    input.z = applyDeadZone(-normY); // screen Y down → world -Z
    input.active = input.x !== 0 || input.z !== 0;
  };

  const handleStart = (e: TouchEvent | PointerEvent) => {
    if (touchId !== null) return; // only first touch
    const touch = 'touches' in e ? e.touches[0] : e;
    const rect = stickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tid = 'identifier' in touch ? touch.identifier : (touch as PointerEvent).pointerId;
    setTouchId(tid);

    startPos.current = {
      x: touch.clientX - rect.left - STICK_RADIUS,
      y: touch.clientY - rect.top - STICK_RADIUS,
    };

    // Capture pointer for smooth drag
    stickBaseRef.current?.setPointerCapture?.(tid);
    e.preventDefault();
  };

  const handleMove = (e: TouchEvent | PointerEvent) => {
    if (touchId === null) return;
    const touch = 'touches' in e
      ? Array.from(e.touches).find((t) => t.identifier === touchId)
      : (touchId === (e as PointerEvent).pointerId ? e : null);
    if (!touch) return;

    const rect = stickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dx = touch.clientX - rect.left - STICK_RADIUS - startPos.current.x;
    const dy = touch.clientY - rect.top - STICK_RADIUS - startPos.current.y;

    updateInput(dx, dy);

    // Move knob visually
    const clamped = clampStick(dx, dy);
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
    }
    e.preventDefault();
  };

  const handleEnd = (e: TouchEvent | PointerEvent) => {
    if (touchId === null) return;
    const touch = 'changedTouches' in e
      ? Array.from(e.changedTouches).find((t) => t.identifier === touchId)
      : (touchId === (e as PointerEvent).pointerId ? e : null);
    if (!touch) return;

    setTouchId(null);
    input.x = 0;
    input.z = 0;
    input.active = false;

    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0, 0)';
    }
    stickBaseRef.current?.releasePointerCapture?.(touchId);
  };

  const bindEvents = (el: HTMLElement | null) => {
    if (!el) return;
    el.addEventListener('pointerdown', handleStart as any);
    window.addEventListener('pointermove', handleMove as any);
    window.addEventListener('pointerup', handleEnd as any);
    window.addEventListener('pointercancel', handleEnd as any);
    // Touch fallback
    el.addEventListener('touchstart', handleStart as any, { passive: false });
    window.addEventListener('touchmove', handleMove as any, { passive: false });
    window.addEventListener('touchend', handleEnd as any);
    window.addEventListener('touchcancel', handleEnd as any);
  };

  const unbindEvents = (el: HTMLElement | null) => {
    if (!el) return;
    el.removeEventListener('pointerdown', handleStart as any);
    window.removeEventListener('pointermove', handleMove as any);
    window.removeEventListener('pointerup', handleEnd as any);
    window.removeEventListener('pointercancel', handleEnd as any);
    el.removeEventListener('touchstart', handleStart as any);
    window.removeEventListener('touchmove', handleMove as any);
    window.removeEventListener('touchend', handleEnd as any);
    window.removeEventListener('touchcancel', handleEnd as any);
  };

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    if (!mql.matches) return;
    const el = stickBaseRef.current;
    bindEvents(el);
    return () => unbindEvents(el);
  }, []);

  // USE button — dispatch 'e' keydown
  const dispatchUse = () => {
    const ev = new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true });
    window.dispatchEvent(ev);
  };

  // JUMP button — set keys[' '] true for 90ms
  const dispatchJump = () => {
    const ev = new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true });
    window.dispatchEvent(ev);
    setTimeout(() => {
      const up = new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true });
      window.dispatchEvent(up);
    }, 90);
  };

  // RUN toggle
  const [runActive, setRunActive] = useState(false);
  const toggleRun = () => {
    const next = !runActive;
    setRunActive(next);
    input.run = next;
    // Also dispatch shift keydown/keyup for compatibility
    const ev = new KeyboardEvent(next ? 'keydown' : 'keyup', { key: 'Shift', code: 'ShiftLeft', bubbles: true });
    window.dispatchEvent(ev);
  };

  const mql = window.matchMedia('(pointer: coarse)');
  if (!mql.matches) return null;

  return (
    <div className="cw2-touch" aria-hidden="true">
      {/* Left virtual stick */}
      <div
        ref={stickBaseRef}
        className="cw2-touch-stick"
        role="generic"
        aria-label="Move"
      >
        <div className="cw2-touch-stick-base" />
        <div ref={knobRef} className="cw2-touch-stick-knob" />
      </div>

      {/* Right button cluster */}
      <div className="cw2-touch-buttons">
        <button
          className="cw2-touch-btn"
          onTouchStart={(e) => { e.preventDefault(); dispatchUse(); }}
          onClick={dispatchUse}
          aria-label="Interact (E)"
        >
          USE
        </button>
        <button
          className="cw2-touch-btn"
          onTouchStart={(e) => { e.preventDefault(); dispatchJump(); }}
          onClick={dispatchJump}
          aria-label="Jump"
        >
          JUMP
        </button>
        <button
          className={`cw2-touch-btn ${runActive ? 'run-active' : ''}`}
          onTouchStart={(e) => { e.preventDefault(); toggleRun(); }}
          onClick={toggleRun}
          aria-label={runActive ? 'Stop running' : 'Run'}
          aria-pressed={runActive}
        >
          RUN
        </button>
      </div>
    </div>
  );
}