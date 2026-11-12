/** Cloud World 2.0 — HUD + VariantButton */

import { useEffect, useState } from 'react';
import { useInteraction } from '../gameplay/store';
import { pilot } from '../player/state';
import { hexString } from '../core/palette';
import '../styles/cloudWorld2.css';

export function HUD({ onExit }: { onExit: () => void }) {
  const zone = useInteraction((s) => s.zone);
  const mode = useInteraction((s) => s.mode);
  const openPanel = useInteraction((s) => s.openPanel);
  const [showHelp, setShowHelp] = useState(false);

  // Zone badge accent color per zone
  const zoneAccent = (() => {
    switch (zone) {
      case 'Starting Island': return hexString('sand');
      case 'Welcome Harbour': return hexString('roofBlue');
      case 'Portfolio Village': return hexString('roofTerracotta');
      case 'Beacon Islet': return hexString('leaf');
      default: return hexString('uiAccent');
    }
  })();

  // Objective text per mode/zone
  const objective = (() => {
    if (mode === 'boat') return 'Sail to a harbour and press E to step ashore';
    switch (zone) {
      case 'Starting Island': return 'Click the ground to walk · board the whale (E)';
      case 'Portfolio Village': return 'Click a house to open it · E when close';
      case 'Welcome Harbour': return 'Six stalls along the waterfront · the village climbs east';
      default: return 'Explore';
    }
  })();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'Escape' && !openPanel) {
      setShowHelp(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPanel]);

  return (
    <>
      <div className="cw2-hud" role="region" aria-label="Game HUD">
        <header className="cw2-topbar">
          <div className="cw2-topbar-left">
            <h1 className="cw2-title">CLOUD WORLD</h1>
            <span
              className="cw2-zone-badge"
              role="status"
              aria-live="polite"
              style={{ borderColor: zoneAccent }}
            >
              <span style={{ background: zoneAccent }} aria-hidden="true" />
              {zone}
            </span>
          </div>
          <div className="cw2-topbar-right">
            <span className="cw2-controls-hint" aria-hidden="true">
              WASD move · Shift run · Space jump · E interact · Click walk/open · Drag look
            </span>
            <VariantButton />
            <button
              className="cw2-btn"
              onClick={() => setShowHelp(!showHelp)}
              aria-expanded={showHelp}
              aria-controls="cw2-help-panel"
            >
              Controls
            </button>
            <button className="cw2-btn" onClick={onExit}>← Portfolio</button>
          </div>
        </header>

        <div
          className="cw2-objective"
          role="status"
          aria-live="polite"
          style={{ borderLeftColor: hexString('uiAccent') }}
        >
          {objective}
        </div>

        <details id="cw2-help-panel" className="cw2-help-panel" open={showHelp}>
          <summary>Controls</summary>
          <ul className="cw2-help-list">
            <li><kbd className="cw2-kbd">W</kbd><kbd className="cw2-kbd">A</kbd><kbd className="cw2-kbd">S</kbd><kbd className="cw2-kbd">D</kbd> / Arrows — Walk</li>
            <li><kbd className="cw2-kbd">Shift</kbd> — Run</li>
            <li><kbd className="cw2-kbd">Space</kbd> — Jump</li>
            <li><kbd className="cw2-kbd">E</kbd> — Interact</li>
            <li><kbd className="cw2-kbd">Click</kbd> — Walk to point / Open panel</li>
            <li><kbd className="cw2-kbd">Drag</kbd> — Orbit camera</li>
            <li><kbd className="cw2-kbd">Scroll</kbd> — Zoom</li>
            <li><kbd className="cw2-kbd">Esc</kbd> — Close panel</li>
            <li><kbd className="cw2-kbd">← / →</kbd> — Browse panels</li>
          </ul>
        </details>
      </div>
    </>
  );
}

/** VariantButton cycles pilot.variant: arrival → explorer → traveller */
export function VariantButton() {
  const [variant, setVariant] = useState(pilot.variant);
  const variants: Array<{ value: 'arrival' | 'explorer' | 'traveller'; label: string }> = [
    { value: 'arrival', label: 'Arrival Cape' },
    { value: 'explorer', label: 'Explorer Hoodie' },
    { value: 'traveller', label: 'Traveller Scarf' },
  ];
  const idx = variants.findIndex((v) => v.value === variant);

  const cycle = () => {
    const next = variants[(idx + 1) % variants.length];
    pilot.variant = next.value;
    setVariant(next.value);
  };

  return (
    <button
      className="cw2-btn"
      onClick={cycle}
      aria-label={`Character variant: ${variants[idx].label}`}
      title={variants[idx].label}
    >
      {variants[idx].label}
    </button>
  );
}