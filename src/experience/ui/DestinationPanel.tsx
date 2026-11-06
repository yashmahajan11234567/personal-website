import type { DestinationContent } from '../experience.data';
import { CertificateBlock } from './CertificateViewer';

interface DestinationPanelProps {
  dest: DestinationContent;
}

/**
 * Right-side info card for the selected destination. One consistent
 * information architecture across all three islands:
 * header (title / role / dates) -> overview -> highlights -> skills ->
 * pathways (pagoda) -> projects -> certificate. Accent comes from the
 * verified content so each card keeps its own identity.
 */
export function DestinationPanel({ dest }: DestinationPanelProps) {
  return (
    <div className="dest-panel" style={{ ['--accent' as string]: dest.accent }}>
      <header className="dest-panel-header">
        <p className="dest-kicker">{dest.landmark}</p>
        <h3>{dest.title}</h3>
        {dest.role && <p className="dest-role">{dest.role}</p>}
        {dest.dates && <p className="dest-dates">{dest.dates}</p>}
      </header>

      {dest.overview && (
        <section>
          <h4>Overview</h4>
          <p>{dest.overview}</p>
        </section>
      )}

      {dest.highlights && dest.highlights.length > 0 && (
        <section>
          <h4>Highlights</h4>
          <ul className="highlight-list">
            {dest.highlights.map((h) =>
              typeof h === 'string' ? (
                <li key={h}>{h}</li>
              ) : (
                <li key={h.label}>
                  <strong>{h.label}</strong>
                  <span>{h.text}</span>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {dest.pathways && dest.pathways.length > 0 && (
        <section>
          <h4>Career Paths</h4>
          <ul className="pathway-list">
            {dest.pathways.map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong>
                <span>{p.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dest.skills && dest.skills.length > 0 && (
        <section>
          <h4>Skills &amp; Technologies</h4>
          <div className="skill-groups">
            {dest.skills.map((g) => (
              <div className="skill-group" key={g.label}>
                <p className="skill-group-label">{g.label}</p>
                <div className="skill-tags">
                  {g.items.map((item) => (
                    <span className="skill-tag" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {dest.projects && dest.projects.length > 0 && (
        <section>
          <h4>Featured Projects</h4>
          <div className="project-list">
            {dest.projects.map((p) => (
              <article className="project-card" key={p.url}>
                <div className="project-card-head">
                  <p className="project-name">{p.name}</p>
                  <a
                    className="project-link"
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${p.name} on GitHub (new tab)`}
                  >
                    GitHub ↗
                  </a>
                </div>
                <p className="project-desc">{p.desc}</p>
                <div className="skill-tags">
                  {p.stack.map((t) => (
                    <span className="skill-tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {dest.certificate && (
        <section>
          <h4>Certificate &amp; Recognition</h4>
          {dest.certificate.details && (
            <ul className="cert-details">
              {dest.certificate.details.map((d) => (
                <li key={d.label}>
                  <span className="cert-details-label">{d.label}</span>
                  <span>{d.text}</span>
                </li>
              ))}
            </ul>
          )}
          <CertificateBlock cert={dest.certificate} />
        </section>
      )}
    </div>
  );
}
