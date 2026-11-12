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

type PanelData =
  | { kind: 'skill'; skill: { id: string; name: string; world: string; category: string; experience: { experienceType: string; evidence: string[]; trainingContext?: string; repositories?: { name: string; url: string }[] }; visual: { kind: string; treatment: string }; summary: string } }
  | { kind: 'project'; project: { id: string; title: string; world: string; authorship: string; contribution: string; collaborators?: { name: string; role: string }[]; description: string; technologies: string[]; workflow: { metaphor: string; stages: { id: string; label: string; detail?: string }[] }; results?: string[]; limitations: string[]; github?: string; dashboards?: { id: string; title: string; technology: string; previewPath: string; summary: string }[]; evidence?: string[] } }
  | { kind: 'info'; info: { title: string; paragraphs: string[] } };

const SkillPanel: React.FC<{ data: PanelData & { kind: 'skill' }; onClose: () => void }> = ({ data, onClose }) => {
  const { skill } = data;
  const exp = skill.experience;
  return (
    <div className="dn-panel skill-panel" role="dialog" aria-modal="true" aria-labelledby="skill-title">
      <div className="dn-panel-inner">
        <header>
          <h2 id="skill-title">{skill.name}</h2>
          <button onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="dn-panel-body">
          <p className="dn-badge dn-badge-{exp.experienceType.toLowerCase()}">{exp.experienceType}</p>
          <p>{skill.summary}</p>
          <div className="dn-section">
            <h3>Evidence</h3>
            <ul>{exp.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
          {exp.trainingContext && (
            <div className="dn-section">
              <h3>Training Context</h3>
              <p>{exp.trainingContext}</p>
            </div>
          )}
          {exp.repositories && exp.repositories.length > 0 && (
            <div className="dn-section">
              <h3>Repositories</h3>
              <ul>
                {exp.repositories.map((r) => (
                  <li key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.name}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectPanel: React.FC<{ data: PanelData & { kind: 'project' }; onClose: () => void }> = ({ data, onClose }) => {
  const { project } = data;
  return (
    <div className="dn-panel project-panel" role="dialog" aria-modal="true" aria-labelledby="project-title">
      <div className="dn-panel-inner">
        <header>
          <h2 id="project-title">{project.title}</h2>
          <button onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="dn-panel-body">
          <p className="dn-badge dn-badge-{project.authorship}">{project.authorship}</p>
          <p>{project.description}</p>
          <div className="dn-section">
            <h3>Your Contribution</h3>
            <p>{project.contribution}</p>
          </div>
          {project.collaborators && project.collaborators.length > 0 && (
            <div className="dn-section">
              <h3>Collaborators</h3>
              <ul>{project.collaborators.map((c, i) => <li key={i}><strong>{c.name}</strong> — {c.role}</li>)}</ul>
            </div>
          )}
          <div className="dn-section">
            <h3>Technologies</h3>
            <div className="dn-tech-tags">{project.technologies.map((t) => <span key={t} className="dn-tech-tag">{t}</span>)}</div>
          </div>
          <div className="dn-section">
            <h3>Workflow</h3>
            <ol>{project.workflow.stages.map((s) => <li key={s.id}><strong>{s.label}</strong>: {s.detail}</li>)}</ol>
          </div>
          {project.results && project.results.length > 0 && (
            <div className="dn-section">
              <h3>Results</h3>
              <ul>{project.results.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          <div className="dn-section">
            <h3>Limitations</h3>
            <ul>{project.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
          {project.github && (
            <div className="dn-section">
              <a href={project.github} target="_blank" rel="noopener noreferrer" className="dn-link">View Repository →</a>
            </div>
          )}
          {project.dashboards && project.dashboards.length > 0 && (
            <div className="dn-section">
              <h3>Dashboards</h3>
              <div className="dn-dashboard-grid">
                {project.dashboards.map((d) => (
                  <div key={d.id} className="dn-dashboard-card">
                    <img src={d.previewPath} alt={d.title} loading="lazy" />
                    <div className="dn-dashboard-info">
                      <strong>{d.title}</strong>
                      <span className="dn-tech-tag">{d.technology}</span>
                      <p>{d.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {project.evidence && project.evidence.length > 0 && (
            <div className="dn-section">
              <h3>Evidence</h3>
              <ul>{project.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoPanel: React.FC<{ data: PanelData & { kind: 'info' }; onClose: () => void }> = ({ data, onClose }) => {
  const { info } = data;
  return (
    <div className="dn-panel info-panel" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <div className="dn-panel-inner">
        <header>
          <h2 id="info-title">{info.title}</h2>
          <button onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="dn-panel-body">
          {info.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
};

export const DataNexusShell: React.FC<DataNexusShellProps> = ({ onExit }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<() => void>(() => {});
  const [panel, setPanel] = useState<PanelData | null>(null);

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

    const scene = game.scene.getScene('room') as Phaser.Scene | null;
    if (!scene) return;

    const emitter = scene.events;
    const handler = (panelData: PanelData) => {
      setPanel(panelData);
    };
    emitter.on('open-panel', handler);

    return () => { emitter.off('open-panel', handler); };
  }, []);

  const handleClose = () => { setPanel(null); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <div className="dn-shell" role="application" aria-label="Data Nexus">
      <div ref={hostRef} className="dn-canvas-host" />
      <div className="dn-overlay">
        <div className="dn-index" aria-label="World index">
          <button className="dn-index-btn" onClick={onExit}>← Back to Portfolio</button>
        </div>
      </div>
      {panel && (
        <Suspense fallback={<div className="dn-panel-skeleton" />}>
          {panel.kind === 'skill' && <SkillPanel data={panel} onClose={handleClose} />}
          {panel.kind === 'project' && <ProjectPanel data={panel} onClose={handleClose} />}
          {panel.kind === 'info' && <InfoPanel data={panel} onClose={handleClose} />}
        </Suspense>
      )}
    </div>
  );
};

import Phaser from 'phaser';