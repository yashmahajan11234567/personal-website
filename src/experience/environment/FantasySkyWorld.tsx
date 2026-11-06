import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ============================================================
   FANTASY SKY WORLD — vast 3D sky, organic procedural clouds,
   distant floating mountains, golden sun, PMREM environment light.
   No sprites, no billboards, no image planes in the visible scene.
   ============================================================ */

const SUN_DIR = new THREE.Vector3(0.17, 0.20, -0.96).normalize(); // ~11.5 deg elevation, near-center azimuth: visible in desktop AND portrait frames
const SKY_RADIUS = 5000;
const FOG_COLOR = '#f2cbb2';
const FOG_NEAR = 350;
const FOG_FAR = 3000;

/* ---------- deterministic RNG + seeded 3D simplex noise ---------- */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
  1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
  0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

function makeNoise3D(seed: number): (x: number, y: number, z: number) => number {
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const F3 = 1 / 3;
  const G3 = 1 / 6;
  return (xin: number, yin: number, zin: number): number => {
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) {
      t0 *= t0;
      const gi = perm[ii + perm[jj + perm[kk]]] % 12;
      n0 = t0 * t0 * (GRAD3[gi * 3] * x0 + GRAD3[gi * 3 + 1] * y0 + GRAD3[gi * 3 + 2] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) {
      t1 *= t1;
      const gi = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
      n1 = t1 * t1 * (GRAD3[gi * 3] * x1 + GRAD3[gi * 3 + 1] * y1 + GRAD3[gi * 3 + 2] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) {
      t2 *= t2;
      const gi = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
      n2 = t2 * t2 * (GRAD3[gi * 3] * x2 + GRAD3[gi * 3 + 1] * y2 + GRAD3[gi * 3 + 2] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) {
      t3 *= t3;
      const gi = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;
      n3 = t3 * t3 * (GRAD3[gi * 3] * x3 + GRAD3[gi * 3 + 1] * y3 + GRAD3[gi * 3 + 2] * z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  };
}

/* ---------- sky dome: multi-stop palette + soft sun + stars ---------- */
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        uniforms: {
          sunDir: { value: SUN_DIR.clone() },
          time: { value: 0 },
          zenith: { value: new THREE.Color('#4a7de0') },   // sky blue
          lavender: { value: new THREE.Color('#7a6fd0') },
          purple: { value: new THREE.Color('#9a63c4') },
          pink: { value: new THREE.Color('#e07ab0') },       // rose pink
          peach: { value: new THREE.Color('#ffb98f') },      // warm orange-peach
          gold: { value: new THREE.Color('#ffdfae') },       // golden horizon
          below: { value: new THREE.Color('#8a6a9a') },      // mauve under-horizon
          sunColor: { value: new THREE.Color('#fff2cc') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 sunDir;
          uniform float time;
          uniform vec3 zenith, lavender, purple, pink, peach, gold, below, sunColor;
          varying vec3 vDir;
          float hash(vec3 p) {
            return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col;
            if (h >= 0.0) {
              float t = pow(h, 0.4);
              col = gold;
              col = mix(col, peach, smoothstep(0.00, 0.10, t));
              col = mix(col, pink, smoothstep(0.08, 0.26, t));
              col = mix(col, purple, smoothstep(0.24, 0.42, t));
              col = mix(col, lavender, smoothstep(0.35, 0.55, t));
              col = mix(col, zenith, smoothstep(0.45, 0.75, t));
            } else {
              col = mix(gold, below, smoothstep(0.0, 0.4, -h));
            }
            float s = max(dot(d, sunDir), 0.0);
            // soft visible sun: tight warm core + halo + broad glow (no flat disc mesh)
            col += sunColor * (pow(s, 2000.0) * 1.6 + pow(s, 90.0) * 0.5 + pow(s, 7.0) * 0.10);
            // golden horizon band, stronger toward the sun
            col += gold * pow(1.0 - abs(h), 5.0) * (0.3 + 0.7 * s) * 0.5;
            // stars in the upper sky
            if (h > 0.1) {
              vec3 sp = floor(d * 200.0);
              float star = step(0.9978, hash(sp));
              float tw = 0.5 + 0.5 * sin(time * 2.2 + hash(sp + 1.7) * 40.0);
              col += vec3(1.0, 0.97, 0.92) * star * tw * smoothstep(0.1, 0.4, h) * 0.5;
            }
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh material={material} renderOrder={-100} raycast={() => null}>
      <sphereGeometry args={[SKY_RADIUS, 48, 32]} />
    </mesh>
  );
}

/* ---------- organic cloud formation geometry ---------- */
interface CloudGeoOpts {
  seed: number;
  blobs: number;
  detail: number;
  flat: number;
}

function makeCloudGeometry(opts: CloudGeoOpts): THREE.BufferGeometry {
  const noise = makeNoise3D(opts.seed);
  const rand = mulberry32(opts.seed ^ 0x9e3779b9);
  const parts: THREE.BufferGeometry[] = [];

  for (let b = 0; b < opts.blobs; b++) {
    const geo = new THREE.IcosahedronGeometry(1, opts.detail);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const noiseAttr = new Float32Array(pos.count);
    // tight cluster so blobs merge into one connected mass
    const cx = (rand() - 0.5) * 1.7;
    const cy = (rand() - 0.5) * 0.6 + 0.12;
    const cz = (rand() - 0.5) * 1.0;
    const cr = 0.5 + rand() * 0.65;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const dx = x / len, dy = y / len, dz = z / len;
      // two smooth octaves only — no high-frequency faceting
      const n1 = noise(dx * 0.9 + opts.seed, dy * 0.9, dz * 0.9 + opts.seed * 1.7);
      const n2 = noise(dx * 2.4 + 7.3, dy * 2.4 + opts.seed, dz * 2.4 + 3.1);
      const r = 1 + n1 * 0.5 + n2 * 0.2;
      pos.setXYZ(i, dx * r * cr + cx, dy * r * cr * opts.flat + cy, dz * r * cr + cz);
      noiseAttr[i] = n1 * 0.6 + n2 * 0.4;
    }
    geo.setAttribute('aNoise', new THREE.BufferAttribute(noiseAttr, 1));
    parts.push(geo);
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error('cloud merge failed');
  merged.computeVertexNormals();
  return merged;
}

/* ---------- cloud sea terrain ---------- */
function makeSeaGeometry(seg: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(4200, 4200, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const noise = makeNoise3D(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const noiseAttr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = noise(x * 0.005 + seed, 0, z * 0.005) * 22 + noise(x * 0.0013, 3.7, z * 0.0013) * 55;
    pos.setY(i, n);
    noiseAttr[i] = n / 77;
  }
  geo.setAttribute('aNoise', new THREE.BufferAttribute(noiseAttr, 1));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- cloud shader: soft volumetric-style shading ---------- */
function useCloudMaterial(): THREE.ShaderMaterial {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: {
          sunDir: { value: SUN_DIR.clone() },
          sunColor: { value: new THREE.Color('#ffd9a8') },
          baseColor: { value: new THREE.Color('#ffffff') },
          shadeColor: { value: new THREE.Color('#c394dd') }, // lavender shadow
          underColor: { value: new THREE.Color('#ffb894') }, // peach bounce
          fogColor: { value: new THREE.Color(FOG_COLOR) },
          fogNear: { value: FOG_NEAR },
          fogFar: { value: FOG_FAR },
        },
        vertexShader: /* glsl */ `
          attribute float aNoise;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying float vNoise;
          varying float vFogDepth;
          void main() {
            vNoise = aNoise;
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vec4 mvPosition = viewMatrix * wp;
            vFogDepth = -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 sunDir, sunColor, baseColor, shadeColor, underColor;
          varying vec3 vNormal, vWorldPos;
          varying float vNoise;
          #include <fog_pars_fragment>
          void main() {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(cameraPosition - vWorldPos);
            float ndl = dot(N, sunDir) * 0.5 + 0.5;                 // wrap diffuse
            float sun = pow(max(dot(N, sunDir), 0.0), 2.0);
            vec3 col = mix(shadeColor, baseColor, pow(ndl, 1.15) * 0.9 + 0.1);
            col += sunColor * sun * 0.35;                            // warm sun kiss
            float down = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
            col = mix(col, underColor * 0.9 + shadeColor * 0.3, down * 0.4); // peach undersides
            // fake forward scattering: glow when looking toward the sun through the cloud
            col += sunColor * pow(max(dot(V, -sunDir), 0.0), 4.0) * 0.14;
            // fresnel rim
            float fres = pow(1.0 - abs(dot(N, V)), 2.5);
            col += sunColor * fres * 0.25 * (0.4 + 0.6 * max(dot(N, sunDir), 0.0));
            // cool tops
            float h = clamp(vWorldPos.y / 400.0 + 0.5, 0.0, 1.0);
            col = mix(col, baseColor * vec3(0.98, 0.98, 1.05), h * 0.3);
            col *= 0.93 + vNoise * 0.14;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            #include <fog_fragment>
          }
        `,
      }),
    [],
  );
}

/* ---------- drifting cloud layer ---------- */
interface FormationSpec {
  y: number;
  z: number;
  s: number;
  v: number;
}

function CloudLayer({
  specs, geoms, material, speed, direction, loopWidth, reduced,
}: {
  specs: FormationSpec[];
  geoms: THREE.BufferGeometry[];
  material: THREE.ShaderMaterial;
  speed: number;
  direction: 1 | -1;
  loopWidth: number;
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const xs = useRef<number[]>([]);
  if (xs.current.length !== specs.length) {
    xs.current = specs.map((_, i) => -loopWidth / 2 + (i * loopWidth) / specs.length);
  }
  useFrame((_, dt) => {
    const g = group.current;
    if (!g || reduced) return;
    const step = direction * speed * dt;
    for (let i = 0; i < g.children.length; i++) {
      xs.current[i] += step;
      if (xs.current[i] > loopWidth / 2) xs.current[i] -= loopWidth;
      else if (xs.current[i] < -loopWidth / 2) xs.current[i] += loopWidth;
      g.children[i].position.x = xs.current[i];
    }
  });
  return (
    <group ref={group}>
      {specs.map((f, i) => (
        <mesh
          key={i}
          geometry={geoms[f.v % geoms.length]}
          material={material}
          position={[xs.current[i], f.y, f.z]}
          scale={f.s}
          raycast={() => null}
        />
      ))}
    </group>
  );
}

/* ---------- cloud sea ---------- */
function CloudSea({ geometry, material, reduced }: { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const m = ref.current;
    if (!m || reduced) return;
    m.rotation.y += dt * 0.004;
    m.position.y = -100 + Math.sin(state.clock.elapsedTime * 0.1) * 4;
  });
  return <mesh ref={ref} geometry={geometry} material={material} position={[0, -100, -700]} raycast={() => null} />;
}

/* ---------- distant floating mountains (real 3D geometry, vertex-coloured) ---------- */
function makeMountain(seed: number, height: number, radius: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.1, radius * 0.55, height, 10, 6, false);
  const noise = makeNoise3D(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color('#8a76a8');
  const mid = new THREE.Color('#b094c0');
  const tip = new THREE.Color('#ffd9b0');
  const c = new THREE.Color();
  const half = height / 2;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const rlen = Math.sqrt(x * x + z * z) || 1;
    const n = noise((x / rlen) * 1.6 + seed, y * 0.02 + seed, (z / rlen) * 1.6);
    const pinch = y < -half * 0.3 ? 0.72 : 1.0; // floating underside
    x = x * (1 + n * 0.38) * pinch;
    z = z * (1 + n * 0.38) * pinch;
    y += noise(x * 0.05, y * 0.05 + seed, z * 0.05) * height * 0.06;
    pos.setXYZ(i, x, y, z);
    const h01 = THREE.MathUtils.clamp((y + half) / height, 0, 1);
    c.copy(base).lerp(mid, THREE.MathUtils.smoothstep(h01, 0.25, 0.7));
    c.lerp(tip, THREE.MathUtils.smoothstep(h01, 0.74, 0.95)); // sunlit tips
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function DistantMountains({ mobile }: { mobile: boolean }) {
  const meshes = useMemo(() => {
    const rand = mulberry32(2024);
    const defs: { x: number; z: number; s: number; seed: number }[] = [];
    // connected ranges (2-3 peaks each) + isolated peaks, on a distant arc
    const ranges = 5;
    for (let r = 0; r < ranges; r++) {
      const cx = -2400 + (r * 5000) / (ranges - 1) + (rand() - 0.5) * 500;
      const cz = -2300 - rand() * 900;
      const peaks = 2 + Math.floor(rand() * 2);
      for (let pIdx = 0; pIdx < peaks; pIdx++) {
        defs.push({
          x: cx + (rand() - 0.5) * 700,
          z: cz + (rand() - 0.5) * 400,
          s: 170 + rand() * 190,
          seed: 3000 + defs.length * 13,
        });
      }
    }
    for (let i = 0; i < 3; i++) {
      defs.push({
        x: (rand() - 0.5) * 5200,
        z: -2500 - rand() * 700,
        s: 200 + rand() * 220,
        seed: 4000 + i * 17,
      });
    }
    return defs.map((d) => ({
      ...d,
      geo: makeMountain(d.seed, 100, d.s * 0.45), // unit-height geo scaled by s/100
      y: -70,
    }));
  }, [mobile]);

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, fog: true }),
    [],
  );

  return (
    <group raycast={() => null}>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geo} material={material} position={[m.x, m.y, m.z]} scale={[m.s / 100, m.s / 100, m.s / 100]} />
      ))}
    </group>
  );
}

/* ---------- procedural PMREM environment map for image-based lighting ---------- */
function EnvironmentLight() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new THREE.Scene();
    // gradient sky sphere (lighting only — the visible sky is the shader dome)
    const c = document.createElement('canvas');
    c.width = 16; c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#3e6fd6');
    g.addColorStop(0.45, '#a76fc7');
    g.addColorStop(0.62, '#ffb98f');
    g.addColorStop(0.72, '#ffdfae');
    g.addColorStop(1.0, '#5a4a6a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(50, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }),
    );
    envScene.add(sky);
    // bright sun spot in the env map
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(4, 12, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6da') }),
    );
    sun.position.copy(SUN_DIR).multiplyScalar(40);
    envScene.add(sun);
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      envMap.dispose();
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* ---------- lighting ---------- */
function GoldenLighting({ shadowSize }: { shadowSize: number }) {
  const sunPos = SUN_DIR.clone().multiplyScalar(900);
  return (
    <>
      <hemisphereLight args={['#b9c8ff', '#ffc9a0', 0.5]} />
      <ambientLight args={['#ffe8d0', 0.25]} />
      <directionalLight
        position={[sunPos.x, Math.max(sunPos.y, 120), sunPos.z]}
        intensity={2.6}
        color="#ffedd0"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-200}
        shadow-camera-near={1}
        shadow-camera-far={2000}
        shadow-bias={-0.0005}
        shadow-normal-bias={0.02}
      />
      <directionalLight position={[-350, 220, 350]} intensity={0.55} color="#c8b8ff" />
      {/* warm frontal fill so island faces read colourful, not silhouetted */}
      <directionalLight position={[160, 140, 520]} intensity={0.85} color="#ffe4c4" />
      <directionalLight position={[-420, 90, 300]} intensity={0.4} color="#ffd0b0" />
    </>
  );
}

/* ---------- root ---------- */
export function FantasySkyWorld() {
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const mobile = useMemo(
    () => typeof window !== 'undefined' && (window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4),
    [],
  );

  const geoms = useMemo(() => {
    const b = mobile ? 0.55 : 1;
    return {
      far: [0, 1, 2].map((i) => makeCloudGeometry({ seed: 101 + i * 17, blobs: Math.round(8 * b) || 5, detail: 2, flat: 0.6 })),
      mid: [0, 1, 2, 3].map((i) => makeCloudGeometry({ seed: 401 + i * 23, blobs: Math.round(16 * b) || 9, detail: 2, flat: 0.55 })),
      near: [0, 1, 2].map((i) => makeCloudGeometry({ seed: 701 + i * 29, blobs: Math.round(12 * b) || 7, detail: mobile ? 2 : 3, flat: 0.7 })),
      cirrus: [0, 1].map((i) => makeCloudGeometry({ seed: 901 + i * 31, blobs: Math.round(6 * b) || 4, detail: 1, flat: 0.25 })),
      sea: makeSeaGeometry(mobile ? 64 : 96, 555),
    };
  }, [mobile]);

  const material = useCloudMaterial();

  // sea gets its own brighter, warmer variant that resists fog so the horizon glows
  const seaMaterial = useMemo(() => {
    const m = material.clone();
    m.uniforms.baseColor.value.set('#fff6ee');
    m.uniforms.shadeColor.value.set('#e2b8d2');
    m.uniforms.underColor.value.set('#ffc9a0');
    m.uniforms.fogFar.value = 9000;
    return m;
  }, [material]);

  const far: FormationSpec[] = useMemo(() => {
    const n = mobile ? 5 : 7;
    const rand = mulberry32(42);
    return Array.from({ length: n }, (_, i) => ({
      y: 10 + rand() * 50,
      z: -1400 - rand() * 800,
      s: 80 + rand() * 60,
      v: i % 3,
    }));
  }, [mobile]);

  const mid: FormationSpec[] = useMemo(() => {
    const n = mobile ? 4 : 6;
    const rand = mulberry32(77);
    return Array.from({ length: n }, (_, i) => ({
      y: -30 + rand() * 50,
      z: -500 - rand() * 320,
      s: 100 + rand() * 70,
      v: i % 4,
    }));
  }, [mobile]);

  const near: FormationSpec[] = useMemo(() => {
    const n = mobile ? 2 : 3;
    const rand = mulberry32(99);
    return Array.from({ length: n }, (_, i) => ({
      y: -70 + rand() * 70,
      z: -260 - rand() * 120,
      s: 90 + rand() * 55,
      v: i % 3,
    }));
  }, [mobile]);

  const cirrus: FormationSpec[] = useMemo(() => {
    const n = mobile ? 2 : 3;
    const rand = mulberry32(133);
    return Array.from({ length: n }, (_, i) => ({
      y: 660 + rand() * 180,          // high enough to stay above the frame top
      z: -1200 - rand() * 600,
      s: 380 + rand() * 180,
      v: i % 2,
    }));
  }, [mobile]);

  return (
    <>
      <color attach="background" args={['#ffd9ae']} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <EnvironmentLight />
      <SkyDome />
      <DistantMountains mobile={mobile} />
      <CloudSea geometry={geoms.sea} material={seaMaterial} reduced={reduced} />
      <CloudLayer specs={far} geoms={geoms.far} material={material} speed={1.6} direction={1} loopWidth={5000} reduced={reduced} />
      <CloudLayer specs={cirrus} geoms={geoms.cirrus} material={material} speed={1.0} direction={-1} loopWidth={4200} reduced={reduced} />
      <CloudLayer specs={mid} geoms={geoms.mid} material={material} speed={4.5} direction={-1} loopWidth={3200} reduced={reduced} />
      <CloudLayer specs={near} geoms={geoms.near} material={material} speed={8} direction={1} loopWidth={1600} reduced={reduced} />
      <GoldenLighting shadowSize={mobile ? 1024 : 2048} />
    </>
  );
}
