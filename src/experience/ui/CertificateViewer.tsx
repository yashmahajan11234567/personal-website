import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CertificateInfo } from '../experience.data';

/**
 * Certificate block: inline preview thumbnail + "View Certificate" opens a
 * full lightbox (portaled to document.body so it is never clipped by the
 * scrollable panel), with a close control and a separate Download action.
 */
export function CertificateBlock({ cert }: { cert: CertificateInfo }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="cert-block">
      <button
        type="button"
        className="cert-preview"
        onClick={() => setOpen(true)}
        aria-label={`View ${cert.alt} larger`}
      >
        <img src={cert.src} alt={cert.alt} loading="lazy" />
        <span className="cert-preview-zoom" aria-hidden="true">
          View Certificate
        </span>
      </button>
      <div className="cert-actions">
        <button type="button" className="cert-btn cert-btn-primary" onClick={() => setOpen(true)}>
          View Certificate
        </button>
        <a className="cert-btn" href={cert.src} download={cert.fileName}>
          Download
        </a>
      </div>

      {open &&
        createPortal(
          <div
            className="cert-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={cert.alt}
            onClick={() => setOpen(false)}
          >
            <div className="cert-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <img src={cert.src} alt={cert.alt} />
              <div className="cert-lightbox-bar">
                <a className="cert-btn" href={cert.src} download={cert.fileName}>
                  Download
                </a>
                <button
                  type="button"
                  className="cert-btn cert-btn-primary"
                  onClick={() => setOpen(false)}
                  autoFocus
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
