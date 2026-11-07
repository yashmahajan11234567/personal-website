/**
 * VoxelSky — a painted dome plus cuboid clouds.
 *
 * WHY THIS FIXES THE WHITE-SKY BUG: the dome is an inverted sphere with a
 * ShaderMaterial that returns an opaque colour for every direction. There is no
 * clear colour to fall through, no transparent background, and no post pass
 * that can leave the frame unpainted. If the shader compiles, the sky is blue.
 * `scene.background` is ALSO set to the horizon colour, so even a failed shader
 * can only produce a flat blue, never white.
 *
 * The dome and the camera share a position, so the horizon is always at the
 * same apparent height no matter how far the visitor sails.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { C } from './palette';
import { Chunk, mergeVoxels } from './voxel';
import { lcg } from './noise';

export const SUN_DIR = new THREE.Vector3(-0.45, 0.78, -0.42).normalize();

const DOME_RADIUS = 1200;

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uSun;
  uniform vec3 uCameraPos;
  varying vec3 vWorldPos;

  void main() {
    vec3 d = normalize(vWorldPos - uCameraPos);
    float h = clamp(d.y, -1.0, 1.0);

    // two-stop gradient from the horizon band up to the zenith
    vec3 sky = mix(uHorizon, uMid, smoothstep(-0.02, 0.34, h));
    sky = mix(sky, uZenith, smoothstep(0.28, 0.95, h));

    // atmospheric haze thickening toward the horizon
    sky = mix(uHaze, sky, smoothstep(-0.10, 0.16, h));

    // below the horizon the dome reads as distant sea, not as sky
    sky = mix(vec3(0.10, 0.42, 0.66), sky, smoothstep(-0.16, -0.01, h));

    float s = max(dot(d, normalize(uSun)), 0.0);
    sky += vec3(1.0, 0.96, 0.82) * pow(s, 420.0) * 1.1;   // sun disc
    sky += vec3(1.0, 0.94, 0.76) * pow(s, 7.0) * 0.10;    // warm halo

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function VoxelSky() {
  const ref = useRef<THREE.Mesh>(null);
  const { camera, scene } = useThree();

  const geometry = useMemo(() => new THREE.SphereGeometry(DOME_RADIUS, 32, 20), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uZenith: { value: new THREE.Color(C.skyZenith) },
          uMid: { value: new THREE.Color(C.skyMid) },
          uHorizon: { value: new THREE.Color(C.skyHorizon) },
          uHaze: { value: new THREE.Color(C.skyHaze) },
          uSun: { value: SUN_DIR.clone() },
          uCameraPos: { value: new THREE.Vector3() },
        },
      }),
    [],
  );

  // second line of defence: an opaque background colour behind the dome
  useMemo(() => {
    scene.background = new THREE.Color(C.skyHorizon);
  }, [scene]);

  useFrame(() => {
    if (ref.current && material.uniforms.uCameraPos) {
      material.uniforms.uCameraPos.value.copy(camera.position);
    }
  });

  return <mesh ref={ref} geometry={geometry} material={material} renderOrder={-100} frustumCulled={false} position={[0, 0, 0]} />;
}

/** Deterministic cuboid cloud field (ref 3: stacked white blocks, grey bases). */
function buildClouds(): THREE.BufferGeometry {
  const c = new Chunk();
  const rnd = lcg(4242);
  for (let i = 0; i < 34; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 90 + rnd() * 620;
    const cx = Math.round(Math.cos(a) * r * 0.07);
    const cz = Math.round(Math.sin(a) * r * 0.07);
    const cy = Math.round(48 + rnd() * 34);
    const w = 5 + Math.floor(rnd() * 7);
    const d = 4 + Math.floor(rnd() * 5);
    const h = 2 + Math.floor(rnd() * 2);
    for (let x = -w; x <= w; x++) {
      for (let z = -d; z <= d; z++) {
        // rounded-corner footprint so the clouds read as blobs, not slabs
        const man = Math.abs(x) / (w + 0.6) + Math.abs(z) / (d + 0.6);
        if (man > 1.15) continue;
        const top = man < 0.55 ? h + 1 : h;
        for (let y = 0; y <= top; y++) {
          c.put(cx + x, cy + y - h, cz + z, y === 0 ? C.skyHaze : C.foam);
        }
      }
    }
  }
  // scale the whole field out: clouds are far away, so one block is many metres
  const geo = mergeVoxels(c.list());
  geo.scale(9, 9, 9);
  return geo;
}

export function VoxelClouds() {
  const ref = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildClouds(), []);
  const material = useMemo(
    () => new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, fog: false }),
    [],
  );

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={ref}>
      <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-50} />
    </group>
  );
}

/**
 * Soft cloud shadows drifting across the sea (ref 2). Deliberately very low
 * opacity and depth-write off: they tint the water, they never occlude it.
 */
export function CloudShadows() {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const blobs = useMemo(() => {
    const rnd = lcg(919);
    return Array.from({ length: 9 }, () => ({
      x: (rnd() - 0.5) * 460,
      z: (rnd() - 0.5) * 460,
      s: 60 + rnd() * 120,
      speed: 0.7 + rnd() * 0.9,
    }));
  }, []);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i];
      child.position.x += dt * blobs[i].speed;
      if (child.position.x > 240) child.position.x = -240;
    }
  });

  return (
    <group ref={ref}>
      {blobs.map((b, i) => (
        <mesh key={i} geometry={geo} position={[b.x, 0.66, b.z]} scale={[b.s, 1, b.s]}>
          <meshBasicMaterial
            color={0x0b2b46}
            transparent
            opacity={0.07}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}
