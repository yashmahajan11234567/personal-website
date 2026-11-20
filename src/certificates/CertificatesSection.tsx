import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CERTIFICATES, type CertificateEntry } from './certificates.data';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './certificates.css';

/**
 * Certificates & Achievements — a traditional horizontal carousel mounted in
 * the normal page flow after the Experience section (App.tsx hero branch).
 *
 * Mechanics: native CSS scroll-snap on the track (free touch/swipe), with
 * prev/next buttons, dots and ArrowLeft/ArrowRight driving scrollTo() on the
 * same track — no carousel dependency. Cards are data-driven from
 * certificates.data.ts; adding an entry adds a card.
 *
 * The expanded view reuses the Experience certificate lightbox PATTERN
 * (portal to document.body, Escape/backdrop close, role=dialog) but is
 * self-contained here so the Experience section is never touched.
 */
export function CertificatesSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [lightbox, setLightbox] = useState<CertificateEntry | null>(null);
  const reducedMotion = useReducedMotion();
  const rafRef = useRef(0);

  /** One card width + gap — the scroll step between slides. */
  const step = useCallback((): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const card = track.querySelector<HTMLElement>('.certs-card');
    if (!card) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    return card.getBoundingClientRect().width + gap;
  }, []);

  const updateFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const s = step();
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
    // At the far end the leftmost visible card is not the last one (several
    // cards are visible at once), so pin the active slide to the last entry.
    const i = atEnd ? CERTIFICATES.length - 1 : s > 0 ? Math.round(track.scrollLeft / s) : 0;
    setActive(Math.max(0, Math.min(CERTIFICATES.length - 1, i)));
    setCanPrev(track.scrollLeft > 4);
    setCanNext(!atEnd);
  }, [step]);

  /** rAF-throttled scroll handler so snap updates don't thrash React state. */
  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      updateFromScroll();
    });
  }, [updateFromScroll]);

  useEffect(() => {
    updateFromScroll();
    window.addEventListener('resize', updateFromScroll);
    return () => {
      window.removeEventListener('resize', updateFromScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateFromScroll]);

  const scrollToIndex = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(CERTIFICATES.length - 1, i));
      track.scrollTo({
        left: clamped * step(),
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    },
    [reducedMotion, step],
  );

  /*
   * Nav derives from the ACTUAL scroll position, not the displayed `active`
   * (which is pinned to the last slide at the far end): from the end,
   * ArrowLeft must step back one slide, not target an index beyond max scroll.
   */
  const currentIndex = useCallback((): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const s = step();
    return s > 0 ? Math.max(0, Math.min(CERTIFICATES.length - 1, Math.round(track.scrollLeft / s))) : 0;
  }, [step]);

  const onTrackKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollToIndex(currentIndex() + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollToIndex(currentIndex() - 1);
    }
  };

  /*
   * A vertical wheel over the track should scroll the page, not trap it;
   * only translate the wheel into horizontal motion when the track can
   * actually move further in that direction. Attached natively with
   * passive:false because React root wheel listeners are passive and
   * preventDefault() would be ignored there.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) return; // native horizontal/trackpad scroll
      const forward = e.deltaY > 0;
      const atStart = track.scrollLeft <= 0;
      const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
      if ((forward && !atEnd) || (!forward && !atStart)) {
        e.preventDefault();
        track.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    };
    track.addEventListener('wheel', onWheel, { passive: false });
    return () => track.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <section className="certs-section" id="certificates" aria-label="Certificates and achievements">
      <div className="certs-inner">
        <div
          ref={trackRef}
          className="certs-track"
          role="group"
          aria-roledescription="carousel"
          aria-label="Certificates and achievements"
          tabIndex={0}
          onScroll={onScroll}
          onKeyDown={onTrackKeyDown}
        >
          {CERTIFICATES.map((entry, i) => (
            <CertificateCard
              key={entry.id}
              entry={entry}
              index={i}
              total={CERTIFICATES.length}
              onOpen={() => setLightbox(entry)}
            />
          ))}
        </div>

        <div className="certs-controls">
          <button
            type="button"
            className="certs-nav"
            onClick={() => scrollToIndex(currentIndex() - 1)}
            disabled={!canPrev}
            aria-label="Previous certificates"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="certs-dots">
            {CERTIFICATES.map((entry, i) => (
              <button
                key={entry.id}
                type="button"
                className={`certs-dot${i === active ? ' certs-dot--active' : ''}`}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to slide ${i + 1}: ${entry.title}`}
                aria-current={i === active ? 'true' : undefined}
              />
            ))}
          </div>
          <span className="certs-counter" aria-live="polite">
            {active + 1} / {CERTIFICATES.length}
          </span>
          <button
            type="button"
            className="certs-nav"
            onClick={() => scrollToIndex(currentIndex() + 1)}
            disabled={!canNext}
            aria-label="Next certificates"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>

      {lightbox && <CertificateLightbox entry={lightbox} onClose={() => setLightbox(null)} />}
    </section>
  );
}

function CertificateCard({
  entry,
  index,
  total,
  onOpen,
}: {
  entry: CertificateEntry;
  index: number;
  total: number;
  onOpen: () => void;
}) {
  return (
    <article
      className={`certs-card${entry.kind === 'achievement' ? ' certs-card--achievement' : ''}`}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}: ${entry.title}`}
    >
      <button type="button" className="certs-preview" onClick={onOpen} aria-label={`View ${entry.title} larger`}>
        <img src={entry.image} alt={entry.alt} loading="lazy" decoding="async" />
        <span className="certs-preview-zoom" aria-hidden="true">
          View
        </span>
      </button>
      <div className="certs-card-body">
        <span className={`certs-kind certs-kind--${entry.kind}`}>
          {entry.kind === 'achievement' ? 'Achievement' : 'Certificate'}
        </span>
        <h3 className="certs-title">{entry.title}</h3>
        <p className="certs-issuer">{entry.issuer}</p>
        {entry.date && <p className="certs-date">{entry.date}</p>}
        <div className="certs-actions">
          <button type="button" className="certs-btn certs-btn-primary" onClick={onOpen}>
            View
          </button>
          <a className="certs-btn" href={entry.pdf} target="_blank" rel="noopener noreferrer">
            View PDF
          </a>
          <a className="certs-btn" href={entry.pdf} download={entry.fileName}>
            Download
          </a>
        </div>
      </div>
    </article>
  );
}

/** Portal lightbox — same pattern as experience/ui/CertificateViewer.tsx. */
function CertificateLightbox({ entry, onClose }: { entry: CertificateEntry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="certs-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={entry.title}
      onClick={onClose}
    >
      <div className="certs-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <img src={entry.image} alt={entry.alt} />
        <div className="certs-lightbox-body">
          <span className={`certs-kind certs-kind--${entry.kind}`}>
            {entry.kind === 'achievement' ? 'Achievement' : 'Certificate'}
          </span>
          <h3>{entry.title}</h3>
          <p className="certs-issuer">{entry.issuer}</p>
          {entry.date && <p className="certs-date">{entry.date}</p>}
          {entry.description && <p className="certs-desc">{entry.description}</p>}
          {entry.details && entry.details.length > 0 && (
            <ul className="certs-details">
              {entry.details.map((d) => (
                <li key={d.label}>
                  <span className="certs-details-label">{d.label}</span>
                  <span>{d.text}</span>
                </li>
              ))}
            </ul>
          )}
          {entry.verifyUrl && (
            <a className="certs-verify" href={entry.verifyUrl} target="_blank" rel="noopener noreferrer">
              Verify credential ↗
            </a>
          )}
        </div>
        <div className="certs-lightbox-bar">
          <a className="certs-btn" href={entry.pdf} target="_blank" rel="noopener noreferrer">
            View PDF
          </a>
          <a className="certs-btn" href={entry.pdf} download={entry.fileName}>
            Download
          </a>
          <button type="button" className="certs-btn certs-btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default CertificatesSection;
