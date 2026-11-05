/**
 * IsoShell — React wrapper for the Cloud World iso engine.
 * Adapts the WorldShell pattern: lazy engine import, DOM overlay for panels/index/prompts.
 */
import { useEffect, useRef, useState, Suspense } from 'react';
import { bus, type IsoEvent } from './bus.ts';
import { InfoPanel } from '../components/InfoPanel.tsx';
import { PORTFOLIO } from '../content/index.ts';
import './iso.css';

const EnginePromise = import('./engine.ts').then((m) => m.mountIsoWorld);

interface IsoShellProps {
  onExit: () => void;
}

const AboutPanel: React.FC<{ id: string; onClose: () => void }> = ({ onClose }) => (
  <div className="iso-panel about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
    <div className="iso-panel-inner">
      <header><h2 id="about-title">About Me</h2><button onClick={onClose} aria-label="Close">×</button></header>
      <div className="iso-panel-body">
        <p>Full-stack developer passionate about cloud-native systems, DevOps automation, and reliable software delivery.</p>
        <p>This portfolio showcases real projects: RxVerify (digital prescription verification), DevOps Masterclass (infrastructure automation), and Go Microservices (distributed systems).</p>
        <p>Technologies: AWS, Docker, Kubernetes, CI/CD, Python, Go, TypeScript, and more.</p>
      </div>
    </div>
  </div>
);

const StationPanel: React.FC<{ id: string; skills: string[]; onClose: () => void }> = ({ id, skills, onClose }) => {
  const skillEls = skills.map((sid) => {
    const rec = (PORTFOLIO as any).skills[sid];
    return (
      <div key={sid} className="station-skill">
        <strong>{rec?.name ?? sid}</strong> — {rec?.summary ?? 'No content model record.'}
      </div>
    );
  });
  return (
    <div className="iso-panel about-panel" role="dialog" aria-modal="true" aria-labelledby={`station-${id}`}>
      <div className="iso-panel-inner">
        <header><h2 id={`station-${id}`}>{id}</h2><button onClick={onClose} aria-label="Close">×</button></header>
        <div className="iso-panel-body">{skillEls}</div>
      </div>
    </div>
  );
};

export const IsoShell: React.FC<IsoShellProps> = ({ onExit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<() => void>(() => {});
  const [panel, setPanel] = useState<{ kind: 'skill' | 'project' | 'about' | 'station'; id: string; skills?: string[] } | null>(null);
  const [prompt, setPrompt] = useState<{ text: string; key: string } | null>(null);
  const errorsRef = useRef<string[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvasHost = document.createElement('div');
    canvasHost.className = 'iso-canvas-host';
    host.appendChild(canvasHost);
    EnginePromise.then((mount) => { unmountRef.current = mount(canvasHost); });
    return () => { unmountRef.current(); host.removeChild(canvasHost); };
  }, []);

  useEffect(() => {
    const off = bus.on((e: IsoEvent) => {
      if (e.kind === 'activate') {
        if (e.skills && e.skills.length > 0) setPanel({ kind: 'station', id: e.id, skills: e.skills });
        else if (e.contentId) {
          const kind = e.contentId.startsWith('cloud-') ? 'skill' : 'project';
          setPanel({ kind, id: e.contentId });
        } else {
          setPanel({ kind: 'about', id: 'about' });
        }
      } else if (e.kind === 'close') setPanel(null);
      else if (e.kind === 'prompt') setPrompt(e.text && e.key ? { text: e.text, key: e.key } : null);
      else if (e.kind === 'probe') {
        (window as unknown as Record<string, unknown>).__iso = {
          fps: e.fps, calls: e.calls, mode: e.mode, x: e.x, y: e.y,
          errors: errorsRef.current,
        };
      }
    });
    return off;
  }, []);

  const handleClose = () => { setPanel(null); bus.emit({ kind: 'close' }); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <div className="iso-shell" role="application" aria-label="Cloud World — River Expedition">
      <div ref={hostRef} className="iso-canvas-host" />
      <div className="iso-overlay">
        {prompt && (
          <div className="iso-prompt-chip">
            <kbd>{prompt.key}</kbd> {prompt.text}
          </div>
        )}
        <div className="iso-index" aria-label="World index">
          <button className="iso-index-btn" onClick={onExit}>← Back to Portfolio</button>
        </div>
      </div>
      {panel && panel.kind === 'about' && <AboutPanel id={panel.id} onClose={handleClose} />}
      {panel && panel.kind === 'station' && <StationPanel id={panel.id} skills={panel.skills ?? []} onClose={handleClose} />}
      {panel && (panel.kind === 'skill' || panel.kind === 'project') && (
        <Suspense fallback={<div className="iso-panel-skeleton" />}>
          <InfoPanel kind={panel.kind} id={panel.id} onClose={handleClose} />
        </Suspense>
      )}
    </div>
  );
};
