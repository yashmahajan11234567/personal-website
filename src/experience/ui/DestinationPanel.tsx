import type { DestinationContent } from '../experience.data';
import { CertificateBlock } from './CertificateViewer';

interface DestinationPanelProps {
  dest: DestinationContent;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Right-side info card for the selected destination. Each destination gets a
 * distinct accent (set inline from the verified content) so the three cards
 * have separate visual identities rather than one generic template.
 */
export function DestinationPanel({ dest, onPrev, onNext }: DestinationPanelProps) {
  return (
    <div className="dest-panel" style={{ ['--accent' as string]: dest.accent }}>
      <header className="dest-panel-header">
        <div className="dest-panel-header-content">
          <p className="dest-kicker">{dest.landmark}</p>
          <h3>{dest.title}</h3>
          {dest.role && <p className="dest-role">{dest.role}</p>}
          {dest.dates && <p className="dest-dates">{dest.dates}</p>}
        </div>
        <nav className="dest-panel-nav" aria-label="Destination navigation">
          <button type="button" onClick={onPrev} aria-label="Previous destination">Prev</button>
          <button type="button" onClick={onNext} aria-label="Next destination">Next</button>
        </nav>
      </header>

      {dest.sections.map((s) => (
        <section key={s.heading}>
          <h4>{s.heading}</h4>
          {s.body && <p>{s.body}</p>}
          {s.bullets && (
            <ul>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {dest.github && (
        <section>
          <h4>Project</h4>
          <p>
            <a href={dest.github} target="_blank" rel="noopener noreferrer">
              {dest.github.replace('https://github.com/', '')}
            </a>
          </p>
        </section>
      )}

      {dest.certificate && (
        <section>
          <h4>Certificate</h4>
          <CertificateBlock cert={dest.certificate} />
        </section>
      )}
    </div>
  );
}
