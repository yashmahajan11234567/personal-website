/*
 * SunsetEnvironment — Atlas of Drifting Isles (Hybrid Panorama + Sprite Layers)
 *
 * Layer 1: Main panoramic sunset sky (equirectangular 4096x2048 -> BackSide sphere, radius 1500)
 * Layer 2: Distant mountains (transparent PNG sprite, Z ~ -1100)
 * Layer 3: Mid mountains (transparent PNG sprite, Z ~ -900)
 * Layer 4: Far clouds (3 transparent PNG sprites, Z ~ -800)
 * Layer 5: Mid clouds (2 wide transparent PNG sprites, Z ~ -500)
 * Layer 6: Near clouds (2 transparent PNG sprites, Z ~ -300)
 * Layer 7: Sun disc + additive glow (transparent PNG sprite, matched to panorama sun)
 * Lighting: Directional light matched to sun + warm ambient, NO scene fog
 * NO procedural generation. NO foreground mountains. All assets are pre-rendered images.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

const LAYER_PATH = '/assets/atlas-env/layers';

/* ---------- Helper: load texture with correct color space ---------- */
function useTexture(path: string): THREE.Texture {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(path);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [path]);
}

/* ---------- Sprite factory for billboard layers ---------- */
interface SpriteLayerProps {
  map: THREE.Texture;
  position: [number, number, number];
  scale: [number, number, number];
  renderOrder: number;
  opacity?: number;
  blending?: THREE.Blending;
  depthWrite?: boolean;
  depthTest?: boolean;
}

function SpriteLayer({
  map,
  position,
  scale,
  renderOrder,
  opacity = 1,
  blending = THREE.NormalBlending,
  depthWrite = false,
  depthTest = true,
}: SpriteLayerProps) {
  return (
    <sprite
      position={position}
      scale={scale}
      renderOrder={renderOrder}
    >
      <spriteMaterial
        map={map}
        transparent
        depthWrite={depthWrite}
        depthTest={depthTest}
        fog={false}
        opacity={opacity}
        blending={blending}
        toneMapped={false}
      />
    </sprite>
  );
}

/* ---------- L1: Panorama Sky Sphere ---------- */
export function PanoramaSky() {
  const tex = useTexture(`${LAYER_PATH}/sky-panorama.jpg`);

  return (
    <mesh renderOrder={-20} raycast={false}>
      <sphereGeometry args={[1500, 64, 32]} />
      <meshBasicMaterial
        map={tex}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ---------- L2: Distant Mountains ---------- */
export function DistantMountains() {
  const tex = useTexture(`${LAYER_PATH}/mountains-far.png`);

  return (
    <SpriteLayer
      map={tex}
      position={[0, -100, -1100]}
      scale={[2000, 600, 1]}
      renderOrder={-18}
      opacity={0.6}
    />
  );
}

/* ---------- L3: Mid Mountains ---------- */
export function MidMountains() {
  const tex = useTexture(`${LAYER_PATH}/mountains-mid.png`);

  return (
    <SpriteLayer
      map={tex}
      position={[0, -50, -900]}
      scale={[1800, 500, 1]}
      renderOrder={-16}
      opacity={0.85}
    />
  );
}

/* ---------- L4: Far Clouds (3 drama clouds behind islands) ---------- */
export function FarClouds() {
  const tex = useTexture(`${LAYER_PATH}/clouds-far.png`);

  return (
    <>
      <SpriteLayer
        map={tex}
        position={[-400, 150, -800]}
        scale={[800, 400, 1]}
        renderOrder={-14}
        opacity={0.7}
      />
      <SpriteLayer
        map={tex}
        position={[0, 200, -850]}
        scale={[900, 450, 1]}
        renderOrder={-14}
        opacity={0.6}
      />
      <SpriteLayer
        map={tex}
        position={[400, 120, -820]}
        scale={[700, 350, 1]}
        renderOrder={-14}
        opacity={0.65}
      />
    </>
  );
}

/* ---------- L5: Mid Clouds (2 wide clouds framing islands left/right) ---------- */
export function MidClouds() {
  const leftTex = useTexture(`${LAYER_PATH}/clouds-mid-left.png`);
  const rightTex = useTexture(`${LAYER_PATH}/clouds-mid-right.png`);

  return (
    <>
      <SpriteLayer
        map={leftTex}
        position={[-500, 50, -500]}
        scale={[1000, 300, 1]}
        renderOrder={-12}
        opacity={0.85}
      />
      <SpriteLayer
        map={rightTex}
        position={[500, 30, -520]}
        scale={[900, 280, 1]}
        renderOrder={-12}
        opacity={0.8}
      />
    </>
  );
}

/* ---------- L6: Near Clouds (2 puffs between camera and islands) ---------- */
export function NearClouds() {
  const tex1 = useTexture(`${LAYER_PATH}/clouds-near-1.png`);
  const tex2 = useTexture(`${LAYER_PATH}/clouds-near-2.png`);

  return (
    <>
      <SpriteLayer
        map={tex1}
        position={[-200, -50, -300]}
        scale={[400, 200, 1]}
        renderOrder={-10}
        opacity={0.9}
      />
      <SpriteLayer
        map={tex2}
        position={[200, -30, -320]}
        scale={[350, 180, 1]}
        renderOrder={-10}
        opacity={0.85}
      />
    </>
  );
}

/* ---------- L7: Sun Disc + Additive Glow ---------- */
// Sun position matched to panorama bright spot (approx azimuth 30° right, elevation -10°)
const SUN_POSITION = new THREE.Vector3(400, -80, -500);

export function SunLayer() {
  const tex = useTexture(`${LAYER_PATH}/sun-disc.png`);

  return (
    <group position={SUN_POSITION}>
      {/* Outer additive glow */}
      <SpriteLayer
        map={tex}
        position={[0, 0, 0]}
        scale={[500, 500, 1]}
        renderOrder={-9}
        opacity={0.25}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />
      {/* Core sun disc */}
      <SpriteLayer
        map={tex}
        position={[0, 0, 0]}
        scale={[200, 200, 1]}
        renderOrder={-8}
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />
    </group>
  );
}

/* ---------- Sunset Lighting (matched to sun position) ---------- */
export function SunsetLighting() {
  const sunDir = SUN_POSITION.clone().normalize();

  return (
    <>
      {/* Warm ambient - no cool hemisphere */}
      <ambientLight intensity={0.55} color="#ffedd0" />

      {/* Directional light from sun position */}
      <directionalLight
        position={[sunDir.x * 200, Math.max(sunDir.y * 200, 20), sunDir.z * 200]}
        intensity={2.2}
        color="#ffcc80"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-120}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-bias={-0.0005}
        shadow-normal-bias={0.02}
      />
    </>
  );
}

/* ---------- Complete Environment Composition ---------- */
export function SunsetEnvironment() {
  return (
    <>
      <PanoramaSky />
      <DistantMountains />
      <MidMountains />
      <FarClouds />
      <MidClouds />
      <NearClouds />
      <SunLayer />
      <SunsetLighting />
    </>
  );
}