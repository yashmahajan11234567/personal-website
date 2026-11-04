import { Suspense } from 'react';
import type { DestId } from '../experience.data';
import { DEST_ORDER } from '../experience.data';
import { Island } from './Island';
import { CameraRig } from './CameraRig';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Clean Experience scene: three islands + camera rig + original lighting.
 * No background environment — neutral backdrop for fresh visual development.
 */

// Procedural sky dome (from original working implementation)
function SkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#2c5aa0'); // zenith deep blue
    g.addColorStop(0.45, '#7db8e8');
    g.addColorStop(0.75, '#cfe6f5');
    g.addColorStop(1, '#f2e2c8'); // warm horizon
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[300, 32, 20]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

// Simple cloud puff (from original working implementation)
function CloudPuff({ position, scale, speed, seed }: { position: [number, number, number]; scale: number; speed: number; seed: number }) {
  const ref = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      [0, 1, 2].map((i) => {
        const g = new THREE.IcosahedronGeometry(1, 1);
        const p = g.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < p.count; v++) {
          p.setXYZ(
            v,
            p.getX(v) * (1 + 0.22 * Math.sin(v * 1.7 + seed + i)),
            p.getY(v) * (0.62 + 0.18 * Math.cos(v * 2.1 + seed)),
            p.getZ(v) * (1 + 0.22 * Math.cos(v * 1.3 + seed * 1.3)),
          );
        }
        g.computeVertexNormals();
        return g;
      }),
    [seed],
  );
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.x += dt * speed;
    if (ref.current.position.x > 110) ref.current.position.x = -110;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh geometry={puffs[0]}>
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.95} flatShading />
      </mesh>
      <mesh geometry={puffs[1]} position={[1.5, -0.18, 0.25]} scale={0.75}>
        <meshStandardMaterial color="#f4faff" roughness={1} transparent opacity={0.92} flatShading />
      </mesh>
      <mesh geometry={puffs[2]} position={[-1.35, -0.12, -0.2]} scale={0.8}>
        <meshStandardMaterial color="#f4faff" roughness={1} transparent opacity={0.92} flatShading />
      </mesh>
    </group>
  );
}

function CloudField() {
  return (
    <group>
      <CloudPuff position={[-55, 26, -70]} scale={4.2} speed={0.5} seed={2} />
      <CloudPuff position={[35, 32, -95]} scale={5.2} speed={0.35} seed={5} />
      <CloudPuff position={[62, 20, -50]} scale={3.4} speed={0.6} seed={8} />
      <CloudPuff position={[-20, 36, -110]} scale={4.8} speed={0.3} seed={12} />
      <CloudPuff position={[-85, 16, -40]} scale={3} speed={0.45} seed={17} />
      <CloudPuff position={[15, 14, -35]} scale={2.4} speed={0.55} seed={21} />
    </group>
  );
}

export function ExperienceScene({
  selected,
  onSelect,
}: {
  selected: DestId | null;
  onSelect: (id: DestId) => void;
}) {
  return (
    <>
      {/* Original lighting setup */}
      <SkyDome />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#cfe8ff', '#8fa87a', 0.85]} />
      <directionalLight
        position={[70, 90, 50]}
        intensity={2.2}
        color="#fff2dc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-70}
        shadow-camera-far={260}
      />
      {/* Fog for atmospheric depth */}
      <fog attach="fog" args={['#cfe6f5', 90, 260]} />
      
      <CameraRig selected={selected} />
      <Suspense fallback={null}>
        {DEST_ORDER.map((id) => (
          <Island key={id} id={id} selected={selected === id} onSelect={onSelect} />
        ))}
      </Suspense>
      {/* Subtle clouds for depth */}
      <CloudField />
    </>
  );
}
