import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const LAYER_PATH = '/assets/atlas-env/layers';

/* ---------- Helper: load texture with correct color space ---------- */
function useTexture(path: string): THREE.Texture {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(path);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }, [path]);
}

/* ---------- L1: Fantasy Sky Dome (Procedural gradient for seamless sky) ---------- */
export function FantasySkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    // Fantasy sunset: deep lavender zenith → warm peach/pink horizon
    g.addColorStop(0.00, '#2d1b3d');  // Deep lavender night
    g.addColorStop(0.20, '#4a2c5a');  // Purple
    g.addColorStop(0.40, '#8b4a6b');  // Mauve
    g.addColorStop(0.55, '#d47a6a');  // Warm coral
    g.addColorStop(0.70, '#f2a682');  // Peach
    g.addColorStop(0.85, '#ffd4a3');  // Golden peach
    g.addColorStop(1.00, '#fff5e6');  // Warm horizon
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }, []);

  return (
    <mesh scale={[-1, 1, 1]} renderOrder={-100} raycast={false}>
      <sphereGeometry args={[2000, 64, 32]} />
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

/* ---------- Sprite Layer Component for Cloud Billboards ---------- */
interface DualSpriteLayerProps {
  map: THREE.Texture;
  y: number;
  z: number;
  scale: [number, number, number];
  renderOrder: number;
  opacity?: number;
  speed: number;
  direction: 1 | -1;
  loopWidth: number;
}

function DualSpriteLayer({
  map,
  y,
  z,
  scale,
  renderOrder,
  opacity = 1,
  speed = 0.1,
  direction = 1,
  loopWidth = 2000,
}: DualSpriteLayerProps) {
  const ref = useRef<THREE.Group>(null);
  const halfLoop = loopWidth / 2;

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.x += direction * speed * dt * 10;
    // Wrap both sprites seamlessly
    if (direction === 1 && ref.current.position.x > halfLoop) {
      ref.current.position.x = -halfLoop;
    } else if (direction === -1 && ref.current.position.x < -halfLoop) {
      ref.current.position.x = halfLoop;
    }
  });

  return (
    <group ref={ref}>
      {/* Sprite 1 */}
      <sprite
        position={[-halfLoop, y, z]}
        scale={scale}
        renderOrder={renderOrder}
      >
        <spriteMaterial
          map={map}
          transparent
          depthWrite={false}
          depthTest={true}
          fog={false}
          opacity={opacity}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </sprite>
      {/* Sprite 2 - duplicate for seamless looping */}
      <sprite
        position={[halfLoop, y, z]}
        scale={scale}
        renderOrder={renderOrder}
      >
        <spriteMaterial
          map={map}
          transparent
          depthWrite={false}
          depthTest={true}
          fog={false}
          opacity={opacity}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

/* ---------- L2: Distant Cloud Formations (Slow, faraway) ---------- */
export function DistantClouds() {
  const tex = useTexture(`${LAYER_PATH}/clouds-far.png`);
  return (
    <>
      <DualSpriteLayer
        map={tex}
        y={180}
        z={-1200}
        scale={[2400, 800, 1]}
        renderOrder={-90}
        opacity={0.4}
        speed={0.015}
        direction={1}
        loopWidth={4800}
      />
      <DualSpriteLayer
        map={tex}
        y={280}
        z={-1400}
        scale={[2800, 600, 1]}
        renderOrder={-91}
        opacity={0.3}
        speed={0.012}
        direction={-1}
        loopWidth={5600}
      />
    </>
  );
}

/* ---------- L3: Upper Atmospheric Clouds (Mid-distance, subtle) ---------- */
export function UpperClouds() {
  const tex1 = useTexture(`${LAYER_PATH}/cloud-mid-1.png`);
  const tex2 = useTexture(`${LAYER_PATH}/cloud-mid-2.png`);
  return (
    <>
      <DualSpriteLayer
        map={tex1}
        y={120}
        z={-800}
        scale={[1800, 500, 1]}
        renderOrder={-80}
        opacity={0.55}
        speed={0.025}
        direction={1}
        loopWidth={3600}
      />
      <DualSpriteLayer
        map={tex2}
        y={200}
        z={-900}
        scale={[1600, 450, 1]}
        renderOrder={-81}
        opacity={0.5}
        speed={0.022}
        direction={-1}
        loopWidth={3200}
      />
    </>
  );
}

/* ---------- L4: Midground Clouds (Larger, more detailed) ---------- */
export function MidgroundClouds() {
  const leftTex = useTexture(`${LAYER_PATH}/clouds-mid-left.png`);
  const rightTex = useTexture(`${LAYER_PATH}/clouds-mid-right.png`);
  const dramaTex = useTexture(`${LAYER_PATH}/cloud-drama-1.png`);

  return (
    <>
      {/* Left cloud bank */}
      <DualSpriteLayer
        map={leftTex}
        y={60}
        z={-500}
        scale={[1400, 400, 1]}
        renderOrder={-70}
        opacity={0.7}
        speed={0.035}
        direction={1}
        loopWidth={2800}
      />
      {/* Right cloud bank */}
      <DualSpriteLayer
        map={rightTex}
        y={40}
        z={-520}
        scale={[1300, 380, 1]}
        renderOrder={-71}
        opacity={0.65}
        speed={0.032}
        direction={-1}
        loopWidth={2600}
      />
      {/* Dramatic central cloud formation */}
      <DualSpriteLayer
        map={dramaTex}
        y={100}
        z={-600}
        scale={[2000, 700, 1]}
        renderOrder={-72}
        opacity={0.45}
        speed={0.018}
        direction={1}
        loopWidth={4000}
      />
    </>
  );
}

/* ---------- L5: Lower Cloud Formations (Closer, provide depth) ---------- */
export function LowerClouds() {
  const tex1 = useTexture(`${LAYER_PATH}/clouds-near-1.png`);
  const tex2 = useTexture(`${LAYER_PATH}/clouds-near-2.png`);
  const leftTex = useTexture(`${LAYER_PATH}/cloud-left.png`);
  const rightTex = useTexture(`${LAYER_PATH}/cloud-right.png`);

  return (
    <>
      <DualSpriteLayer
        map={tex1}
        y={-40}
        z={-300}
        scale={[1000, 300, 1]}
        renderOrder={-60}
        opacity={0.75}
        speed={0.045}
        direction={1}
        loopWidth={2000}
      />
      <DualSpriteLayer
        map={tex2}
        y={-60}
        z={-320}
        scale={[900, 280, 1]}
        renderOrder={-61}
        opacity={0.7}
        speed={0.042}
        direction={-1}
        loopWidth={1800}
      />
      {/* Additional side clouds for framing */}
      <DualSpriteLayer
        map={leftTex}
        y={-20}
        z={-400}
        scale={[1200, 350, 1]}
        renderOrder={-62}
        opacity={0.5}
        speed={0.038}
        direction={1}
        loopWidth={2400}
      />
      <DualSpriteLayer
        map={rightTex}
        y={-30}
        z={-420}
        scale={[1100, 320, 1]}
        renderOrder={-63}
        opacity={0.48}
        speed={0.035}
        direction={-1}
        loopWidth={2200}
      />
    </>
  );
}

/* ---------- L6: Foreground Atmospheric Accents (Subtle transparent puffs) ---------- */
export function ForegroundAccents() {
  const tex1 = useTexture(`${LAYER_PATH}/clouds-near-1.png`);
  const tex2 = useTexture(`${LAYER_PATH}/clouds-near-2.png`);

  return (
    <>
      <DualSpriteLayer
        map={tex1}
        y={-100}
        z={-150}
        scale={[600, 200, 1]}
        renderOrder={-50}
        opacity={0.35}
        speed={0.06}
        direction={1}
        loopWidth={1200}
      />
      <DualSpriteLayer
        map={tex2}
        y={-120}
        z={-180}
        scale={[500, 180, 1]}
        renderOrder={-51}
        opacity={0.3}
        speed={0.055}
        direction={-1}
        loopWidth={1000}
      />
    </>
  );
}

/* ---------- L7: Sun Disc + Atmospheric Glow + Rays ---------- */
export function SunAtmosphere() {
  const sunTex = useTexture(`${LAYER_PATH}/sun-disc.png`);
  // Sun position: middle-right, matching fantasy sunset
  const SUN_POSITION = new THREE.Vector3(600, 50, -400);

  return (
    <group position={SUN_POSITION}>
      {/* Outer atmospheric glow - large and subtle */}
      <sprite
        scale={[1200, 1200, 1]}
        renderOrder={-40}
      >
        <spriteMaterial
          map={sunTex}
          transparent
          depthWrite={false}
          depthTest={false}
          fog={false}
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          color="#ffcc80"
        />
      </sprite>
      {/* Mid glow */}
      <sprite
        scale={[600, 600, 1]}
        renderOrder={-39}
      >
        <spriteMaterial
          map={sunTex}
          transparent
          depthWrite={false}
          depthTest={false}
          fog={false}
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          color="#ffb366"
        />
      </sprite>
      {/* Core sun disc */}
      <sprite
        scale={[280, 280, 1]}
        renderOrder={-38}
      >
        <spriteMaterial
          map={sunTex}
          transparent
          depthWrite={false}
          depthTest={false}
          fog={false}
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          color="#fff5e6"
        />
      </sprite>
      {/* Sun rays - using the same disc texture stretched */}
      <sprite
        scale={[2000, 400, 1]}
        renderOrder={-41}
        rotation={-0.15}
      >
        <spriteMaterial
          map={sunTex}
          transparent
          depthWrite={false}
          depthTest={false}
          fog={false}
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          color="#ffd9a3"
        />
      </sprite>
      <sprite
        scale={[2000, 400, 1]}
        renderOrder={-41}
        rotation={0.15}
      >
        <spriteMaterial
          map={sunTex}
          transparent
          depthWrite={false}
          depthTest={false}
          fog={false}
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          color="#ffd9a3"
        />
      </sprite>
    </group>
  );
}

/* ---------- Fantasy Lighting (Sunset atmosphere for islands) ---------- */
export function FantasyLighting() {
  // Sun position matching SunAtmosphere
  const SUN_POSITION = new THREE.Vector3(600, 50, -400);
  const sunDir = SUN_POSITION.clone().normalize();

  return (
    <>
      {/* Warm ambient for fantasy sunset */}
      <ambientLight intensity={0.45} color="#ffecd0" />

      {/* Hemisphere light: cool sky / warm ground */}
      <hemisphereLight intensity={0.35} color="#c8d0ff" groundColor="#ffd4a3" />

      {/* Main directional light from sun - warm golden */}
      <directionalLight
        position={[sunDir.x * 400, Math.max(sunDir.y * 400, 100), sunDir.z * 400]}
        intensity={2.5}
        color="#fff3d0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-180}
        shadow-camera-near={1}
        shadow-camera-far={900}
        shadow-bias={-0.0005}
        shadow-normal-bias={0.02}
      />

      {/* Fill light from opposite side - cool sky fill */}
      <directionalLight
        position={[-300, 200, 300]}
        intensity={0.6}
        color="#c8d8ff"
      />

      {/* Rim light from behind for silhouette definition */}
      <directionalLight
        position={[100, 150, -200]}
        intensity={0.4}
        color="#ffb380"
      />
    </>
  );
}

/* ---------- Fog for Atmospheric Depth ---------- */
export function FantasyFog() {
  return <fog attach="fog" args={["#d4b8a0", 100, 500]} />;
}

/* ---------- Complete Fantasy Environment Composition ---------- */
export function FantasyEnvironment() {
  return (
    <>
      <FantasySkyDome />
      <FantasyFog />
      <DistantClouds />
      <UpperClouds />
      <MidgroundClouds />
      <LowerClouds />
      <ForegroundAccents />
      <SunAtmosphere />
      <FantasyLighting />
    </>
  );
}