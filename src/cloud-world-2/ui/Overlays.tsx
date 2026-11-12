/** Cloud World 2.0 — Overlays: HoverTooltip, ActionPrompt, InfoPanel, WelcomeToast, LoadingOverlay */

import { useEffect, useRef, useState } from 'react';
import { useInteraction, hotspot, panelFor } from '../gameplay/store';
import { view } from '../player/state';
import { hexString } from '../core/palette';
import { PANELS, PANEL_ORDER } from '../core/registry';
import '../styles/cloudWorld2.css';

/* ---------------------------------------------------------------- */
/* HoverTooltip — follows pointer, shows panel title for hoveredId */
/* ---------------------------------------------------------------- */
export function HoverTooltip() {
  const hoveredId = useInteraction((s) => s.hoveredId);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const panel = panelFor(hoveredId);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  if (!hoveredId || !panel) return null;

  return (
    <div
      className="cw2-tooltip visible"
      style={{ left: pos.x, top: pos.y }}
      role="tooltip"
      aria-hidden="true"
    >
      {panel.title}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* ActionPrompt — bottom-centre pill with key + context text       */
/* ---------------------------------------------------------------- */
export function ActionPrompt() {
  const canBoard = useInteraction((s) => s.canBoard);
  const canDisembark = useInteraction((s) => s.canDisembark);
  const nearId = useInteraction((s) => s.nearId);
  const openPanel = useInteraction((s) => s.openPanel);

  if (openPanel) return null;

  let text: string | null = null;
  if (canBoard) text = 'Board the Docker Whale';
  else if (canDisembark) text = 'Step ashore';
  else if (nearId) {
    const hs = hotspot(nearId);
    if (hs) text = `Open ${hs.label}`;
  }
  if (!text) return null;

  return (
    <div className="cw2-action-prompt visible" role="status" aria-live="polite">
      <kbd className="cw2-kbd">E</kbd>
      <span>{text}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* InfoPanel — right sidebar 420px, keyboard browsable             */
/* ---------------------------------------------------------------- */
export function InfoPanel() {
  const openPanel = useInteraction((s) => s.openPanel);
  const close = useInteraction((s) => s.close);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Browse arrows open the neighbouring panel directly from the store —
   * no local index state, so sync/navigate effects can never ping-pong
   * (a prior version ran "Maximum update depth exceeded" on open). */
  useEffect(() => {
    if (!openPanel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = PANEL_ORDER.indexOf(useInteraction.getState().openPanel ?? '');
      if (idx < 0) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        useInteraction.getState().open(PANEL_ORDER[(idx + 1) % PANEL_ORDER.length]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        useInteraction.getState().open(PANEL_ORDER[(idx - 1 + PANEL_ORDER.length) % PANEL_ORDER.length]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPanel, close]);

  // Focus close button while open
  useEffect(() => {
    if (openPanel) closeRef.current?.focus();
  }, [openPanel]);

  if (!openPanel) return null;

  const panel = PANELS[openPanel];
  if (!panel) return null;

  const accentColor = hexString(panel.accent as any);

  return (
    <aside className="cw2-info-panel" role="dialog" aria-modal="true" aria-labelledby="cw2-panel-title">
      <header className="cw2-info-panel-head">
        <div>
          <h2 id="cw2-panel-title" className="cw2-info-panel-title" style={{ color: accentColor }}>
            {panel.title}
          </h2>
          {panel.subtitle && (
            <p className="cw2-info-panel-subtitle">{panel.subtitle}</p>
          )}
        </div>
        <button
          ref={closeRef}
          className="cw2-info-panel-close"
          onClick={close}
          aria-label="Close panel"
        >
          ×
        </button>
      </header>
      <div className="cw2-info-panel-body">
        {panel.sections.map((section, si) => (
          <section key={si}>
            {section.heading && <h3>{section.heading}</h3>}
            {section.body && <p>{section.body}</p>}
            {section.bullets && section.bullets.length > 0 && (
              <ul>
                {section.bullets.map((bullet, bi) => (
                  <li key={bi}>{bullet}</li>
                ))}
              </ul>
            )}
            {section.chips && section.chips.length > 0 && (
              <div className="cw2-chips">
                {section.chips.map((chip, ci) => (
                  <span key={ci} className="cw2-chip" style={{ borderColor: accentColor, background: `${accentColor}2E` }}>
                    {chip}
                  </span>
                ))}
              </div>
            )}
            {section.links && section.links.length > 0 && (
              <div>
                {section.links.map((link, li) => (
                  <a key={li} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      <footer className="cw2-info-panel-foot">
        ← → browse · esc close
      </footer>
    </aside>
  );
}

/* ---------------------------------------------------------------- */
/* WelcomeToast — centered card, 11s auto-dismiss + Got it button  */
/* ---------------------------------------------------------------- */
export function WelcomeToast() {
  const openPanel = useInteraction((s) => s.openPanel);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 11000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || openPanel) return null;

  return (
    <div className="cw2-toast" role="dialog" aria-modal="true" aria-labelledby="cw2-toast-title">
      <h2 id="cw2-toast-title" className="cw2-toast-title">Welcome to Cloud World</h2>
      <p className="cw2-toast-body">Explore the islands and discover my skills, experience and projects.</p>
      <button className="cw2-toast-btn" onClick={() => setVisible(false)}>
        Got it
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* LoadingOverlay — full-screen until view.ready                   */
/* ---------------------------------------------------------------- */
export function LoadingOverlay() {
  const [ready, setReady] = useState(view.ready);

  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      if (view.ready) {
        setReady(true);
        clearInterval(interval);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [ready]);

  if (ready) return null;

  return (
    <div className="cw2-loading" role="status" aria-live="polite" aria-busy="true">
      BUILDING THE WORLD…
    </div>
  );
}