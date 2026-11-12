/**
 * Lighting — Enhanced: PMREM env map, Sun + Hemisphere + Fill lights,
 * Tone mapping, Exposure, Bloom-ready setup.
 */
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function Lighting() {
  const { scene, gl } = useThree();

  // Generate PMREM from procedural sky once
  if (!scene.environment) {
    const pmrem = new THREE.PMREMGenerator(gl);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#3a8fd8');    // zenith
    grad.addColorStop(0.3, '#5db0e8');
    grad.addColorStop(0.55, '#a8d0f0');
    grad.addColorStop(0.8, '#ffe8c8');  // horizon glow
    grad.addColorStop(1, '#fff8e7');    // horizon
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.environment = pmrem.fromEquirectangular(texture).texture;
    scene.environmentIntensity = 1.0;
    pmrem.dispose();
  }

  // Configure renderer tone mapping (once)
  if (!gl.toneMapping || gl.toneMapping !== THREE.ACESFilmicToneMapping) {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }

  return (
    <group>
      {/* Hemisphere — soft ambient from sky/ground */}
      <hemisphereLight
        groundColor="#7ab86a"
        color="#e8f4ff"
        intensity={1.1}
      />

      {/* Primary Directional (Sun) — sharp shadows */}
      <directionalLight
        position={[30, 50, 20]}
        color="#fff5d8"
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />

      {/* Warm Fill — prevents harsh silhouettes */}
      <directionalLight position={[180, 160, 500]} color="#ffd4b8" intensity={1.1} />
      <directionalLight position={[-70, 240, 580]} color="#ffe4d0" intensity={0.7} />

      {/* Cool Rim Fill — adds depth on shadow side */}
      <directionalLight position={[-400, 250, 300]} color="#a8b8f0" intensity={0.5} />

      {/* Subtle ground bounce */}
      <directionalLight position={[0, -100, 0]} color="#5a7a4a" intensity={0.3} />
    </group>
  );
}