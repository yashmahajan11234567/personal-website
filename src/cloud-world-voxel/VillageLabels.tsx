/**
 * VillageLabels — floating name billboards above the five portfolio houses.
 *
 * The village's legibility problem was that all five houses are the same cream
 * box; the fix is identity (roof shape, accent, landmark) plus these labels,
 * which say what each building is from anywhere in the plaza. They are drei
 * Html billboards: always face the camera, scale with distance, and vanish
 * while a panel is open so they never cover the reading surface.
 */
import { Billboard, Html } from '@react-three/drei';
import { VILLAGE_LABELS } from './world';
import { useInteraction } from './interactionStore';

function toHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export function VillageLabels() {
  const panelOpen = useInteraction((s) => !!s.openPanel);
  // Hide with CSS instead of unmounting: drei <Html> portals live in the R3F
  // reconciler's DOM, and conditionally unmounting them makes React's DOM
  // renderer throw removeChild errors when the panel opens (StrictMode).
  const hidden = { display: panelOpen ? 'none' : undefined } as const;
  return (
    <>
      {VILLAGE_LABELS.map((l) => (
        <Billboard key={l.label} position={[l.x, l.y, l.z]}>
          <Html
            center
            distanceFactor={26}
            zIndexRange={[30, 0]}
            className="cwv-label-wrap"
            wrapperClass="cwv-label-wrap"
            style={hidden}
          >
            <div className="cwv-label" style={{ background: toHex(l.accent) }}>
              {l.label}
            </div>
          </Html>
        </Billboard>
      ))}
    </>
  );
}
