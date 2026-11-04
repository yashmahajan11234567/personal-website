import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ============================================================
   MAGENTA TWILIGHT WORLD — deep-purple starry sky, crescent moon,
   pink/purple 3D clouds, layered distant mountains, glowing horizon.
   No sprites, no billboards, no image planes in the visible scene.
   ============================================================ */

const SUN_DIR = new THREE.Vector3(0.17, 0.10, -0.98).normalize(); // low warm horizon light
const MOON_DIR = new THREE.Vector3(0.26, 0.20, -0.94).normalize(); // upper-right crescent, clear of the heading
const SKY_RADIUS = 5000;
const FOG_COLOR = '#4a2f6e';
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

/* ---------- twilight sky dome: palette + crescent moon + stars + nebula + meteors ---------- */
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
          moonDir: { value: MOON_DIR.clone() },
          time: { value: 0 },
          midnight: { value: new THREE.Color('#150b2e') },  // deep midnight purple (top)
          violet: { value: new THREE.Color('#5b2d8e') },
          magenta: { value: new THREE.Color('#b03aa0') },   // magenta mid
          rose: { value: new THREE.Color('#ef6fa8') },      // rose pink near horizon
          peach: { value: new THREE.Color('#ffb27a') },     // warm peach at horizon
          glow: { value: new THREE.Color('#ff9e6a') },      // orange horizon glow
          below: { value: new THREE.Color('#1a0f33') },
          moonColor: { value: new THREE.Color('#f2e9ff') },
          nebulaColor: { value: new THREE.Color('#8a4fd0') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 sunDir, moonDir;
          uniform float time;
          uniform vec3 midnight, violet, magenta, rose, peach, glow, below, moonColor, nebulaColor;
          varying vec3 vDir;

          float hash(vec3 p) {
            return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          }
          // precision-safe hash for large cell coords (star grids): fracts before multiplying
          float hashS(vec3 p) {
            p = fract(p * 0.1031);
            p += dot(p, p.zyx + 31.32);
            return fract((p.x + p.y) * p.z);
          }
          float vnoise(vec3 p) {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
                  mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
              mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                  mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
          }

          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col;
            if (h >= 0.0) {
              // remap elevation to the camera-visible band so the top of frame is already deep midnight
              float t = pow(h, 0.22);
              col = glow;
              col = mix(col, peach, smoothstep(0.00, 0.07, t));
              col = mix(col, rose, smoothstep(0.06, 0.22, t));
              col = mix(col, magenta, smoothstep(0.20, 0.42, t));
              col = mix(col, violet, smoothstep(0.40, 0.62, t));
              col = mix(col, midnight, smoothstep(0.60, 0.92, t));
            } else {
              col = mix(glow, below, smoothstep(0.0, 0.35, -h));
            }

            // warm horizon illumination, strongest toward the sun azimuth
            float sazim = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
            col += glow * pow(1.0 - abs(h), 24.0) * (0.25 + 0.75 * sazim) * 0.7;

            // restrained purple nebula in the upper sky
            if (h > 0.18) {
              float n = vnoise(d * 3.1) * 0.6 + vnoise(d * 7.7 + 13.7) * 0.4;
              float mask = smoothstep(0.62, 0.95, n) * smoothstep(0.18, 0.45, h);
              col = mix(col, nebulaColor, mask * 0.16);
              col = mix(col, rose * 0.8, smoothstep(0.78, 0.98, n) * smoothstep(0.25, 0.5, h) * 0.08);
            }

            // crescent moon (upper right): lit disc minus an offset occluder disc
            float ms = max(dot(d, moonDir), 0.0);
            vec3 moonOff = normalize(moonDir + vec3(0.015, 0.008, 0.0));
            float os = max(dot(d, moonOff), 0.0);
            float disc = smoothstep(0.99945, 0.99968, ms);
            float bite = smoothstep(0.99938, 0.99962, os);
            float crescent = disc * (1.0 - bite);
            col += moonColor * crescent * 1.8;
            col += moonColor * pow(ms, 90.0) * 0.18;  // subtle halo

            // three sparse star layers: dim field + medium + rare bright accents,
            // independent phases/speeds, white-lavender-pink tints, gentle twinkle
            if (h > 0.06) {
              float vis = smoothstep(0.06, 0.34, h);
              // layer 1: dense dim field
              vec3 sp = floor(d * 260.0);
              float star = step(0.9965, hashS(sp));
              float tw = 0.5 + 0.5 * sin(time * (1.6 + hashS(sp + 1.7) * 2.6) + hashS(sp + 2.3) * 40.0);
              float b = 0.45 + 0.55 * hashS(sp + 3.1);
              vec3 tint = mix(vec3(0.95, 0.93, 1.0), vec3(1.0, 0.90, 0.95), hashS(sp + 5.9));
              col += tint * star * (0.25 + 0.75 * tw) * b * vis * 0.95;
              // layer 2: medium brighter stars
              vec3 sp2 = floor(d * 150.0);
              float star2 = step(0.9988, hashS(sp2));
              float tw2 = 0.5 + 0.5 * sin(time * (0.9 + hashS(sp2 + 7.7) * 2.2) + hashS(sp2 + 8.1) * 63.0);
              float b2 = 0.6 + 0.4 * hashS(sp2 + 9.3);
              float size2 = 0.7 + 0.5 * hashS(sp2 + 4.2);
              col += vec3(1.0, 0.98, 1.0) * star2 * (0.3 + 0.7 * tw2) * b2 * vis * 1.25 * size2;
              // layer 3: rare bright accents, some pink-tinted
              vec3 sp3 = floor(d * 90.0);
              float star3 = step(0.99955, hashS(sp3));
              float tw3 = 0.5 + 0.5 * sin(time * (0.6 + hashS(sp3 + 3.3) * 1.4) + hashS(sp3 + 6.6) * 91.0);
              vec3 tint3 = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.85, 0.92), hashS(sp3 + 1.1));
              col += tint3 * star3 * (0.35 + 0.65 * tw3) * vis * 1.6;
            }

            // occasional subtle shooting stars (3 staggered meteors)
            for (int i = 0; i < 3; i++) {
              float fi = float(i);
              float period = 17.0 + fi * 6.3;
              float cyc = fract(time / period + fi * 0.37);
              if (cyc < 0.055) {
                float prog = cyc / 0.055;
                float fade = sin(3.14159 * prog);
                vec3 a = normalize(vec3(hash(vec3(fi, 1.0, 2.0)) - 0.5, 0.45 + hash(vec3(fi, 3.0, 1.0)) * 0.4, -1.0));
                vec3 v = normalize(vec3(-0.55 - hash(vec3(fi, 5.0, 5.0)) * 0.3, -0.28, 0.0));
                vec3 head = normalize(a + v * prog * 0.30);
                vec3 tail = normalize(a + v * prog * 0.16);
                col += vec3(1.0, 0.92, 0.98) * (pow(max(dot(d, head), 0.0), 2200.0) * 1.4 + pow(max(dot(d, tail), 0.0), 3000.0) * 0.5) * fade;
              }
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
    const cx = (rand() - 0.5) * 1.7;
    const cy = (rand() - 0.5) * 0.6 + 0.12;
    const cz = (rand() - 0.5) * 1.0;
    const cr = 0.5 + rand() * 0.65;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const dx = x / len, dy = y / len, dz = z / len;
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
    const n = noise(x * 0.005 + seed, 0, z * 0.005) * 30 + noise(x * 0.0013, 3.7, z * 0.0013) * 70;
    pos.setY(i, n);
    noiseAttr[i] = n / 100;
  }
  geo.setAttribute('aNoise', new THREE.BufferAttribute(noiseAttr, 1));
  geo.computeVertexNormals();
  return geo;
}

/* ---------- cloud shader: soft volumetric-style twilight shading ---------- */
function useCloudMaterial(): THREE.ShaderMaterial {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: {
          sunDir: { value: SUN_DIR.clone() },
          sunColor: { value: new THREE.Color('#ffb27a') },   // warm horizon light
          baseColor: { value: new THREE.Color('#ffeef8') },  // pink-white
          shadeColor: { value: new THREE.Color('#a678d8') }, // purple shadow
          underColor: { value: new THREE.Color('#ff9e8a') }, // warm bounce from horizon
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
            float ndl = dot(N, sunDir) * 0.5 + 0.5;
            float sun = pow(max(dot(N, sunDir), 0.0), 2.0);
            vec3 col = mix(shadeColor, baseColor, pow(ndl, 1.15) * 0.9 + 0.1);
            col += sunColor * sun * 0.4;                            // warm horizon kiss
            float down = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
            col = mix(col, underColor * 0.85 + shadeColor * 0.35, down * 0.45); // warm undersides
            col += sunColor * pow(max(dot(V, -sunDir), 0.0), 4.0) * 0.16;       // forward scatter
            float fres = pow(1.0 - abs(dot(N, V)), 2.5);
            col += sunColor * fres * 0.22 * (0.4 + 0.6 * max(dot(N, sunDir), 0.0));
            float h = clamp(vWorldPos.y / 400.0 + 0.5, 0.0, 1.0);
            col = mix(col, baseColor * vec3(0.99, 0.96, 1.05), h * 0.35);
            col *= 0.92 + vNoise * 0.16;
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

/* ---------- drifting + bobbing cloud layer ---------- */
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
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const step = reduced ? 0 : direction * speed * dt;
    for (let i = 0; i < g.children.length; i++) {
      xs.current[i] += step;
      if (xs.current[i] > loopWidth / 2) xs.current[i] -= loopWidth;
      else if (xs.current[i] < -loopWidth / 2) xs.current[i] += loopWidth;
      const m = g.children[i];
      m.position.x = xs.current[i];
      if (!reduced) m.position.y = specs[i].y + Math.sin(t * 0.12 + i * 1.7) * 3.5; // subtle vertical bob
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
    m.position.y = -320 + Math.sin(state.clock.elapsedTime * 0.1) * 5;
  });
  return <mesh ref={ref} geometry={geometry} material={material} position={[0, -320, -1100]} raycast={() => null} />;
}

/* ---------- layered distant mountains (real 3D geometry, vertex-coloured) ---------- */
function makeMountain(seed: number, height: number, radius: number, base: string, mid: string, tip: string): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.1, radius * 0.55, height, 10, 6, false);
  const noise = makeNoise3D(seed);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cBase = new THREE.Color(base);
  const cMid = new THREE.Color(mid);
  const cTip = new THREE.Color(tip);
  const c = new THREE.Color();
  const half = height / 2;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const rlen = Math.sqrt(x * x + z * z) || 1;
    const n = noise((x / rlen) * 1.6 + seed, y * 0.02 + seed, (z / rlen) * 1.6);
    const pinch = y < -half * 0.3 ? 0.72 : 1.0;
    x = x * (1 + n * 0.38) * pinch;
    z = z * (1 + n * 0.38) * pinch;
    y += noise(x * 0.05, y * 0.05 + seed, z * 0.05) * height * 0.06;
    pos.setXYZ(i, x, y, z);
    const h01 = THREE.MathUtils.clamp((y + half) / height, 0, 1);
    c.copy(cBase).lerp(cMid, THREE.MathUtils.smoothstep(h01, 0.25, 0.7));
    c.lerp(cTip, THREE.MathUtils.smoothstep(h01, 0.74, 0.95)); // rim-lit tips
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function DistantMountains({ mobile }: { mobile: boolean }) {
  const meshes = useMemo(() => {
    const rand = mulberry32(2024);
    const defs: { x: number; z: number; s: number; seed: number; far: boolean }[] = [];
    // nearer range: deeper purple silhouettes
    for (let r = 0; r < 4; r++) {
      const cx = -2200 + (r * 4400) / 3 + (rand() - 0.5) * 500;
      const cz = -2300 - rand() * 600;
      const peaks = 2 + Math.floor(rand() * 2);
      for (let pIdx = 0; pIdx < peaks; pIdx++) {
        defs.push({
          x: cx + (rand() - 0.5) * 700,
          z: cz + (rand() - 0.5) * 400,
          s: 170 + rand() * 190,
          seed: 3000 + defs.length * 13,
          far: false,
        });
      }
    }
    // far arc: lighter, heavily fogged layer for depth
    for (let i = 0; i < 6; i++) {
      defs.push({
        x: (rand() - 0.5) * 6200,
        z: -3100 - rand() * 800,
        s: 220 + rand() * 240,
        seed: 4000 + i * 17,
        far: true,
      });
    }
    return defs.map((d) => ({
      ...d,
      geo: d.far
        ? makeMountain(d.seed, 100, d.s * 0.45, '#5a4490', '#7a5fb0', '#d8a8ff')
        : makeMountain(d.seed, 100, d.s * 0.45, '#3a2a5e', '#5a3f85', '#ff9ec8'),
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

/* ---------- procedural PMREM environment map (twilight) ---------- */
function EnvironmentLight() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new THREE.Scene();
    const c = document.createElement('canvas');
    c.width = 16; c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, '#150b2e');
    g.addColorStop(0.4, '#5b2d8e');
    g.addColorStop(0.58, '#b03aa0');
    g.addColorStop(0.68, '#ef6fa8');
    g.addColorStop(0.74, '#ffb27a');
    g.addColorStop(1.0, '#1a0f33');
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
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(4, 12, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb27a') }),
    );
    sun.position.copy(SUN_DIR).multiplyScalar(40);
    envScene.add(sun);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8dcff') }),
    );
    moon.position.copy(MOON_DIR).multiplyScalar(40);
    envScene.add(moon);
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.4;
    return () => {
      scene.environment = null;
      envMap.dispose();
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* ---------- twilight lighting ---------- */
function TwilightLighting({ shadowSize }: { shadowSize: number }) {
  const sunPos = SUN_DIR.clone().multiplyScalar(900);
  return (
    <>
      <hemisphereLight args={['#9a78e8', '#4a2f66', 0.65]} />
      <ambientLight args={['#c0a0f0', 0.3]} />
      <directionalLight
        position={[sunPos.x, Math.max(sunPos.y, 80), sunPos.z]}
        intensity={2.6}
        color="#ff9e7a"
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
      <directionalLight position={[-350, 220, 350]} intensity={0.45} color="#8a78d8" />
      {/* warm frontal fills so island faces stay warm-lit, never silhouettes */}
      <directionalLight position={[160, 140, 520]} intensity={0.95} color="#ffc9b0" />
      <directionalLight position={[-60, 220, 640]} intensity={0.6} color="#ffd9c4" />
    </>
  );
}

/* ---------- root ---------- */
export function MagentaTwilightWorld() {
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
      sea: makeSeaGeometry(mobile ? 64 : 96, 555),
    };
  }, [mobile]);

  const material = useCloudMaterial();

  // pink-purple cloud sea that resists fog so the horizon glows
  const seaMaterial = useMemo(() => {
    const m = material.clone();
    m.uniforms.baseColor.value.set('#e8b8e0');
    m.uniforms.shadeColor.value.set('#8a5fc0');
    m.uniforms.underColor.value.set('#ff9e8a');
    m.uniforms.fogFar.value = 9000;
    return m;
  }, [material]);

  const far: FormationSpec[] = useMemo(() => {
    // thin distant formations at the ocean's far edge, behind everything
    const n = mobile ? 4 : 5;
    const rand = mulberry32(42);
    return Array.from({ length: n }, (_, i) => ({
      y: -260 + rand() * 60,
      z: -2000 - rand() * 1000,
      s: 55 + rand() * 40,
      v: i % 3,
    }));
  }, [mobile]);

  const swell: FormationSpec[] = useMemo(() => {
    // large deep-ocean swells — the back of the cloud ocean, well below the islands
    const n = mobile ? 3 : 4;
    const rand = mulberry32(55);
    return Array.from({ length: n }, (_, i) => ({
      y: -210 + rand() * 60,
      z: -1000 - rand() * 500,
      s: 200 + rand() * 90,
      v: i % 4,
    }));
  }, [mobile]);

  const mid: FormationSpec[] = useMemo(() => {
    // main cloud-ocean masses, top edge near the bottom third of the frame
    const n = mobile ? 4 : 6;
    const rand = mulberry32(77);
    return Array.from({ length: n }, (_, i) => ({
      y: -230 + rand() * 50,
      z: -800 - rand() * 400,
      s: 110 + rand() * 70,
      v: i % 4,
    }));
  }, [mobile]);

  const near: FormationSpec[] = useMemo(() => {
    // foreground ocean layer, deep in the bottom of the frame below the islands
    const n = mobile ? 2 : 3;
    const rand = mulberry32(99);
    return Array.from({ length: n }, (_, i) => ({
      y: -240 + rand() * 60,
      z: -300 - rand() * 150,
      s: 90 + rand() * 55,
      v: i % 3,
    }));
  }, [mobile]);

  return (
    <>
      <color attach="background" args={['#241040']} />
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <EnvironmentLight />
      <SkyDome />
      <DistantMountains mobile={mobile} />
      <CloudSea geometry={geoms.sea} material={seaMaterial} reduced={reduced} />
      <CloudLayer specs={far} geoms={geoms.far} material={material} speed={1.6} direction={1} loopWidth={5000} reduced={reduced} />
      <CloudLayer specs={swell} geoms={geoms.mid} material={material} speed={1.1} direction={1} loopWidth={4600} reduced={reduced} />
      <CloudLayer specs={mid} geoms={geoms.mid} material={material} speed={4.5} direction={-1} loopWidth={3200} reduced={reduced} />
      <CloudLayer specs={near} geoms={geoms.near} material={material} speed={8} direction={1} loopWidth={1600} reduced={reduced} />
      <TwilightLighting shadowSize={mobile ? 1024 : 2048} />
    </>
  );
}
