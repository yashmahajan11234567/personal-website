/**
 * Cloud World 2.0 — floating village labels (HTML billboards).
 *
 * Fresh implementation using drei's <Html> portal: each project house gets a
 * readable name floating above it, occlusion-free, styled from the world
 * palette. Hidden while a panel is open so reading stays uncluttered.
 */

import { Html } from '@react-three/drei';
import { useInteraction } from '../gameplay/store';
import type { WorldLabel } from '../core/types';

export function VillageLabels({ labels }: { labels: WorldLabel[] }): React.ReactElement {
  const openPanel = useInteraction((s) => s.openPanel);
  return (
    <>
      {labels.map((l) => (
        <Html
          key={`${l.label}-${l.x}-${l.z}`}
          position={[l.x, l.y, l.z]}
          center
          distanceFactor={42}
          zIndexRange={[10, 0]}
          style={{ display: openPanel ? 'none' : undefined }}
        >
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(20, 26, 36, 0.86)',
              border: `1.5px solid ${hexStringFrom(l.accent)}`,
              color: '#f5f7fa',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}
          >
            {l.label}
          </div>
        </Html>
      ))}
    </>
  );
}

function hexStringFrom(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}
