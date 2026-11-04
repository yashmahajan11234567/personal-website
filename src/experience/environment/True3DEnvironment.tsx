import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ============================================================
   TRUE 3D FANTASY ENVIRONMENT
   - Shader sky dome (gradient + sun glow + stars, no textures)
   - Procedural 3D cloud formations (merged displaced blobs)
   - 3D "sea of clouds" terrain disc
   - Real directional sun + hemisphere/ambient lighting + fog
   No sprites, no billboards, no image planes.
   ============================================================ */

/** Sun direction shared by sky shader, glow and directional light. */
const SUN_DIR = new THREE.Vector3(0.52, 0.26, -0.80).normalize();

/* ---------- deterministic RNG ---------- */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- seeded 3D simplex noise (Gustavson) ---------- */
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

/* ---------- sky dome shader ---------- */
function SkyDome() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        sunDir: { value: SUN_DIR.clone() },
        time: { value: 0 },
        zenithColor: { value: new THREE.Color('#5f4fb0') },
        midColor: { value: new THREE.Color('#ef9db8') },
        horizonColor: { value: new THREE.Color('#ffd2a1') },
        belowColor: { value: new THREE.Color('#c98bb0') },
        sunColor: { value: new THREE.Color('#fff3cf') },
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
        uniform vec3 zenithColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 belowColor;
        uniform vec3 sunColor;
        varying vec3 vDir;
        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        }
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col;
          if (h >= 0.0) {
            float t = pow(h, 0.45);
            col = mix(horizonColor, midColor, smoothstep(0.02, 0.30, t));
            col = mix(col, zenithColor, smoothstep(0.18, 0.62, t));
          } else {
            col = mix(horizonColor, belowColor, smoothstep(0.0, 0.35, -h));
          }
          float s = max(dot(d, sunDir), 0.0);
          // layered sun glow: tight core + mid halo + broad warmth
          col += sunColor * (pow(s, 600.0) * 1.4 + pow(s, 48.0) * 0.45 + pow(s, 8.0) * 0.16);
          // warm horizon band, stronger toward the sun azimuth
          col += horizonColor * pow(1.0 - abs(h), 4.0) * (0.35 + 0.65 * s) * 0.55;
          // subtle stars in the upper sky
          if (h > 0.08) {
            vec3 sp = floor(d * 180.0);
            float star = step(0.9975, hash(sp));
            float tw = 0.5 + 0.5 * sin(time * 2.0 + hash(sp + 1.7) * 40.0);
            col += vec3(1.0, 0.97, 0.92) * star * tw * smoothstep(0.08, 0.35, h) * 0.5;
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
  }, []);

  useFrame((state) => {
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh material={material} renderOrder={-100} raycast={() => null}>
      <sphereGeometry args={[2800, 48, 32]} />
    </mesh>
  );
}

/* ---------- procedural 3D cloud formation geometry ---------- */
interface CloudGeoOpts {
  seed: number;
  blobs: number;
  detail: number;
  flat?: number;
}

function makeCloudGeometry(opts: CloudGeoOpts): THREE.BufferGeometry {
  const noise = makeNoise3D(opts.seed);
  const rand = mulberry32(opts.seed ^ 0x9e3779b9);
  const flat = opts.flat ?? 0.72;
  const parts: THREE.BufferGeometry[] = [];

  for (let b = 0; b < opts.blobs; b++) {
    const geo = new THREE.IcosahedronGeometry(1, opts.detail);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const noiseAttr = new Float32Array(pos.count);
    // blob centre in unit space — wide formations, slightly domed tops
    const cx = (rand() - 0.5) * 2.3;
    const cy = (rand() - 0.5) * 0.85 + 0.14;
    const cz = (rand() - 0.5) * 1.35;
    const cr = 0.42 + rand() * 0.6;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const dx = x / len, dy = y / len, dz = z / len;
      const n1 = noise(dx * 1.7 + opts.seed, dy * 1.7, dz * 1.7 + opts.seed);
      const n2 = noise(dx * 4.2 + 7.3, dy * 4.2 + opts.seed, dz * 4.2);
      const r = 1 + n1 * 0.34 + n2 * 0.16;
      pos.setXYZ(i, dx * r * cr + cx, dy * r * cr * flat + cy, dz * r * cr + cz);
      noiseAttr[i] = n1 * 0.5 + n2 * 0.5;
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

/* ---------- "sea of clouds" terrain disc ---------- */
function makeSeaGeometry(seg: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(3000, 3000, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const noise = makeNoise3D(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const noiseAttr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = noise(x * 0.006 + seed, 0, z * 0.006) * 16 + noise(x * 0.0016, 3.7, z * 0.0016) * 34;
    pos.setY(i, n);
    noiseAttr[i] = n / 50;
  }
  geo.setAttribute('aNoise', new THREE.BufferAttribute(noiseAttr, 1));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- shared volumetric-ish cloud shader ---------- */
function useCloudMaterial(): THREE.ShaderMaterial {
  return useMemo(() => {
    return new THREE.ShaderMaterial({
      fog: true,
      uniforms: {
        sunDir: { value: SUN_DIR.clone() },
        sunColor: { value: new THREE.Color('#ffdfb0') },
        baseColor: { value: new THREE.Color('#fff6ee') },
        shadeColor: { value: new THREE.Color('#e8a0be') },
        // declared so the renderer's refreshFogUniforms can write into them (material.fog = true)
        fogColor: { value: new THREE.Color('#eec3ae') },
        fogNear: { value: 260 },
        fogFar: { value: 1700 },
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
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform vec3 baseColor;
        uniform vec3 shadeColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vNoise;
        #include <fog_pars_fragment>
        void main() {
          vec3 N = normalize(vNormal);
          float ndl = dot(N, sunDir) * 0.5 + 0.5;               // wrap diffuse — soft puffy shading
          float sun = pow(max(dot(N, sunDir), 0.0), 2.0);
          vec3 col = mix(shadeColor, baseColor, ndl * 0.8 + 0.2);
          col += sunColor * sun * 0.30;                          // warm sun kiss on lit sides
          float down = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
          col = mix(col, shadeColor * vec3(1.05, 0.9, 0.95), down * 0.35); // peach bounce on undersides
          float h = clamp(vWorldPos.y / 260.0 + 0.5, 0.0, 1.0);
          col = mix(col, baseColor * vec3(1.0, 0.98, 1.02), h * 0.25);     // cooler tops
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fres = pow(1.0 - abs(dot(N, V)), 2.5);
          col += sunColor * fres * 0.22 * (0.4 + 0.6 * max(dot(N, sunDir), 0.0));
          col *= 0.94 + vNoise * 0.12;                           // organic tonal variation
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
  }, []);
}

/* ---------- drifting cloud layer (seamless wrap) ---------- */
interface FormationSpec {
  y: number;
  z: number;
  s: number;
  v: number; // geometry variant index
}

function CloudLayer({
  specs,
  geoms,
  material,
  speed,
  direction,
  loopWidth,
  reduced,
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
    // even spacing across the loop so wrapping never shows a gap or a jump
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

/* ---------- rotating sea of clouds ---------- */
function CloudSea({
  geometry,
  material,
  reduced,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  reduced: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const m = ref.current;
    if (!m || reduced) return;
    m.rotation.y += dt * 0.004;
    m.position.y = -95 + Math.sin(state.clock.elapsedTime * 0.1) * 3;
  });
  return <mesh ref={ref} geometry={geometry} material={material} position={[0, -95, -400]} raycast={() => null} />;
}

/* ---------- lighting ---------- */
function SunsetLighting({ shadowSize }: { shadowSize: number }) {
  const sunPos = SUN_DIR.clone().multiplyScalar(600);
  return (
    <>
      <hemisphereLight args={['#b9a8ec', '#ffc9a0', 0.55]} />
      <ambientLight args={['#ffe8d0', 0.28]} />
      <directionalLight
        position={[sunPos.x, Math.max(sunPos.y, 80), sunPos.z]}
        intensity={2.5}
        color="#ffedd0"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-200}
        shadow-camera-near={1}
        shadow-camera-far={1400}
        shadow-bias={-0.0005}
        shadow-normal-bias={0.02}
      />
      <directionalLight position={[-350, 220, 350]} intensity={0.4} color="#b8c8ff" />
    </>
  );
}

/* ---------- root ---------- */
export function True3DEnvironment() {
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const mobile = useMemo(
    () => typeof window !== 'undefined' && (window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4),
    [],
  );

  const geoms = useMemo(() => {
    const d = mobile ? 1 : 2;
    const b = mobile ? 0.55 : 1;
    return {
      // distant layers use detail 1 (they are fog-hazed anyway)
      large: [0, 1, 2].map((i) => makeCloudGeometry({ seed: 101 + i * 17, blobs: Math.round(14 * b) || 8, detail: 1 })),
      mid: [0, 1, 2].map((i) => makeCloudGeometry({ seed: 401 + i * 23, blobs: Math.round(11 * b) || 7, detail: d })),
      small: [0, 1, 2].map((i) => makeCloudGeometry({ seed: 701 + i * 29, blobs: Math.round(8 * b) || 5, detail: d })),
      cirrus: [0, 1, 2].map((i) =>
        makeCloudGeometry({ seed: 901 + i * 31, blobs: Math.round(6 * b) || 4, detail: 1, flat: 0.32 }),
      ),
      sea: makeSeaGeometry(mobile ? 64 : 96, 555),
    };
  }, [mobile]);

  const material = useCloudMaterial();

  const distant: FormationSpec[] = useMemo(() => {
    const n = mobile ? 7 : 9;
    const rand = mulberry32(42);
    return Array.from({ length: n }, (_, i) => ({
      y: 70 + rand() * 170,
      z: -750 - rand() * 420,
      s: 200 + rand() * 150,
      v: i % 3,
    }));
  }, [mobile]);

  const mid: FormationSpec[] = useMemo(() => {
    const n = mobile ? 6 : 8;
    const rand = mulberry32(77);
    return Array.from({ length: n }, (_, i) => ({
      y: -20 + rand() * 130,
      z: -380 - rand() * 190,
      s: 95 + rand() * 80,
      v: (i + 1) % 3,
    }));
  }, [mobile]);

  const foreground: FormationSpec[] = useMemo(() => {
    const n = mobile ? 3 : 4;
    const rand = mulberry32(99);
    return Array.from({ length: n }, (_, i) => ({
      y: -70 + rand() * 60,
      z: -190 - rand() * 110,
      s: 55 + rand() * 35,
      v: (i + 2) % 3,
    }));
  }, [mobile]);

  const cirrus: FormationSpec[] = useMemo(() => {
    const n = mobile ? 3 : 4;
    const rand = mulberry32(133);
    return Array.from({ length: n }, (_, i) => ({
      y: 300 + rand() * 130,
      z: -800 - rand() * 250,
      s: 260 + rand() * 130,
      v: i % 3,
    }));
  }, [mobile]);

  return (
    <>
      <color attach="background" args={['#eec3ae']} />
      <fog attach="fog" args={['#eec3ae', 260, 1700]} />
      <SkyDome />
      <CloudSea geometry={geoms.sea} material={material} reduced={reduced} />
      <CloudLayer specs={distant} geoms={geoms.large} material={material} speed={2.2} direction={1} loopWidth={3600} reduced={reduced} />
      <CloudLayer specs={cirrus} geoms={geoms.cirrus} material={material} speed={1.2} direction={-1} loopWidth={3000} reduced={reduced} />
      <CloudLayer specs={mid} geoms={geoms.mid} material={material} speed={5.5} direction={-1} loopWidth={2600} reduced={reduced} />
      <CloudLayer specs={foreground} geoms={geoms.small} material={material} speed={9} direction={1} loopWidth={1800} reduced={reduced} />
      <SunsetLighting shadowSize={mobile ? 1024 : 2048} />
    </>
  );
}
