/**
 * Activity Tower — 3D GitHub Activity Visualization
 * Manual rotation, per-commit apartments, per-branch floors, repo-colored.
 * Data: raw.githubusercontent.com/.../profile-makeover/data/activity-tower.json
 */
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { TowerData, TowerRepo, TowerBranch, TowerCommit } from './types';
import './ActivityTower.css';

const DATA_URL = 'https://raw.githubusercontent.com/yashmahajan11234567/yashmahajan11234567/profile-makeover/data/activity-tower.json';

const FLOOR_H = 1.15;
const SLAB_H = 0.18;
const ROOF_H = 0.55;
const SLAB_W = 13;
const SLAB_D = 5.2;
const UNIT_W = 0.62;
const UNIT_H = 0.72;
const UNIT_D = 0.62;
const UNIT_GAP = 1.12;

const INITIAL_CAMERA = new THREE.Vector3(16, 14, 22);
const INITIAL_TARGET = new THREE.Vector3(0, 16, 0);

function hexToColor(hex: string) {
  return new THREE.Color(hex);
}

interface FloorData {
  repoIdx: number;
  branchIdx: number;
  branch: TowerBranch;
  y: number;
  commits: Array<{ commit: TowerCommit; repoIdx: number }>;
}
interface RepoMeta {
  repo: TowerRepo;
  color: THREE.Color;
  yStart: number;
  yEnd: number;
  floorCount: number;
}

function useTowerData() {
  const [data, setData] = useState<TowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('Network'); return r.json(); })
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError('Could not load activity data.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);
  return { data, loading, error };
}

// CameraController: lives inside Canvas, exposes reset() via ref
interface CameraControllerRef {
  reset: () => void;
}
const CameraController = forwardRef<CameraControllerRef, {}>((_props, ref) => {
  const { camera, controls } = useThree();
  const orbitControls = controls as OrbitControlsImpl | null;
  useImperativeHandle(ref, () => ({
    reset: () => {
      camera.position.copy(INITIAL_CAMERA);
      if (orbitControls) {
        orbitControls.target.copy(INITIAL_TARGET);
        orbitControls.update();
      }
    }
  }));
  return null;
});

function ActivityTowerInner({ data, onExit }: { data: TowerData; onExit: () => void }) {
  const cameraControllerRef = useRef<CameraControllerRef>(null);

  // Flatten data for instanced rendering
  const { floors, repos, totalHeight, totalUnits, totalCommitsAcrossAll } = useMemo(() => {
    if (!data) return { floors: [] as FloorData[], repos: [] as RepoMeta[], totalHeight: 0, totalUnits: 0, totalCommitsAcrossAll: 0 };
    const floors: FloorData[] = [];
    const repos: RepoMeta[] = [];
    let y = 0;
    let unitCount = 0;
    let totalCommits = 0;
    data.repositories.forEach((repo, ri) => {
      const color = hexToColor(repo.color);
      let repoFloorCount = 0;
      const yStart = y;
      repo.branches.forEach((branch, bi) => {
        const commits = branch.commits.map((c) => ({ commit: c, repoIdx: ri }));
        floors.push({ repoIdx: ri, branchIdx: bi, branch, y, commits });
        y += FLOOR_H;
        unitCount += commits.length;
        repoFloorCount++;
      });
      repos.push({ repo, color, yStart, yEnd: y, floorCount: repoFloorCount });
      totalCommits += repo.branches.reduce((s, b) => s + b.total_commits, 0);
    });
    const totalH = y + repos.length * ROOF_H;
    return { floors, repos, totalHeight: totalH, totalUnits: unitCount, totalCommitsAcrossAll: totalCommits };
  }, [data]);

  // Refs for instanced meshes
  const floorMeshRef = useRef<THREE.InstancedMesh>(null);
  const unitMeshRef = useRef<THREE.InstancedMesh>(null);

  // Selected repo for filtering
  const [selectedRepoIdx, setSelectedRepoIdx] = useState<number | null>(null);
  // Hover / select state
  const [hoveredCommit, setHoveredCommit] = useState<{ commit: TowerCommit; repoIdx: number; branchIdx: number; clientX: number; clientY: number } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<FloorData | null>(null);

  // Controls ref for reset
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Build / update instance colors when selection changes
  useEffect(() => {
    const fc = floorColorAttrRef.current!;
    const uc = unitColorAttrRef.current!;
    const dimFloor = new THREE.Color(0x1a2230);
    const dimUnit = new THREE.Color(0x0f141e);
    let fi = 0;
    let ui = 0;
    floors.forEach(f => {
      const repo = repos[f.repoIdx];
      const isSel = selectedRepoIdx === null || f.repoIdx === selectedRepoIdx;
      fc.setXYZ(fi, isSel ? repo.color.r : dimFloor.r, isSel ? repo.color.g : dimFloor.g, isSel ? repo.color.b : dimFloor.b);
      fi++;
      f.commits.forEach(() => {
        const c = isSel ? repo.color : dimUnit;
        uc.setXYZ(ui, c.r, c.g, c.b);
        ui++;
      });
    });
    fc.needsUpdate = true;
    uc.needsUpdate = true;
  }, [selectedRepoIdx, floors, repos]);

  const handleFloorClick = useCallback((event: any) => {
    const id = event.instanceId;
    if (id >= 0 && id < floors.length) setSelectedBranch(floors[id]);
  }, [floors]);
  const handleUnitClick = useCallback((event: any) => {
    const id = event.instanceId;
    let fi = 0;
    for (const f of floors) {
      if (id < fi + f.commits.length) {
        const idx = id - fi;
        const c = f.commits[idx].commit;
        window.open(c.url, '_blank', 'noopener,noreferrer');
        return;
      }
      fi += f.commits.length;
    }
  }, [floors]);
  const handleUnitOver = useCallback((event: any) => {
    const id = event.instanceId;
    let fi = 0;
    for (const f of floors) {
      if (id < fi + f.commits.length) {
        const idx = id - fi;
        const c = f.commits[idx].commit;
        setHoveredCommit({ commit: c, repoIdx: f.repoIdx, branchIdx: f.branchIdx, clientX: event.event.clientX, clientY: event.event.clientY });
        return;
      }
      fi += f.commits.length;
    }
  }, [floors]);
  const handleUnitOut = useCallback(() => setHoveredCommit(null), []);
  const handleFloorOver = useCallback((event: any) => { if (!selectedBranch) setSelectedBranch(floors[event.instanceId]); }, [floors, selectedBranch]);
  const handleFloorOut = useCallback((event: any) => { if (selectedBranch === floors[event.instanceId]) setSelectedBranch(null); }, [floors]);

  // Floor instance matrix
  const floorMatrix = useMemo(() => {
    const arr = new Float32Array(floors.length * 16);
    floors.forEach((f, i) => {
      const mat = new THREE.Matrix4().makeTranslation(0, f.y + SLAB_H / 2, 0).scale(new THREE.Vector3(SLAB_W, SLAB_H, SLAB_D));
      mat.toArray(arr, i * 16);
    });
    return arr;
  }, [floors]);

  // Unit instance matrix
  const unitMatrix = useMemo(() => {
    const arr = new Float32Array(totalUnits * 16);
    let ui = 0;
    floors.forEach(f => {
      const n = f.commits.length;
      const startX = -((n - 1) * UNIT_GAP) / 2;
      f.commits.forEach((_c, j) => {
        const x = startX + j * UNIT_GAP;
        const y = f.y + UNIT_H / 2 + 0.15;
        const mat = new THREE.Matrix4().makeTranslation(x, y, 0).scale(new THREE.Vector3(UNIT_W, UNIT_H, UNIT_D));
        mat.toArray(arr, ui * 16);
        ui++;
      });
    });
    return arr;
  }, [floors, totalUnits]);

  // Initial floor colors array
  const floorColorAttrRef = useRef<THREE.InstancedBufferAttribute>(null);
  const unitColorAttrRef = useRef<THREE.InstancedBufferAttribute>(null);

  const floorColorsArray = useMemo(() => {
    const arr = new Float32Array(floors.length * 3);
    floors.forEach((f, i) => {
      const c = repos[f.repoIdx].color;
      arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [floors, repos]);

  // Initial unit colors array (brightness by recency)
  const unitColorsArray = useMemo(() => {
    const arr = new Float32Array(totalUnits * 3);
    let ui = 0;
    floors.forEach(f => {
      const n = f.commits.length;
      const repoColor = repos[f.repoIdx].color;
      f.commits.forEach((_c, j) => {
        const factor = 0.35 + 0.65 * (1 - j / Math.max(1, n - 1));
        const c = repoColor.clone().multiplyScalar(factor);
        arr[ui * 3] = c.r; arr[ui * 3 + 1] = c.g; arr[ui * 3 + 2] = c.b;
        ui++;
      });
    });
    return arr;
  }, [floors, repos, totalUnits]);

  const floorColorAttr = useMemo(() => {
    const attr = new THREE.InstancedBufferAttribute(floorColorsArray, 3);
    floorColorAttrRef.current = attr;
    return attr;
  }, [floorColorsArray]);
  const unitColorAttr = useMemo(() => {
    const attr = new THREE.InstancedBufferAttribute(unitColorsArray, 3);
    unitColorAttrRef.current = attr;
    return attr;
  }, [unitColorsArray]);

  return (
    <div className="tower-container">
      <div className="tower-ui">
        <div className="tower-top-left">
          <h2 className="tower-title">GitHub Activity Tower</h2>
          <div className="tower-overview">
            {data && (
              <>
                <span>Repos: {data.totals.repositories}</span>
                <span>Floors: {data.totals.branches}</span>
                <span>Commits shown: {data.totals.commits_displayed}</span>
                <span>Total commits: {totalCommitsAcrossAll}</span>
              </>
            )}
          </div>
        </div>
        <div className="tower-top-right">
          <select
            className="repo-selector"
            value={selectedRepoIdx === null ? '' : String(selectedRepoIdx)}
            onChange={e => setSelectedRepoIdx(e.target.value === '' ? null : Number(e.target.value))}
            aria-label="Filter by repository"
          >
            <option value="">All repositories</option>
            {repos.map((r, i) => (
              <option key={r.repo.name} value={i} style={{ color: r.repo.color }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: r.repo.color, marginRight: 6, borderRadius: 2, verticalAlign: 'middle' }} /> {r.repo.name}
              </option>
            ))}
          </select>
          <button className="tower-btn" onClick={() => cameraControllerRef.current?.reset()}>Reset View</button>
          <button className="tower-btn exit-btn" onClick={onExit}>Exit</button>
        </div>
        {selectedBranch && (
          <div className="tower-branch-panel">
            <strong>{selectedBranch.branch.name}</strong>
            <span>@ {repos[selectedBranch.repoIdx].repo.name}</span>
            <span>Latest: {selectedBranch.commits[0]?.commit.message || '—'}</span>
            <span>Shown: {selectedBranch.branch.commits_displayed} / {selectedBranch.branch.total_commits}</span>
            <a href={selectedBranch.branch.url} target="_blank" rel="noopener noreferrer">View branch on GitHub →</a>
          </div>
        )}
        {hoveredCommit && (
          <div className="tower-tooltip" style={{ left: hoveredCommit.clientX + 12, top: hoveredCommit.clientY + 12 }}>
            <strong>{hoveredCommit.commit.sha}</strong>
            <span>{hoveredCommit.commit.message}</span>
            <span>{new Date(hoveredCommit.commit.date).toLocaleString()}</span>
            <span>{repos[hoveredCommit.repoIdx].repo.name} / {floors[hoveredCommit.branchIdx]?.branch.name || 'branch'}</span>
          </div>
        )}
      </div>

      <Canvas
        fallback={<div className="tower-fallback">WebGL not available. <a href={DATA_URL} target="_blank" rel="noopener">View raw data</a>.</div>}
        camera={{ position: INITIAL_CAMERA.toArray(), fov: 45, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onPointerMove={_ => {}}
      >
        <color attach="background" args={['#050a14']} />
        <fog attach="fog" args={['#050a14', 12, 100]} />

        {/* Ground */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#081220" roughness={0.9} metalness={0.1} />
        </mesh>
        <gridHelper args={[80, 40, '#142840', '#0a182c']} />

        {/* Lights */}
        <ambientLight intensity={0.35} color="#3a5a8a" />
        <directionalLight position={[20, 30, 15]} intensity={0.8} color="#cfe8ff" castShadow>
          <orthographicCamera attach="shadowCamera" args={[-30, 30, 30, -30, 0.1, 80]} />
        </directionalLight>
        <pointLight position={[0, totalHeight / 2, 20]} intensity={0.6} color="#00f0ff" distance={80} decay={1.5} />
        <pointLight position={[0, totalHeight / 2, -20]} intensity={0.4} color="#0088ff" distance={80} decay={1.5} />

        {/* Repo roof slabs + labels */}
        {repos.map((r, _i) => {
          const y = r.yEnd + ROOF_H / 2;
          return (
            <group key={r.repo.name}>
              <mesh position={[0, y, 0]}>
                <boxGeometry args={[SLAB_W + 0.6, ROOF_H, SLAB_D + 0.4]} />
                <meshStandardMaterial color={r.color} emissive={r.color} emissiveIntensity={0.15} roughness={0.3} metalness={0.5} />
              </mesh>
              <Html
                transform
                position={[0, y + ROOF_H / 2 + 0.3, 0]}
                distanceFactor={4}
                className="repo-roof-label"
                style={{ pointerEvents: 'none' }}
              >
                <span style={{
                  background: 'rgba(5,10,20,0.85)',
                  color: r.color.getStyle(),
                  border: `1px solid ${r.color.getStyle()}`,
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
                }}>{r.repo.name}{r.repo.is_fork && ' (fork)'}</span>
              </Html>
            </group>
          );
        })}

        {/* Floors InstancedMesh */}
        // @ts-ignore - R3F v9 type mismatch for InstancedMesh props
        // @ts-ignore - R3F v9 expects args prop
        // @ts-ignore
        <instancedMesh
          // @ts-ignore - R3F v9 type mismatch for InstancedMesh props
          ref={floorMeshRef}
          count={floors.length}
          instanceMatrix={floorMatrix as any}
          args={[undefined, undefined, floors.length]}
          onClick={handleFloorClick}
          onPointerOver={handleFloorOver}
          onPointerOut={handleFloorOut}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            vertexColors
            roughness={0.4}
            metalness={0.4}
          >
            // @ts-ignore - R3F v9 primitive with InstancedBufferAttribute
            <primitive object={floorColorAttr} attach="instanceColor" />
          </meshStandardMaterial>
        </instancedMesh>

        {/* Units InstancedMesh */}
        // @ts-ignore - R3F v9 type mismatch for InstancedMesh props
        // @ts-ignore - R3F v9 expects args prop
        // @ts-ignore
        <instancedMesh
          // @ts-ignore - R3F v9 type mismatch for InstancedMesh props
          ref={unitMeshRef}
          count={totalUnits}
          instanceMatrix={unitMatrix as any}
          args={[undefined, undefined, totalUnits]}
          onClick={handleUnitClick}
          onPointerOver={handleUnitOver}
          onPointerOut={handleUnitOut}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            vertexColors
            roughness={0.25}
            metalness={0.55}
          >
            // @ts-ignore - R3F v9 primitive with InstancedBufferAttribute
            <primitive object={unitColorAttr} attach="instanceColor" />
          </meshStandardMaterial>
        </instancedMesh>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          autoRotate={false}
          minDistance={6}
          maxDistance={80}
          maxPolarAngle={Math.PI * 0.495}
          target={INITIAL_TARGET.toArray()}
        />
        <CameraController ref={cameraControllerRef} />
      </Canvas>
    </div>
  );
}

export function ActivityTower({ onExit }: { onExit: () => void }) {
  const { data, loading, error } = useTowerData();
  if (loading) return <div className="tower-container tower-loading">Loading GitHub activity…</div>;
  if (error) return <div className="tower-container tower-error">{error} <button onClick={() => window.location.reload()}>Retry</button></div>;
  return <ActivityTowerInner data={data!} onExit={onExit} />;
}