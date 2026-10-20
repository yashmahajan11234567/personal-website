import { useEffect, useState } from 'react';
import { PORTFOLIO } from '../content';
import { SKILL_CATEGORIES, getCategoryEntries, CATEGORY_COVER_NOTES } from './categories';
import './CloudCard.css';

// CloudCard — the polished popup for the Cloud World (plan Stage 7 / new
// requirements item 5). A full-screen scrim with a large cloud-shaped DOM
// card: layered CSS cloud silhouette, cyan accents, smooth scale/fade-in.
// Title + description come from the restored PORTFOLIO data (skills.cloud.ts
// / projects.cloud.ts) — no invented content. Exactly ONE "Return to World"
// button closes it; Escape and scrim click do too. While open, avatar
// movement is blocked (a lock flag the character controller consults) and
// avatar/camera state is preserved (nothing in the scene is touched).

export interface CloudCardData {
  kind: 'skill' | 'project' | 'category';
  id: string;
}

export function CloudCard({
  data,
  onClose,
}: {
  data: CloudCardData | null;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (data) {
      // Trigger the enter transition on the next frame so CSS animates.
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [data, onClose]);

  // QA instrumentation (harmless in prod): expose the assembled PORTFOLIO so
  // browser tests can assert card content against the exact data the app
  // serves (no duplicated expectations in test code). SKILL_CATEGORIES backs
  // the category-overlay assertions the same way.
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__PORTFOLIO__) {
      (window as any).__PORTFOLIO__ = PORTFOLIO;
    }
    if (typeof window !== 'undefined') {
      (window as any).__SKILL_CATEGORIES__ = SKILL_CATEGORIES;
    }
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (data) (window as any).__cwInputLocked = true;
    else (window as any).__cwInputLocked = false;
    return () => {
      (window as any).__cwInputLocked = false;
    };
  }, [data]);

  if (!data) return null;

  // Resolve real content. All sign ids are real content-model ids (Stage 1
  // fixed the legacy aws/linux/cicd markers) — anything unresolved shows a
  // plain "details coming soon" line, never invented content.
  const ALIAS: Record<string, string> = { cicd: 'ci-cd' };
  const id = ALIAS[data.id] ?? data.id;

  // Category overlays (2026-10-16 redesign): resolve the category definition
  // and its skill entries live from PORTFOLIO via categories.ts. A category
  // id that does not resolve still renders the card shell with an honest
  // "details coming soon" line.
  const category =
    data.kind === 'category'
      ? SKILL_CATEGORIES.find((c) => c.id === data.id)
      : undefined;
  const categoryEntries = data.kind === 'category' ? getCategoryEntries(data.id) : [];
  const coverNotes =
    data.kind === 'category' ? (CATEGORY_COVER_NOTES[data.id] ?? []) : [];

  // Narrow the union: Skill has name/summary, Project has title/description.
  const title =
    data.kind === 'category'
      ? (category?.title ?? data.id)
      : data.kind === 'skill'
        ? (PORTFOLIO.skills[id]?.name ?? data.id)
        : (PORTFOLIO.projects[id]?.title ?? data.id);
  const description =
    data.kind === 'category'
      ? (category?.tagline ?? 'Category details coming soon.')
      : data.kind === 'skill'
        ? (PORTFOLIO.skills[id]?.summary ?? 'Details coming soon.')
        : (PORTFOLIO.projects[id]?.description ?? 'Details coming soon.');

  // Project cards carry their real repository link (2026-10-15 requirement 5).
  // Only absolute https GitHub URLs are linked — anything else stays unlinked
  // so a bad data field can never render a misleading or dead anchor. The
  // Return button below remains the ONLY close action; this link never closes.
  const project = data.kind === 'project' ? PORTFOLIO.projects[id] : undefined;
  const githubUrl =
    project?.github && /^https:\/\/github\.com\/\S+$/.test(project.github)
      ? project.github
      : null;

  return (
    <div
      className="cloud-card-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`cloud-card ${shown ? 'cloud-card--in' : ''}`}>
        {/* CSS cloud puffs behind the card body (the "cloud-shaped card") */}
        <div className="cloud-card-puffs" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="cloud-card-body">
          <div className="cloud-card-kicker">
            {data.kind === 'category' ? 'SKILLS' : data.kind === 'skill' ? 'SKILL' : 'PROJECT'}
          </div>
          <h2 className="cloud-card-title">{title}</h2>
          <p className="cloud-card-desc">{description}</p>
          {data.kind === 'category' && (
            <div className="cloud-card-category">
              <ul className="cloud-card-skill-list">
                {categoryEntries.map((entry) => (
                  <li key={entry.id} className="cloud-card-skill-item">
                    <span className="cloud-card-skill-name">{entry.name}</span>
                    <span className="cloud-card-skill-summary">{entry.summary}</span>
                    {entry.experienceType === 'TRAINING' && (
                      <span className="cloud-card-skill-chip">Training only</span>
                    )}
                    {entry.repositories.length > 0 && (
                      <span className="cloud-card-skill-repos">
                        Evidence: {entry.repositories.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {coverNotes.map((note) => (
                <p key={note} className="cloud-card-cover-note">{note}</p>
              ))}
            </div>
          )}
          {project && (
            <div className="cloud-card-meta">
              <span className="cloud-card-chips">
                {(project as any).technologies?.slice(0, 6).join(' · ')}
              </span>
              {githubUrl && (
                <a
                  className="cloud-card-github"
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  View repository
                  <span className="visually-hidden">
                    {' '}
                    for {title} (opens in a new tab)
                  </span>
                </a>
              )}
            </div>
          )}
          <button
            type="button"
            className="cloud-card-return"
            onClick={onClose}
            autoFocus
          >
            Return to World
          </button>
        </div>
      </div>
    </div>
  );
}
