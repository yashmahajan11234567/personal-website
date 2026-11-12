/**
 * NavDebug — development-only navigation overlay (?nav=1).
 *
 * NEVER part of the production bundle: it is loaded through a dynamic import
 * gated on `import.meta.env.DEV`, which Vite replaces with `false` at build
 * time, so the chunk is neither emitted nor fetched in production builds.
 *
 * Layers (each independently toggleable):
 *   walkable cells · blocked cells · planned path · interaction radii ·
 *   approach positions · unreachable hotspots · player region · player marker
 *
 * The panel lives in the DOM (NavDebugPanel); the layers live in the scene
 * (default export). Both read the same cached navigation grid — they never
 * mutate world or gameplay state.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS } from './world';
import { pilot } from './state';
import {
  getGrid,
  cellHeight,
  cellWalkable,
  cellRegion,
  approachFor,
  gridStats,
  validateWorld,
  type WorldReport,
} from './navigation';

const GREEN = 0x2ecc71;
const RED = 0xe74c3c;
const BLUE = 0x3aa0ff;
const YELLOW = 0xf1c40f;
const CYAN = 0x00e5ff;
const ORANGE = 0xff8c00;

export interface NavDebugFlags {
  walkable: boolean;
  blocked: boolean;
  path: boolean;
  radii: boolean;
  approaches: boolean;
  unreachable: boolean;
  region: boolean;
  player: boolean;
}

export const DEFAULT_FLAGS: NavDebugFlags = {
  walkable: true,
  blocked: true,
  path: true,
  radii: false,
  approaches: false,
  unreachable: true,
  region: false,
  player: true,
};

/** Flat quad geometry reused by every cell layer. */
const CELL_GEO = new THREE.PlaneGeometry(1, 1);

function CellLayer({
  visible,
  color,
  pick,
  opacity = 0.28,
}: {
  visible: boolean;
  color: number;
  /** (i, j, height) → include this cell? */
  pick: (i: number, j: number, h: number) => boolean;
  opacity?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = useMemo(() => {
    const g = getGrid();
    let n = 0;
    for (let j = g.minZ; j < g.minZ + g.h; j++) {
      for (let i = g.minX; i < g.minX + g.w; i++) {
        const h = cellHeight(i, j);
        if (!Number.isNaN(h) && pick(i, j, h)) n++;
      }
    }
    return n;
  }, [pick]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const g = getGrid();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    let n = 0;
    for (let j = g.minZ; j < g.minZ + g.h; j++) {
      for (let i = g.minX; i < g.minX + g.w; i++) {
        const h = cellHeight(i, j);
        if (Number.isNaN(h) || !pick(i, j, h)) continue;
        m.compose(new THREE.Vector3(i, h + 0.03, j), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(n++, m);
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }, [pick]);

  if (!visible || count === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[CELL_GEO, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
}

/** The scene-side overlay layers. */
export default function NavDebugLayers({ flags }: { flags: NavDebugFlags }) {
  // path line object — geometry swapped only when the pilot's route changes
  const pathObj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const mat = new THREE.LineBasicMaterial({ color: YELLOW });
    return new THREE.Line(geom, mat);
  }, []);
  const pathKeyRef = useRef<string>('');
  const playerRef = useRef<THREE.Mesh>(null);

  const approaches = useMemo(() => {
    const out: { x: number; z: number; ok: boolean }[] = [];
    for (const h of HOTSPOTS) {
      const ap = approachFor(h.x, h.z, h.r);
      out.push(ap ? { x: ap.x, z: ap.z, ok: true } : { x: h.x, z: h.z, ok: false });
    }
    return out;
  }, []);

  useFrame(() => {
    // player marker
    if (playerRef.current) {
      playerRef.current.position.set(pilot.pos.x, pilot.pos.y + 0.9, pilot.pos.z);
    }
    // path line
    const pts: THREE.Vector3[] = [];
    if (pilot.path && flags.path) {
      for (let k = pilot.pathIndex; k < pilot.path.length; k++) {
        const p = pilot.path[k];
        const h = cellHeight(Math.round(p.x), Math.round(p.z));
        pts.push(new THREE.Vector3(p.x, (Number.isNaN(h) ? pilot.pos.y : h) + 0.12, p.z));
      }
    }
    const key = pts.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';');
    if (key !== pathKeyRef.current) {
      pathKeyRef.current = key;
      const geom = new THREE.BufferGeometry().setFromPoints(
        pts.length >= 2 ? pts : [new THREE.Vector3(), new THREE.Vector3()],
      );
      pathObj.geometry.dispose();
      pathObj.geometry = geom;
      pathObj.visible = pts.length >= 2;
    }
  });

  return (
    <group>
      <CellLayer
        visible={flags.walkable}
        color={GREEN}
        pick={(i, j) => cellWalkable(i, j)}
      />
      <CellLayer
        visible={flags.blocked}
        color={RED}
        pick={(i, j) => !cellWalkable(i, j)}
      />
      {flags.region && <RegionLayer />}
      {flags.path && <primitive object={pathObj} visible={false} />}
      {flags.radii &&
        HOTSPOTS.map((h) => (
          <mesh key={h.id} position={[h.x, h.y + 0.06, h.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[h.r - 0.08, h.r, 40]} />
            <meshBasicMaterial color={BLUE} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
      {flags.approaches &&
        approaches.map((a, k) =>
          a.ok ? (
            <mesh key={`ap${k}`} position={[a.x, (cellHeight(Math.round(a.x), Math.round(a.z)) || 0) + 0.08, a.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.3, 12]} />
              <meshBasicMaterial color={CYAN} transparent opacity={0.9} depthWrite={false} />
            </mesh>
          ) : null,
        )}
      {flags.unreachable &&
        approaches.map((a, k) =>
          a.ok ? null : (
            <mesh key={`un${k}`} position={[a.x, (cellHeight(Math.round(a.x), Math.round(a.z)) || 0) + 0.1, a.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 0.8, 24]} />
              <meshBasicMaterial color={ORANGE} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          ),
        )}
      {flags.player && (
        <mesh ref={playerRef}>
          <boxGeometry args={[0.35, 1.8, 0.35]} />
          <meshBasicMaterial color={YELLOW} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Highlight the connected region the player currently stands in. */
function RegionLayer() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const regionRef = useRef(-2);
  const sizeRef = useRef(0);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const r = cellRegion(Math.round(pilot.pos.x), Math.round(pilot.pos.z));
    if (r === regionRef.current) return;
    regionRef.current = r;
    const g = getGrid();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    let n = 0;
    for (let j = g.minZ; j < g.minZ + g.h && n < sizeRef.current; j++) {
      for (let i = g.minX; i < g.minX + g.w && n < sizeRef.current; i++) {
        if (cellRegion(i, j) !== r) continue;
        const h = cellHeight(i, j);
        if (Number.isNaN(h)) continue;
        m.compose(new THREE.Vector3(i, h + 0.05, j), q, new THREE.Vector3(0.9, 0.9, 0.9));
        mesh.setMatrixAt(n++, m);
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });

  // size the instance buffer once from the largest possible region
  if (sizeRef.current === 0) {
    const g = getGrid();
    let n = 0;
    for (let s = 0; s < g.walkable.length; s++) if (g.walkable[s]) n++;
    sizeRef.current = n;
  }
  if (sizeRef.current === 0) return null;
  return (
    <instancedMesh ref={meshRef} args={[CELL_GEO, undefined, sizeRef.current]} frustumCulled={false}>
      <meshBasicMaterial color={BLUE} transparent opacity={0.18} depthWrite={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* DOM panel                                                           */
/* ------------------------------------------------------------------ */

export function NavDebugPanel({ flags, setFlags }: { flags: NavDebugFlags; setFlags: (f: NavDebugFlags) => void }) {
  const [stats, setStats] = useState('');
  const [report, setReport] = useState<WorldReport | null>(null);

  const toggle = (k: keyof NavDebugFlags) => setFlags({ ...flags, [k]: !flags[k] });

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        right: 12,
        zIndex: 90,
        background: 'rgba(15, 18, 24, 0.92)',
        color: '#dfe7ef',
        font: '12px/1.5 ui-monospace, monospace',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.18)',
        minWidth: 230,
        userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>NAV DEBUG (?nav=1)</div>
      {(
        [
          ['walkable', 'Walkable cells'],
          ['blocked', 'Blocked cells'],
          ['path', 'Planned path'],
          ['radii', 'Interaction radii'],
          ['approaches', 'Approach points'],
          ['unreachable', 'Unreachable hotspots'],
          ['region', 'Player region'],
          ['player', 'Player marker'],
        ] as [keyof NavDebugFlags, string][]
      ).map(([k, label]) => (
        <label key={k} style={{ display: 'block', cursor: 'pointer' }}>
          <input type="checkbox" checked={flags[k]} onChange={() => toggle(k)} /> {label}
        </label>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => {
            const s = gridStats();
            setStats(`${s.walkableCells}/${s.cells} walkable · ${s.regions} region(s) · grid ${s.buildMs.toFixed(0)}ms`);
          }}
          style={btn}
        >
          Stats
        </button>
        <button
          type="button"
          onClick={() => {
            const r = validateWorld();
            setReport(r);
            // eslint-disable-next-line no-console
            console.log('[cwv] world validation report', r);
          }}
          style={btn}
        >
          Run validation
        </button>
      </div>
      {stats && <div style={{ marginTop: 6 }}>{stats}</div>}
      {report && (
        <div style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto' }}>
          <div style={{ color: report.ok ? GREEN_TEXT : RED_TEXT }}>
            {report.ok ? 'PASS' : 'FAIL'} — {report.checks.filter((c) => c.passed).length}/{report.checks.length} checks
          </div>
          {report.errors.map((e, i) => (
            <div key={i} style={{ color: RED_TEXT }}>
              ✗ {e.id}: {e.object ?? ''} {e.reason}
            </div>
          ))}
          {report.warnings.map((w, i) => (
            <div key={i} style={{ color: ORANGE_TEXT }}>
              ! {w.id}: {w.reason}
            </div>
          ))}
          {report.ok &&
            report.checks.map((c, i) => (
              <div key={i}>
                ✓ {c.name} — {c.detail}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  font: 'inherit',
  background: 'rgba(255,255,255,0.12)',
  color: '#dfe7ef',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 5,
  padding: '3px 8px',
  cursor: 'pointer',
};

const GREEN_TEXT = '#7bed9f';
const RED_TEXT = '#ff7f7f';
const ORANGE_TEXT = '#ffb26b';
