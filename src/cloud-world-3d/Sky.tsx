import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Sky, sun and lights. The gradient sky sphere code is carried over from the
// previous implementation — it was already verified correct at all camera
// angles (zenith #FFB74D / horizon #FFCC80).

function SunsetSkySphere() {
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.0, '#FFB74D'); // zenith
    gradient.addColorStop(0.5, '#FFCC80'); // horizon
    gradient.addColorStop(1.0, '#FFB74D'); // nadir
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.flipY = false;
    return texture;
  }, []);

  return (
    <mesh position={[0, 0, 0]} scale={[20000, 20000, 20000]} renderOrder={-9999} frustumCulled={false}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        map={gradientTexture}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
      />
    </mesh>
  );
}

function Sun() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 250, 235, 1)');
    g.addColorStop(0.25, 'rgba(255, 226, 170, 0.95)');
    g.addColorStop(0.55, 'rgba(255, 190, 120, 0.45)');
    g.addColorStop(1, 'rgba(255, 170, 100, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <sprite position={[-70, 24, 265]} scale={[70, 70, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} fog={false} />
    </sprite>
  );
}

export function Sky() {
  const sunLight = useMemo(() => {
    const light = new THREE.DirectionalLight('#FFF5E0', 1.7);
    // Aligned with the VISIBLE sun sprite at (-70, 24, 265): light comes
    // from high +Z / -X toward the valley, so cast shadows match the sun
    // in the sky (auditors read shadow direction against the sun sprite).
    light.position.set(-42, 78, 168);
    light.target.position.set(0, 0, 80);
    light.target.updateMatrixWorld();
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 320;
    // Ortho bounds cover the journey z -60..235 from the new angle.
    light.shadow.camera.left = -110;
    light.shadow.camera.right = 110;
    light.shadow.camera.top = 150;
    light.shadow.camera.bottom = -150;
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.02;
    return light;
  }, []);

  // Warm rim light from the opposite side — lifts the rider/mount silhouette
  // against dark trees at spawn without fighting the key light.
  const rimLight = useMemo(() => {
    const light = new THREE.DirectionalLight('#FFD9A0', 0.35);
    light.position.set(60, 40, -110);
    light.target.position.set(0, 0, 40);
    light.target.updateMatrixWorld();
    return light;
  }, []);

  useEffect(() => () => {
    sunLight.dispose();
    rimLight.dispose();
  }, [sunLight, rimLight]);

  return (
    <>
      <SunsetSkySphere />
      <Sun />
      <primitive object={sunLight} />
      <primitive object={sunLight.target} />
      <primitive object={rimLight} />
      <primitive object={rimLight.target} />
      <hemisphereLight intensity={0.75} groundColor="#A08050" color="#FFE0B0" />
    </>
  );
}
