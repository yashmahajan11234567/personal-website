import * as THREE from 'three';
import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { P } from '../palette';
import { view } from '../../player/state';

export interface IslandSpec {
  cx: number;
  cz: number;
  r: number;
}

const OCEAN_SIZE = 1400;
const OCEAN_SEGMENTS = 128;
const SUN_DIR = new THREE.Vector3(-0.55, 0.35, -0.75).normalize();
const MOON_DIR = new THREE.Vector3(0.55, 0.65, 0.55).normalize();

/** Flat ring mesh at each island shoreline for foam */
export function FoamRings({ islands }: { islands: IslandSpec[] }) {
  const geoRef = useRef<THREE.RingGeometry | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    geoRef.current = new THREE.RingGeometry(0, 0, 32); // placeholder, recreated per island
    matRef.current = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    meshRefs.current = islands.map((isl) => {
      const g = new THREE.RingGeometry(isl.r, isl.r + 1.6, 48);
      const m = new THREE.Mesh(g, matRef.current!);
      m.position.set(isl.cx, 0.05, isl.cz);
      m.rotation.x = -Math.PI / 2;
      return m;
    });
  }, [islands]);

  return (
    <group>
      {meshRefs.current.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </group>
  );
}

/** Main ocean plane with Gerstner wave vertex shader + custom fragment.
 * Geometry/material are created with useMemo (during render) so the mesh never
 * mounts with null geometry — the effect-then-render pattern crashed culling. */
export function VoxelOcean() {
  const { clock, camera } = useThree();
  const prevNightRef = useRef(view.night);
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOceanDeep: { value: new THREE.Color(P.oceanDeep) },
        uOceanMid: { value: new THREE.Color(P.oceanMid) },
        uOceanShallow: { value: new THREE.Color(P.oceanShallow) },
        uSkyHorizon: { value: new THREE.Color(P.skyHorizon) },
        uSunsetHorizon: { value: new THREE.Color(0xffb27a) },
        uSunDir: { value: SUN_DIR.clone() },
        uSunColor: { value: new THREE.Color(0xfff8e7) },
        uMoonDir: { value: MOON_DIR.clone() },
        uMoonColor: { value: new THREE.Color(0xe8e8ff) },
        uNightFactor: { value: view.night ? 1.0 : 0.0 },
        uNightHorizon: { value: new THREE.Color(0x1e3a5f) },
        uCameraPos: { value: new THREE.Vector3() },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vWaveHeight;

        // Gerstner wave
        vec3 gerstner(vec2 xz, float amplitude, float wavelength, float speed, float dirX, float dirZ) {
          float k = 2.0 * 3.14159265 / wavelength;
          float c = sqrt(9.81 / k);
          float f = k * (dirX * xz.x + dirZ * xz.y) - speed * uTime;
          float a = amplitude / k;
          float s = sin(f);
          float c_ = cos(f);
          return vec3(
            a * dirX * c_,
            amplitude * s,
            a * dirZ * c_
          );
        }

        void main() {
          vec3 pos = position;

          // Two octaves of Gerstner waves
          vec3 w1 = gerstner(pos.xz, 0.12, 14.0, 0.9, 0.85, 0.52);
          vec3 w2 = gerstner(pos.xz, 0.06, 7.0, 1.4, -0.35, 0.94);

          pos += w1 + w2;
          vWaveHeight = pos.y; // crest positive, trough negative

          // Approximate normal from wave derivatives
          float eps = 0.1;
          vec3 dw1_dx = gerstner(pos.xz + vec2(eps, 0.0), 0.12, 14.0, 0.9, 0.85, 0.52) - w1;
          vec3 dw1_dz = gerstner(pos.xz + vec2(0.0, eps), 0.12, 14.0, 0.9, 0.85, 0.52) - w1;
          vec3 dw2_dx = gerstner(pos.xz + vec2(eps, 0.0), 0.06, 7.0, 1.4, -0.35, 0.94) - w2;
          vec3 dw2_dz = gerstner(pos.xz + vec2(0.0, eps), 0.06, 7.0, 1.4, -0.35, 0.94) - w2;
          vec3 tangentX = vec3(1.0 + dw1_dx.x + dw2_dx.x, dw1_dx.y + dw2_dx.y, dw1_dx.z + dw2_dx.z);
          vec3 tangentZ = vec3(dw1_dz.x + dw2_dz.x, dw1_dz.y + dw2_dz.y, 1.0 + dw1_dz.z + dw2_dz.z);
          vNormal = normalize(cross(tangentZ, tangentX));

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uOceanDeep;
        uniform vec3 uOceanMid;
        uniform vec3 uOceanShallow;
        uniform vec3 uSkyHorizon;
        uniform vec3 uSunsetHorizon;
        uniform vec3 uNightHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uMoonDir;
        uniform vec3 uMoonColor;
        uniform float uNightFactor;
        uniform vec3 uCameraPos;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vWaveHeight;

        void main() {
          // Depth tint by wave height: crest -> shallow, trough -> deep
          float heightNorm = smoothstep(-0.15, 0.15, vWaveHeight);
          vec3 baseColor = mix(uOceanDeep, uOceanShallow, heightNorm);
          baseColor = mix(baseColor, uOceanMid, 0.3); // blend mid tone

          // Night darkening
          baseColor = mix(baseColor, baseColor * 0.65, uNightFactor);

          // Fresnel-ish rim toward horizon (blend to warm sunset at grazing angles)
          vec3 viewDir = normalize(uCameraPos - vWorldPos);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
          vec3 targetHorizon = mix(uSkyHorizon, uSunsetHorizon, 0.7);
          targetHorizon = mix(targetHorizon, uNightHorizon, uNightFactor);
          vec3 horizonBlend = mix(baseColor, targetHorizon, fresnel * 0.4);

          // Specular glint (sun or moon)
          vec3 lightDir = mix(uSunDir, uMoonDir, uNightFactor);
          vec3 lightColor = mix(uSunColor, uMoonColor, uNightFactor);
          float NdotL = max(dot(vNormal, lightDir), 0.0);
          float specular = pow(NdotL, 64.0) * 2.5; // tight highlight
          vec3 specularColor = lightColor * specular;

          vec3 finalColor = horizonBlend + specularColor;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      side: THREE.FrontSide,
      fog: false, // haze is handled manually via the fresnel horizon blend
    });
    return { geometry: geo, material: mat };
  }, []);

  useFrame(() => {
    const mat = material;
    if (!mat) return;

    // Update time uniform (cap dt to avoid spiral on tab restore)
    const dt = Math.min(clock.getDelta(), 0.1);
    mat.uniforms.uTime.value += dt;

    // Update camera position for fresnel
    mat.uniforms.uCameraPos.value.copy(camera.position);

    // Night factor transition
    const target = view.night ? 1.0 : 0.0;
    if (Math.abs(mat.uniforms.uNightFactor.value - target) > 0.001) {
      mat.uniforms.uNightFactor.value = target;
      prevNightRef.current = view.night;
    }
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}