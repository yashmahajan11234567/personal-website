/**
 * HTML interface — rendered OUTSIDE the WebGL canvas (brief 08).
 *
 * Everything here is ordinary React and DOM: real buttons, real focus, real
 * scrolling, real text selection. Nothing about reading the portfolio depends on
 * being able to drive a 3D scene, which is what makes the world usable on a
 * phone, with a keyboard, or with a screen reader.
 *
 * It is styled from the same palette as the blocks, so the interface reads as
 * part of the world rather than a dashboard laid over it.
 */
import { useEffect, useRef, useState } from 'react';
import { PANELS, PANEL_ORDER, type PanelDef } from './panels';
import { hotspot, useInteraction } from './interactionStore';
import { pilot, input, view } from './state';
import { islandAt } from './terrain';

/* ------------------------------------------------------------------ */
/* Location                                                            */
/* ------------------------------------------------------------------ */

function useLocationLabel(): string {
  const [label, setLabel] = useState('Starting Island');
  useEffect(() => {
    let id = 0;
    const tick = () => {
      if (pilot.mode === 'boat') {
        setLabel('At sea — Docker Whale');
      } else {
        const island = islandAt(pilot.pos.x, pilot.pos.z);
        setLabel(island ? island.label : 'At sea');
      }
      id = window.setTimeout(tick, 400);
    };
    tick();
    return () => window.clearTimeout(id);
  }, []);
  return label;
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

export function HUD({ onExit }: { onExit: () => void }) {
  const [help, setHelp] = useState(false);
  const location = useLocationLabel();

  return (
    <>
      <div className="cwv-hud">
        <div className="cwv-hud__right" style={{ gap: 12 }}>
          <span className="cwv-hud__title">THE RIVER EXPEDITION</span>
          <span className="cwv-hud__badge">{location}</span>
        </div>
        <div className="cwv-hud__right">
          <span className="cwv-hud__hint" style={{ fontSize: 10.5, opacity: 0.85 }}>
            WASD move · Shift run · E interact · drag to look
          </span>
          <button className="cwv-btn" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
            {help ? 'Hide controls' : 'Controls'}
          </button>
          <button className="cwv-btn cwv-btn--accent" onClick={onExit}>
            ← Portfolio
          </button>
        </div>
      </div>
      {help && (
        <div className="cwv-help">
          <div>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> walk
          </div>
          <div>
            <kbd>⇧</kbd> run
          </div>
          <div>
            <kbd>E</kbd> interact / board the whale
          </div>
          <div>
            <kbd>esc</kbd> close a panel
          </div>
          <div>drag — orbit the camera</div>
          <div>scroll — zoom</div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hover tooltip                                                       */
/* ------------------------------------------------------------------ */

export function HoverTooltip() {
  const hoveredId = useInteraction((s) => s.hoveredId);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // write style directly instead of setState on every pointermove — a
    // state update per mousemove re-renders the component dozens of times/s
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const found = hotspot(hoveredId);
  if (!found) return null;
  return (
    <div ref={ref} className="cwv-tip" style={{ left: -999, top: -999 }}>
      {found.label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Action prompt                                                       */
/* ------------------------------------------------------------------ */

export function ActionPrompt() {
  const nearId = useInteraction((s) => s.nearId);
  const canBoard = useInteraction((s) => s.canBoard);
  const canDisembark = useInteraction((s) => s.canDisembark);
  const openPanel = useInteraction((s) => s.openPanel);

  if (openPanel) return null;

  let text: string | null = null;
  let key = 'E';
  if (canBoard) text = 'Board the Docker Whale';
  else if (canDisembark) text = 'Step ashore';
  else if (nearId) {
    const hs = hotspot(nearId);
    text = hs ? `Open ${hs.label}` : null;
  }
  if (!text) return null;

  return (
    <div className="cwv-prompt" role="status">
      <span className="cwv-prompt__key">{key}</span>
      <span>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Info panel                                                          */
/* ------------------------------------------------------------------ */

export function InfoPanel() {
  const openPanel = useInteraction((s) => s.openPanel);
  const close = useInteraction((s) => s.close);
  const open = useInteraction((s) => s.open);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (openPanel) closeRef.current?.focus();
  }, [openPanel]);

  // arrow keys step through the panels in order, so the whole portfolio is
  // reachable without ever clicking back into the world
  useEffect(() => {
    if (!openPanel) return;
    const onKey = (e: KeyboardEvent) => {
      const i = PANEL_ORDER.indexOf(openPanel);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        open(PANEL_ORDER[(i + 1) % PANEL_ORDER.length]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        open(PANEL_ORDER[(i - 1 + PANEL_ORDER.length) % PANEL_ORDER.length]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPanel, open]);

  if (!openPanel) return null;
  const def: PanelDef | undefined = PANELS[openPanel];
  if (!def) return null;

  return (
    <aside className="cwv-panel" role="dialog" aria-label={def.title}>
      <div className="cwv-panel__head">
        <button ref={closeRef} className="cwv-panel__close" onClick={close} aria-label="Close panel">
          ×
        </button>
        <h2 className="cwv-panel__title">{def.title}</h2>
        {def.subtitle && <p className="cwv-panel__sub">{def.subtitle}</p>}
      </div>
      <div className="cwv-panel__body">
        {def.sections.map((s, i) => (
          <section className="cwv-section" key={i}>
            {s.heading && <h3>{s.heading}</h3>}
            {s.body && <p>{s.body}</p>}
            {s.bullets && (
              <ul>
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
            {s.chips && (
              <div className="cwv-chips">
                {s.chips.map((c, j) => (
                  <span className="cwv-chip" key={j}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            {s.links && (
              <div className="cwv-links">
                {s.links.map((l, j) => (
                  <a className="cwv-link" key={j} href={l.url} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Welcome                                                             */
/* ------------------------------------------------------------------ */

export function WelcomeToast() {
  const openPanel = useInteraction((s) => s.openPanel);
  const [dismissed, setDismissed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // the old interval ticked every second forever, even after the toast had
    // expired — stop the clock once 11s have passed or it was dismissed
    if (dismissed || elapsed > 11000) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => window.clearInterval(id);
  }, [dismissed, elapsed > 11000]);

  if (dismissed || openPanel) return null;
  if (elapsed > 11000) return null;

  return (
    <div className="cwv-toast" role="status">
      <h2>Welcome to Cloud World</h2>
      <p>Explore the islands and discover my skills, experience and projects.</p>
      <div className="cwv-toast__row">
        <button className="cwv-btn cwv-btn--accent" onClick={() => setDismissed(true)}>
          Got it
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export function LoadingOverlay() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (view.ready) setDone(true);
    }, 120);
    return () => window.clearInterval(id);
  }, []);
  if (done) return null;
  return (
    <div className="cwv-loading" role="status">
      BUILDING THE WORLD…
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Touch controls                                                      */
/* ------------------------------------------------------------------ */

export function TouchControls() {
  const [touch, setTouch] = useState(false);
  const knob = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    setTouch(coarse);
  }, []);

  useEffect(() => {
    const el = pad.current;
    if (!el || !touch) return;
    const setFrom = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = (e.clientX - cx) / (r.width / 2);
      let dy = (e.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      input.x = dx;
      input.z = dy;
      input.active = len > 0.12;
      if (knob.current) knob.current.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
    };
    const end = () => {
      active.current = false;
      input.x = 0;
      input.z = 0;
      input.active = false;
      if (knob.current) knob.current.style.transform = 'translate(0,0)';
    };
    const down = (e: PointerEvent) => {
      active.current = true;
      el.setPointerCapture(e.pointerId);
      setFrom(e);
    };
    const move = (e: PointerEvent) => {
      if (active.current) setFrom(e);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
    };
  }, [touch]);

  const [runOn, setRunOn] = useState(false);

  if (!touch) return null;

  const interact = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
  };

  return (
    <div className="cwv-touch">
      <div ref={pad} className="cwv-stick" aria-hidden="true">
        <div ref={knob} className="cwv-stick__nub" />
      </div>
      <div className="cwv-touch__buttons">
        <button className="cwv-round" onClick={interact}>
          USE
        </button>
        <button
          className={`cwv-round cwv-round--accent${runOn ? ' cwv-round--active' : ''}`}
          aria-pressed={runOn}
          onClick={() => {
            input.run = !input.run;
            setRunOn(input.run);
          }}
        >
          RUN
        </button>
      </div>
    </div>
  );
}
