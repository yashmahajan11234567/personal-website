/**
 * HUD — top bar with title, location, and back button.
 */
import { useState, useEffect } from 'react';

export function HUD({ onBack }: { onBack: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'rgba(20,32,48,0.9)',
        borderBottom: '2px solid #ffe9a8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontFamily: '"Trebuchet MS", system-ui, sans-serif',
        color: '#ffe9a8',
        zIndex: 100,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px' }}>
          THE RIVER EXPEDITION
        </span>
        <span style={{
          fontSize: '0.8rem',
          color: '#ffca5f',
          background: 'rgba(255,233,168,0.15)',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid #ffe9a8',
        }}>
          Welcome Harbour
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          WASD/Arrows move · Shift run · E board · Click explore
        </span>
        <button
          onClick={onBack}
          style={{
            background: 'linear-gradient(135deg, #ffe9a8, #ffca5f)',
            border: 'none',
            color: '#142030',
            padding: '8px 16px',
            borderRadius: '6px',
            fontFamily: '"Trebuchet MS", system-ui, sans-serif',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          ← Back to Portfolio
        </button>
      </div>
    </div>
  );
}