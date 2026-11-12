/**
 * DataNexusShell — React wrapper for the Data Nexus Phaser engine
 * Follows the IsoShell pattern: lazy engine import, DOM overlay for panels/prompts
 */
import { useEffect, useRef, useState, Suspense } from 'react';
import './DataNexusShell.css';

const EnginePromise = import('../data-nexus').then((m) => m.mountDataNexusWorld);

interface DataNexusShellProps {
  onExit: () => void;
}

const ConsolePanel: React.FC<{ id: string; onClose: () => void }> = ({ onClose }) => (
  <div className="dn-panel console-panel" role="dialog" aria-modal="true" aria-labelledby="console-title">
    <div className="dn-panel-inner">
      <header>
        <h2 id="console-title">Data Core Console</h2>
        <button onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="dn-panel-body">
        <p>Central Data Core interface. System status: NOMINAL.</p>
        <p>Core temperature: 2.4K</p>
        <p>Power output: 98.7%</p>
        <p>Data throughput: 4.2 PB/s</p>
      </div>
    </div>
  </div>
);

export const DataNexusShell: React.FC<DataNexusShellProps> = ({ onExit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<() => void>(() => {});
  const [panel, setPanel] = useState<{ kind: 'console'; id: string } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvasHost = document.createElement('div');
    canvasHost.className = 'dn-canvas-host';
    host.appendChild(canvasHost);
    EnginePromise.then((mount) => { unmountRef.current = mount(canvasHost); });
    return () => { unmountRef.current(); host.removeChild(canvasHost); };
  }, []);

  useEffect(() => {
    const game = (window as unknown as Record<string, unknown>).__dataNexusGame as Phaser.Game | undefined;
    if (!game) return;

    const scene = game.scene.getScene('starting-hub') as Phaser.Scene | null;
    if (!scene) return;

    const emitter = scene.events;
    const handler = (data: any) => {
      setPanel({ kind: 'console', id: data.id });
    };
    emitter.on('open-console', handler);

    return () => { emitter.off('open-console', handler); };
  }, []);

  const handleClose = () => { setPanel(null); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <div className="dn-shell" role="application" aria-label="Data Nexus — Starting Hub">
      <div ref={hostRef} className="dn-canvas-host" />
      <div className="dn-overlay">
        <div className="dn-index" aria-label="World index">
          <button className="dn-index-btn" onClick={onExit}>← Back to Portfolio</button>
        </div>
      </div>
      {panel && panel.kind === 'console' && (
        <Suspense fallback={<div className="dn-panel-skeleton" />}>
          <ConsolePanel id={panel.id} onClose={handleClose} />
        </Suspense>
      )}
    </div>
  );
};

// Need to import Phaser for type
import Phaser from 'phaser';