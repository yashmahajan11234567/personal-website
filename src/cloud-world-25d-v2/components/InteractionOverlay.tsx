/**
 * HTML Overlay Components — rendered outside Canvas for accessibility.
 */
import { useState, useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { useInteraction } from './InteractionContext';
import { pilot } from './Character';

export function HoverTooltip() {
  const { hoveredId, hotspots } = useInteraction();
  if (!hoveredId) return null;

  const hs = hotspots.find(h => h.id === hoveredId);
  if (!hs) return null;

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 100,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(20,32,48,0.95)',
        border: '2px solid #ffe9a8',
        borderRadius: '8px',
        padding: '8px 12px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#ffe9a8',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        left: '50%',
        top: '50%',
      }}
    >
      {hs.label}
    </div>
  );
}

export function InfoCard() {
  const { openCardId, content, setOpenCardId } = useInteraction();
  if (!openCardId) return null;

  const cardContent = content[openCardId as keyof typeof content] || { title: openCardId, body: '', skills: [] };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '320px',
        maxWidth: '90vw',
        background: 'rgba(20,32,48,0.98)',
        borderLeft: '3px solid #ffe9a8',
        borderRadius: '8px 0 0 8px',
        padding: '20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#f6f2e8',
        zIndex: 200,
        overflow: 'auto',
        boxShadow: '-4px 0 30px rgba(0,0,0,0.5)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffe9a8' }}>{cardContent.title}</h2>
        <button
          onClick={() => setOpenCardId(null)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffe9a8',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0 8px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <p style={{ lineHeight: 1.6, marginBottom: '16px' }}>{cardContent.body}</p>
      {cardContent.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {cardContent.skills.map((skill, i) => (
            <span
              key={i}
              style={{
                background: '#ffe9a8',
                color: '#142030',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BoardingPrompt() {
  // Check pilot position for boarding
  const shouldShow = pilot.mode === 'walk' && pilot.pos.x > 27 && Math.abs(pilot.pos.z) < 2.5;

  if (!shouldShow) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(20,32,48,0.95)',
        border: '2px solid #ffe9a8',
        borderRadius: '8px',
        padding: '16px 24px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#ffe9a8',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 100,
      }}
    >
      Press <kbd style={{ background: '#ffe9a8', color: '#142030', padding: '2px 6px', borderRadius: '4px', margin: '0 4px' }}>E</kbd> to board the Docker Whale
    </div>
  );
}

export function LoadingOverlay() {
  const { active, progress, errors } = useProgress();
  const [timedOut, setTimedOut] = useState(false);

  // Hard fallback: never block the world longer than 20s even if a loader hangs
  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), 20000);
    return () => window.clearTimeout(id);
  }, []);

  if ((!active && progress >= 100) || timedOut) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#142030',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#ffe9a8',
        fontFamily: '"Trebuchet MS", system-ui',
        fontSize: '1.5rem',
        zIndex: 1000,
      }}
    >
      Loading Welcome Harbour… {Math.floor(progress)}%
      {errors.length > 0 && (
        <div style={{ fontSize: '0.9rem', color: '#ff9a9a', maxWidth: '80vw', textAlign: 'center' }}>
          {errors.length} asset(s) failed to load — continuing without them.
        </div>
      )}
    </div>
  );
}