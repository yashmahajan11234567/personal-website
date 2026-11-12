/**
 * Enhanced stylized shader materials — Garden Warfare inspired.
 * Volumetric sky, volumetric clouds, stylized water with caustics/foam lines.
 */
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';

// ============================================
// SKY DOME — Volumetric gradient + sun + horizon glow
// ============================================
export const SkyDomeMaterial = shaderMaterial(
  {
    uZenith: new THREE.Color(0x3a8fd8),      // vibrant blue zenith
    uHorizon: new THREE.Color(0xfff8e7),     // warm cream horizon
    uSunDir: new THREE.Vector3(0.3, 0.75, 0.4),
    uSunSize: 0.008,
    uSunIntensity: 2.0,
    uSunColor: new THREE.Color(0xfff5d8),
    uHorizonGlow: new THREE.Color(0xffd4a8),
    uCloudTint: new THREE.Color(0xffffff),
    uTime: 0,
    uCameraPos: new THREE.Vector3(0, 15, 34),
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    uniform vec3 uSunDir;
    uniform float uSunSize;
    uniform float uSunIntensity;
    uniform vec3 uSunColor;
    uniform vec3 uHorizonGlow;
    uniform vec3 uCloudTint;
    uniform float uTime;
    uniform vec3 uCameraPos;

    void main() {
      // DEBUG: Output pure zenith color to verify pipeline
      gl_FragColor = vec4(uZenith, 1.0);
    }
  `,
);

// ============================================
// VOLUMETRIC CLOUDS — 3-layer instanced cloud system
// ============================================
export const CloudMaterial = shaderMaterial(
  {
    uSunDir: new THREE.Vector3(0.3, 0.75, 0.4),
    uSunColor: new THREE.Color(0xfff5d8),
    uCloudColor: new THREE.Color(0xffffff),
    uShadowColor: new THREE.Color(0xc8d8e8),
    uLayer: 0.0,
    uTime: 0.0,
  },
  /* glsl */ `
    varying vec3 vPos;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uLayer;
    // Noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289((x*34.0+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0+1.0;
      vec4 s1 = floor(b1)*2.0+1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.xxyy;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m = m*m;
      return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    void main() {
      vUv = uv;
      vec3 p = position;
      
      // Layer-specific drift and bob
      float drift = uLayer == 0.0 ? 0.3 : (uLayer == 1.0 ? 0.6 : 1.0);
      float bobFreq = 0.35;
      float bobAmp = uLayer == 0.0 ? 0.1 : (uLayer == 1.0 ? 0.18 : 0.25);
      
      p.x += sin(uTime * bobFreq + p.z * 0.05) * bobAmp;
      p.y += cos(uTime * bobFreq * 0.6 + p.x * 0.05) * bobAmp * 0.6;
      p.x += uTime * drift * 0.5;
      
      // Cloud shape noise
      float n = snoise(p * 0.015 + uTime * 0.0004) * 0.4;
      p += normal * n;
      
      vPos = p;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPos;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uCloudColor;
    uniform vec3 uShadowColor;
    uniform float uLayer;
    uniform float uTime;
    
    void main() {
      // Fluffy cloud coloring with self-shadowing
      vec3 col = uCloudColor;
      
      // Height-based tint (warmer at bottom)
      float h = smoothstep(50.0, 120.0, vPos.y);
      col = mix(col, uSunColor * 0.6, h * 0.3);
      
      // Lighting from sun
      vec3 n = normalize(vPos);
      float ndotl = max(dot(n, normalize(uSunDir)), 0.0);
      
      // Lit side
      col += uSunColor * ndotl * 0.4;
      
      // Self-shadow (underside of cloud)
      float shadow = smoothstep(-0.3, 0.2, n.y);
      col = mix(uShadowColor, col, shadow);
      
      // Rim light on edges
      float rim = pow(1.0 - max(dot(n, normalize(vPos - cameraPosition)), 0.0), 2.0);
      col += uSunColor * rim * 0.15;
      
      // Alpha: soft edges, denser center
      float alpha = 0.75;
      alpha *= smoothstep(0.0, 20.0, length(vPos.xz));
      alpha *= uLayer == 0.0 ? 0.6 : (uLayer == 1.0 ? 0.85 : 1.0);
      
      // Subtle animation shimmer
      alpha += sin(uTime * 0.5 + vPos.x * 0.02 + vPos.z * 0.02) * 0.05;
      
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    }
  `,
);

// ============================================
// STYLIZED WATER — Garden Warfare: turquoise, foam lines, caustics, sparkle
// ============================================
export const WaterMaterial = shaderMaterial(
  {
    uTime: 0.0,
    uShallowColor: new THREE.Color(0x4fe0d0),    // bright turquoise shallow
    uDeepColor: new THREE.Color(0x1a7a8a),       // teal deep
    uFoamColor: new THREE.Color(0xffffff),
    uFoamLineColor: new THREE.Color(0xffffff),
    uSparkleColor: new THREE.Color(0xffffee),
    uDepth: 12.0,
    uShoreDist: 0.0,
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      
      // Gerstner-style waves (vertex displacement)
      float wave1 = sin(worldPos.x * 0.12 + uTime * 1.0) * 0.04;
      float wave2 = sin(worldPos.z * 0.1 - uTime * 0.8) * 0.03;
      float wave3 = sin((worldPos.x + worldPos.z) * 0.07 + uTime * 0.6) * 0.02;
      float wave4 = sin((worldPos.x - worldPos.z) * 0.05 + uTime * 0.4) * 0.015;
      
      vec3 p = position;
      p.y += wave1 + wave2 + wave3 + wave4;
      
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    uniform float uTime;
    uniform vec3 uShallowColor;
    uniform vec3 uDeepColor;
    uniform vec3 uFoamColor;
    uniform vec3 uFoamLineColor;
    uniform vec3 uSparkleColor;
    uniform float uDepth;
    uniform float uShoreDist;
    
    vec2 rotate(vec2 v, float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c) * v;
    }
    
    // Hash for sparkle
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    void main() {
      // Multi-layer animated normals for foam lines
      vec2 uv1 = vUv * 12.0 + vec2(uTime * 0.015, uTime * 0.01);
      vec2 uv2 = vUv * 6.0 - vec2(uTime * 0.008, uTime * 0.005);
      uv2 = rotate(uv2, 0.7);
      vec2 uv3 = vUv * 24.0 + vec2(uTime * 0.025, uTime * 0.018);
      uv3 = rotate(uv3, -0.4);
      
      float n1 = sin(uv1.x * 6.28 + uTime) * 0.5 + 0.5;
      float n2 = sin(uv2.y * 6.28 - uTime * 0.7) * 0.5 + 0.5;
      float n3 = sin(uv3.x * 6.28 + uv3.y * 6.28 + uTime * 0.5) * 0.5 + 0.5;
      
      // Combine for foam line pattern (parallel lines like stylized water)
      float foamLines = smoothstep(0.45, 0.55, n1) * 0.6;
      foamLines += smoothstep(0.48, 0.52, n2) * 0.4;
      foamLines += smoothstep(0.42, 0.58, n3) * 0.2;
      foamLines = clamp(foamLines, 0.0, 1.0);
      
      // Normal for reflection
      float normalY = mix(0.8, 1.0, (n1 + n2) * 0.5);
      vec3 normal = normalize(vec3(n1 - 0.5, normalY, n2 - 0.5) * 0.15 + vec3(0.0, 1.0, 0.0));
      
      // Depth-based color
      float depthFactor = 1.0 - exp(-uDepth * 0.12);
      vec3 waterColor = mix(uShallowColor, uDeepColor, depthFactor);
      
      // Shore foam (white caps near land)
      float shoreFoam = 1.0 - smoothstep(0.0, 8.0, uShoreDist);
      shoreFoam = pow(shoreFoam, 2.0);
      
      // Foam lines + shore foam
      float foam = foamLines * 0.7 + shoreFoam * 0.8;
      foam = clamp(foam, 0.0, 1.0);
      
      // Fresnel reflection
      vec3 viewDir = normalize(vWorldPos - cameraPosition);
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);
      vec3 reflected = uShallowColor * fresnel * 0.5;
      
      // Underwater caustics (simplified)
      float caustic = sin(vWorldPos.x * 0.5 + uTime * 2.0) * 
                      sin(vWorldPos.z * 0.5 - uTime * 1.5);
      caustic = smoothstep(0.7, 1.0, caustic) * 0.15;
      waterColor += vec3(caustic);
      
      // Sparkle highlights
      float sparkleGrid = hash(floor(vWorldPos.xz * 0.1 + uTime * 0.05));
      float sparkle = pow(max(dot(reflect(-viewDir, normal), normalize(uSparkleColor)), 0.0), 64.0);
      sparkle *= step(0.98, sparkleGrid) * 0.4;
      
      // Final composition
      vec3 final = waterColor;
      final += reflected;
      final += uFoamLineColor * foam * 0.9;
      final += uFoamColor * shoreFoam * 0.6;
      final += uSparkleColor * sparkle;
      
      // Alpha: more opaque in deep, transparent at foam
      float alpha = 0.92 - foam * 0.25;
      
      gl_FragColor = vec4(final, alpha);
    }
  `,
);

// ============================================
// TERRAIN — Painted texture blending (sand/grass/dirt/rock)
// ============================================
export const TerrainMaterial = shaderMaterial(
  {
    uTime: 0.0,
    uSandColor: new THREE.Color(0xf4e4bc),
    uGrassColor: new THREE.Color(0x6fc45c),
    uGrassDark: new THREE.Color(0x4aa03a),
    uDirtColor: new THREE.Color(0x9b7a5a),
    uRockColor: new THREE.Color(0x7a6b5e),
    uCliffColor: new THREE.Color(0x5a5048),
    uSnowColor: new THREE.Color(0xf0f0f0),
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    uniform float uTime;
    void main() {
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    uniform float uTime;
    uniform vec3 uSandColor;
    uniform vec3 uGrassColor;
    uniform vec3 uGrassDark;
    uniform vec3 uDirtColor;
    uniform vec3 uRockColor;
    uniform vec3 uCliffColor;
    uniform vec3 uSnowColor;
    
    // 3D noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289((x*34.0+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0+1.0;
      vec4 s1 = floor(b1)*2.0+1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.xxyy;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m = m*m;
      return 42.0*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    
    void main() {
      float y = vWorldPos.y;
      float slope = 1.0 - max(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0);
      
      // Noise for natural transitions
      float noise = snoise(vWorldPos * 0.05 + uTime * 0.0001) * 0.5 + 0.5;
      
      // Base color by height
      vec3 col;
      if (y < 0.5) {
        // Beach / shallow underwater -> sand
        col = uSandColor;
      } else if (y < 1.8) {
        // Grassland
        float t = (y - 0.5) / 1.3;
        t += noise * 0.15;
        col = mix(uSandColor, uGrassColor, smoothstep(0.0, 1.0, t));
      } else if (y < 3.5) {
        // Hilltop grass (darker)
        float t = (y - 1.8) / 1.7;
        col = mix(uGrassColor, uGrassDark, smoothstep(0.0, 1.0, t));
      } else if (y < 5.0) {
        // Dirt / rock transition
        float t = (y - 3.5) / 1.5;
        col = mix(uGrassDark, uDirtColor, smoothstep(0.0, 1.0, t));
      } else if (y < 8.0) {
        // Rock
        float t = (y - 5.0) / 3.0;
        col = mix(uDirtColor, uRockColor, smoothstep(0.0, 1.0, t));
      } else {
        // High peaks -> cliff / snow dusting
        float t = min(1.0, (y - 8.0) / 4.0);
        col = mix(uRockColor, uCliffColor, t);
        col = mix(col, uSnowColor, t * 0.3);
      }
      
      // Steep slopes -> rock/dirt
      if (slope > 0.55) {
        float rockAmt = smoothstep(0.55, 0.85, slope);
        col = mix(col, uRockColor, rockAmt * 0.7);
      }
      
      // Lighting
      vec3 lightDir = normalize(vec3(0.4, 0.8, 0.3));
      float ndotl = max(dot(vNormal, lightDir), 0.0);
      float ambient = 0.45;
      col = col * (ambient + ndotl * 0.55);
      
      // Rim light on ridges
      float rim = pow(1.0 - max(dot(vNormal, normalize(vWorldPos - cameraPosition)), 0.0), 3.0);
      col += vec3(1.0, 0.95, 0.9) * rim * 0.08;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `,
);

// Register all materials
extend({ SkyDomeMaterial, CloudMaterial, WaterMaterial, TerrainMaterial });