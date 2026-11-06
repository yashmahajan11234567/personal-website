/**
 * Docker whale cargo boat — recognizable whale-shaped hull (blue top / white
 * belly via AI whale-skin texture on a scaled sphere), tail + pectoral fins,
 * eye, stacked blue containers, cabin, animated wake. Hybrid geometry+texture
 * per Part F.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTex } from './materials';

export function WhaleBoat({ groupRef }: { groupRef: React.MutableRefObject<THREE.Group | null> }) {
  const whale = useTex('tex_whale');
  const container = useTex('tex_container');
  const hullRef = useRef<THREE.Mesh>(null);
  const wakeRef = useRef<THREE.Mesh>(null);

  const wakeTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 128);
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.45})`;
      const y = 64 + (Math.random() - 0.5) * 110;
      ctx.beginPath(); ctx.ellipse(Math.random() * 256, y, 14 + Math.random() * 38, 3 + Math.random() * 6, 0, 0, 7); ctx.fill();
    }
    // bright V at the stern
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.moveTo(250, 64); ctx.lineTo(200, 30); ctx.lineTo(200, 98); ctx.closePath(); ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }, []);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (g) {
      g.position.y = 0.12 + Math.sin(clock.elapsedTime * 1.1) * 0.07;
      g.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.03;
      g.rotation.x = Math.sin(clock.elapsedTime * 0.6 + 1) * 0.02;
    }
    if (hullRef.current) hullRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.015;
    if (wakeRef.current) {
      const m = wakeRef.current.material as THREE.MeshBasicMaterial;
      if (m.map) m.map.offset.x = -clock.elapsedTime * 0.6;
    }
  });

  return (
    <group ref={groupRef} position={[32, 6, 0]}>
      {/* hull: whale skin texture, blue-tinted so the top reads docker blue */}
      <mesh ref={hullRef} castShadow position={[0, 0.55, 0]} scale={[3.4, 1.0, 1.3]}>
        <sphereGeometry args={[1, 28, 20]} />
        <meshStandardMaterial map={whale} color="#7cc0f0" roughness={0.5} />
      </mesh>
      {/* white waterline belly stripe both sides */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.3, s * 1.29]}>
          <boxGeometry args={[5.4, 0.34, 0.08]} />
          <meshStandardMaterial color="#f4f8fb" roughness={0.5} />
        </mesh>
      ))}
      {/* white belly: slightly wider lower sphere so it shows as a white underside */}
      <mesh castShadow position={[0, 0.18, 0]} scale={[3.42, 0.62, 1.4]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#f4f8fb" roughness={0.5} />
      </mesh>
      {/* tail flukes: horizontal two-lobe tail */}
      <group position={[-3.55, 0.95, 0]} rotation={[0, -0.15, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.2, 0, s * 0.78]} rotation={[0, 0, Math.PI / 2 + s * 0.55]} castShadow>
            <coneGeometry args={[0.55, 1.5, 4]} />
            <meshStandardMaterial color="#1d7ec4" roughness={0.55} flatShading />
          </mesh>
        ))}
      </group>
      {/* pectoral fins */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.2, 0.25, s * 1.25]} rotation={[0, 0, s * 1.15]} castShadow>
          <coneGeometry args={[0.32, 0.95, 4]} />
          <meshStandardMaterial color="#1d7ec4" roughness={0.6} flatShading />
        </mesh>
      ))}
      {/* eyes — large and on both bow sides so the face reads from any angle */}
      {[-1, 1].map((s) => (
        <group key={s} position={[2.45, 0.9, s * 0.66]}>
          <mesh>
            <sphereGeometry args={[0.24, 10, 8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0.14, 0.03, s * 0.1]}>
            <sphereGeometry args={[0.12, 8, 6]} />
            <meshStandardMaterial color="#12232e" roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* containers on deck — blue-tinted so the AI texture reads docker blue */}
      {[-1.1, 0.1, 1.3].map((x, i) => (
        <mesh key={i} position={[x, 1.35, i === 1 ? 0 : (i === 0 ? -0.62 : 0.62)]} castShadow>
          <boxGeometry args={[1.05, 0.8, 1.05]} />
          <meshStandardMaterial map={container} color="#6ea8e8" roughness={0.6} />
        </mesh>
      ))}
      {/* wheelhouse */}
      <mesh position={[1.9, 1.5, 0]} castShadow>
        <boxGeometry args={[0.9, 0.85, 1.0]} />
        <meshStandardMaterial color="#f4f8fb" roughness={0.4} />
      </mesh>
      <mesh position={[2.36, 1.62, 0]}>
        <boxGeometry args={[0.04, 0.4, 0.7]} />
        <meshStandardMaterial color="#17364a" roughness={0.2} metalness={0.4} />
      </mesh>
      {/* cabin roof */}
      <mesh position={[1.9, 1.98, 0]} castShadow>
        <boxGeometry args={[1.0, 0.12, 1.1]} />
        <meshStandardMaterial color="#e0483e" roughness={0.7} />
      </mesh>
      {/* wake */}
      <mesh ref={wakeRef} rotation={[-Math.PI / 2, 0, 0]} position={[-4.2, 0.05, 0]}>
        <planeGeometry args={[8, 3.6]} />
        <meshBasicMaterial map={wakeTex} transparent opacity={1} depthWrite={false} />
      </mesh>
    </group>
  );
}
