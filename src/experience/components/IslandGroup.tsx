import { useMemo, Component, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import type { DestId } from '../experience.data';
import { ISLAND_POS } from '../scene/poses';
import { setModelBounds } from '../scene/modelBounds';

const MODEL_HEIGHT: Record<DestId, number> = {
  lighthouse: 32,
  windmill: 32,
  pagoda: 32,
};

class ModelBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(e: unknown) {
    console.error('[experience] island model failed to mount:', e);
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

function AtlasModel({ id, height }: { id: DestId; height: number }) {
  const { scene } = useGLTF(`/assets/atlas/${id}.glb`) as unknown as { scene: THREE.Group };
  const fitted = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = size.y > 0.0001 ? height / size.y : 1;
    // publish fitted world-space size so camera poses can frame the real bounds
    setModelBounds(id, [size.x * s, size.y * s, size.z * s]);
    return { clone, s, off: new THREE.Vector3(-center.x, -box.min.y, -center.z) };
  }, [scene, height, id]);

  return (
    <group scale={fitted.s}>
      <group position={fitted.off}>
        <primitive object={fitted.clone} />
      </group>
    </group>
  );
}

interface IslandGroupProps {
  id: 'lighthouse' | 'windmill' | 'pagoda';
  selected: boolean;
  /** true when another island is selected — this island must be fully hidden */
  hidden: boolean;
  onSelect: (id: 'lighthouse' | 'windmill' | 'pagoda') => void;
  onPointerDown?: (e: any) => void;
  onPointerMove?: (e: any) => void;
  onPointerUp?: (e: any) => void;
  onPointerCancel?: (e: any) => void;
}

export function IslandGroup({
  id,
  selected,
  hidden,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: IslandGroupProps) {
  const pos = ISLAND_POS[id];
  const inner = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Group>(null);
  const drag = useRef<{ startX: number; startRot: number; dragging: boolean; moved: boolean }>({
    startX: 0,
    startRot: 0,
    dragging: false,
    moved: false,
  });

  const handlePointerDown = (e: any) => {
    if (!selected || !inner.current) return;
    drag.current = {
      startX: e.clientX,
      startRot: inner.current.rotation.y,
      dragging: true,
      moved: false,
    };
    e.target?.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
    onPointerDown?.(e);
  };

  const handlePointerMove = (e: any) => {
    if (!drag.current.dragging || !inner.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 6) drag.current.moved = true;
    inner.current.rotation.y = drag.current.startRot + dx * 0.0085;
    e.stopPropagation();
    onPointerMove?.(e);
  };

  const handlePointerUp = (e: any) => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    e.stopPropagation();
    onPointerUp?.(e);
  };

  const handlePointerCancel = (e: any) => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    e.stopPropagation();
    onPointerCancel?.(e);
  };

  // Idle float only when NOT selected; selected islands are held still
  useFrame((state) => {
    if (selected) {
      if (inner.current) inner.current.position.y = pos[1];
    } else {
      const t = state.clock.elapsedTime;
      if (inner.current) {
        inner.current.position.y = pos[1] + Math.sin(t * 0.35 + pos[0] * 0.1) * 0.12;
      }
    }
    // publish the selected island's projected screen box for QA assertions
    if (selected && inner.current && outer.current?.visible) {
      const box = new THREE.Box3().setFromObject(inner.current);
      const v = new THREE.Vector3();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const x of [box.min.x, box.max.x])
        for (const y of [box.min.y, box.max.y])
          for (const z of [box.min.z, box.max.z]) {
            v.set(x, y, z).project(state.camera);
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
          }
      const w = window as unknown as { __islandBox?: Record<string, unknown>; __islandRot?: Record<string, number>; __islandWorld?: unknown };
      w.__islandBox = w.__islandBox || {};
      w.__islandBox[id] = { minX, maxX, minY, maxY };
      w.__islandWorld = { min: box.min.toArray().map((n) => +n.toFixed(2)), max: box.max.toArray().map((n) => +n.toFixed(2)) };
      w.__islandRot = w.__islandRot || {};
      w.__islandRot[id] = inner.current.rotation.y;
      const cw = window as unknown as { __cam?: unknown };
      cw.__cam = { pos: state.camera.position.toArray().map((n) => +n.toFixed(2)), fov: +(state.camera as unknown as { fov: number }).fov.toFixed(2), aspect: +(state.camera as unknown as { aspect: number }).aspect.toFixed(3) };
    }
  });

  // Fade-scale hide/show so unselected islands never pop in or out of frame.
  useEffect(() => {
    const g = outer.current;
    if (!g) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 0 : 0.45;
    gsap.killTweensOf(g.scale);
    if (hidden) {
      gsap.to(g.scale, {
        x: 0.001, y: 0.001, z: 0.001,
        duration: dur, ease: 'power2.in',
        onComplete: () => { g.visible = false; },
      });
    } else {
      g.visible = true;
      if (g.scale.x > 0.5) return; // already shown, nothing to do
      g.scale.setScalar(0.001);
      gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: dur, ease: 'power2.out' });
    }
  }, [hidden]);

  const onClick = (e: any) => {
    e.stopPropagation();
    if (drag.current.moved) return;
    if (!selected) onSelect(id);
  };

  const modelHeight = MODEL_HEIGHT[id];
  const hitboxRadius = modelHeight * 1.2;
  const hitboxY = modelHeight * 0.5;

  return (
    <group
      ref={outer}
      position={pos}
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!selected) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh
        position={[0, hitboxY, 0]}
        scale={[hitboxRadius, hitboxRadius, hitboxRadius]}
        onClick={onClick}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial transparent opacity={0.001} color="white" depthWrite={false} />
      </mesh>

      <group ref={inner}>
        <ModelBoundary>
          <AtlasModel id={id} height={MODEL_HEIGHT[id]} />
        </ModelBoundary>
      </group>
    </group>
  );
}

useGLTF.preload('/assets/atlas/lighthouse.glb');
useGLTF.preload('/assets/atlas/windmill.glb');
useGLTF.preload('/assets/atlas/pagoda.glb');