/*
 * Island — Atlas of Drifting Isles
 *
 * Each island is a self-contained interactive 3D object:
 *   - Outer group: world position (never modified by camera transitions)
 *   - Rotation group: user-controlled drag rotation (selected island only)
 *   - Model group: GLB geometry + normalization (centered, sitting at y=0)
 *   - Hitbox: invisible raycastable mesh covering the island for pointer events
 *
 * Click/tap selects the island (when not already selected).
 * Drag rotates the selected island horizontally. A drag suppresses selection.
 * All three islands remain loaded and stationary at their original positions
 * even when one is selected.
 */

import { useMemo, Component, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { DestId } from '../experience.data';
import { ISLAND_POS } from './poses';

/* Model heights after normalization, per island (tuned visually for prominence).
 * These were determined from runtime Box3 measurements:
 *   - lighthouse: raw 1.344 x 1.910 x 1.358 -> target height 42 -> scale ~22.0
 *   - windmill:   raw 1.471 x 1.904 x 1.423 -> target height 42 -> scale ~22.1
 *   - pagoda:     raw 1.143 x 1.900 x 1.312 -> target height 42 -> scale ~22.1
 * Apparent sizes are kept comparable across destinations. */
const MODEL_HEIGHT: Record<DestId, number> = {
  lighthouse: 42,
  windmill: 42,
  pagoda: 42,
};

/* Animation signatures per island — purposeful, identity-driven, not decorative.
 * - Windmill: blade rotation (mechanical identity)
 * - Pagoda: cherry blossom petal sway (organic, cultural identity)
 * - Lighthouse: subtle water/lighthouse base movement (coastal identity)
 * These run only when NOT selected; selection freezes the island for precise drag. */
function findSpinNode(root: THREE.Object3D): string {
  let found = '';
  root.traverse((o) => {
    if (!found && /blade|rotor|wing|propeller|fan/i.test(o.name)) found = o.name;
  });
  return found;
}

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
    const spinName = findSpinNode(clone);
    return { clone, s, off: new THREE.Vector3(-center.x, -box.min.y, -center.z), spinName };
  }, [scene, height, id]);

  useFrame((state, dt) => {
    // Windmill blades — mechanical identity
    if (fitted.spinName) {
      const node = fitted.clone.getObjectByName(fitted.spinName);
      if (node) node.rotation.y += dt * 1.4;
    }
    // Pagoda — cherry blossom petal sway (organic, cultural identity)
    if (id === 'pagoda') {
      fitted.clone.traverse((o) => {
        const n = o.name.toLowerCase();
        if ((n.includes('cherry') || n.includes('blossom') || n.includes('petal') || n.includes('leaf')) && !o.userData._swayInit) {
          o.userData._swayInit = true;
          o.userData._baseRot = o.rotation.clone();
        }
        if (o.userData._swayInit) {
          const t = state.clock.elapsedTime;
          o.rotation.z = o.userData._baseRot.z + Math.sin(t * 0.8 + o.id * 0.01) * 0.02;
          o.rotation.x = o.userData._baseRot.x + Math.cos(t * 0.6 + o.id * 0.02) * 0.015;
        }
      });
    }
    // Lighthouse — subtle water/lighthouse base movement (coastal identity)
    if (id === 'lighthouse') {
      fitted.clone.traverse((o) => {
        const n = o.name.toLowerCase();
        if ((n.includes('water') || n.includes('wave') || n.includes('foam') || n.includes('river')) && !o.userData._waveInit) {
          o.userData._waveInit = true;
          o.userData._baseY = o.position.y;
        }
        if (o.userData._waveInit) {
          const t = state.clock.elapsedTime;
          o.position.y = o.userData._baseY + Math.sin(t * 1.2) * 0.01;
        }
      });
    }
  });

  return (
    <group scale={fitted.s}>
      <group position={fitted.off}>
        <primitive object={fitted.clone} />
      </group>
    </group>
  );
}

interface DragState {
  startX: number;
  startRot: number;
  dragging: boolean;
  moved: boolean;
}

export function Island({
  id,
  selected,
  onSelect,
}: {
  id: DestId;
  selected: boolean;
  onSelect: (id: DestId) => void;
}) {
  const pos = ISLAND_POS[id];
  const inner = useRef<THREE.Group>(null);
  const drag = useRef<DragState>({
    startX: 0,
    startRot: 0,
    dragging: false,
    moved: false,
  });

  const SENSITIVITY = 0.0085;
  const THRESHOLD = 6;

  const onPointerDown = (e: any) => {
    if (!selected || !inner.current) return;
    drag.current = {
      startX: e.clientX,
      startRot: inner.current.rotation.y,
      dragging: true,
      moved: false,
    };
    e.target?.setPointerCapture?.(e.pointerId);
    e.stopPropagation();
  };

  const onPointerMove = (e: any) => {
    if (!drag.current.dragging || !inner.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > THRESHOLD) drag.current.moved = true;
    inner.current.rotation.y = drag.current.startRot + dx * SENSITIVITY;
    e.stopPropagation();
  };

  const onPointerUp = (e: any) => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    e.stopPropagation();
  };

  const onPointerCancel = (e: any) => {
    if (!drag.current.dragging) return;
    drag.current.dragging = false;
    e.stopPropagation();
  };

  // Subtle complementary idle float only when NOT selected.
  // The primary identity animations (blades, blossoms, water) run in AtlasModel.
  // This adds a gentle shared breathing motion to the island group.
  useFrame((state) => {
    if (selected) {
      inner.current!.position.y = pos[1];
    } else {
      const t = state.clock.elapsedTime;
      inner.current!.position.y = pos[1] + Math.sin(t * 0.35 + pos[0] * 0.1) * 0.12;
    }
  });

  const onClick = (e: any) => {
    e.stopPropagation();
    // A drag should not trigger selection.
    if (drag.current.moved) return;
    if (!selected) onSelect(id);
  };

  const modelHeight = MODEL_HEIGHT[id];
  // Hitbox centered at the model's vertical centre, radius covers full model
  const hitboxRadius = modelHeight * 0.6;
  const hitboxY = modelHeight * 0.5;

  return (
    <group
      position={pos}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!selected) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Transparent hitbox covering the island for reliable pointer capture */}
      <mesh position={[0, hitboxY, 0]} scale={[hitboxRadius, hitboxRadius, hitboxRadius]} raycast>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} color="white" depthWrite={false} />
      </mesh>

      <group
        ref={inner}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
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
