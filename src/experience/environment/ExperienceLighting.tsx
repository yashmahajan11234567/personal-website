import * as THREE from 'three';

/**
 * Lighting for Experience islands — adjusted for bright sky background.
 * Uses neutral daylight lighting to complement the sunny sky background image.
 */
export function ExperienceLighting() {
  // Sun position matching the background image (sun on middle-right)
  const SUN_POSITION = new THREE.Vector3(400, 100, -500);
  const sunDir = SUN_POSITION.clone().normalize();

  return (
    <>
      {/* Neutral ambient for bright sky environment */}
      <ambientLight intensity={0.6} color="#ffffff" />

      {/* Hemisphere light for subtle sky/ground color variation */}
      <hemisphereLight intensity={0.4} color="#87ceeb" groundColor="#e8d5b7" />

      {/* Main directional light from sun position (bright daylight) */}
      <directionalLight
        position={[sunDir.x * 300, Math.max(sunDir.y * 300, 80), sunDir.z * 300]}
        intensity={2.8}
        color="#fff8e7"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-150}
        shadow-camera-near={1}
        shadow-camera-far={800}
        shadow-bias={-0.0005}
        shadow-normal-bias={0.02}
      />

      {/* Fill light from opposite side for balanced illumination */}
      <directionalLight
        position={[-200, 150, 200]}
        intensity={0.8}
        color="#e8f0ff"
      />
    </>
  );
}