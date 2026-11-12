/**
 * Cloud World 2.0 — sky: gradient dome, blocky sun, blocky moon.
 *
 * Fresh implementation. Objects are created with useMemo (during render) and
 * mounted via <primitive>, so geometry always exists at first paint — the
 * ref-then-effect pattern here produced null-geometry meshes that crashed
 * frustum culling. The night flag (view.night) crossfades the gradient and
 * swaps sun ↔ moon.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { P } from '../palette';
import { view } from '../../player/state';

const SKY_RADIUS = 900;

/** Gradient dome: sunset ↔ night crossfade driven by uNightFactor. */
function SkyDome(): React.ReactElement {
  const prevNight = useRef(view.night);
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.SphereGeometry(SKY_RADIUS, 32, 32);
    geo.scale(-1, 1, 1); // invert normals for inside view
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uZenith: { value: new THREE.Color(0x6a5ac8) },
        uMid: { value: new THREE.Color(0xe07aa8) },
        uHorizon: { value: new THREE.Color(0xffb27a) },
        uNightZenith: { value: new THREE.Color(P.nightZenith) },
        uNightMid: { value: new THREE.Color(P.nightMid) },
        uNightHorizon: { value: new THREE.Color(P.nightHorizon) },
        uNightFactor: { value: view.night ? 1.0 : 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        varying float vY;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vY = normalize(worldPos.xyz).y;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uNightZenith;
        uniform vec3 uNightMid;
        uniform vec3 uNightHorizon;
        uniform float uNightFactor;
        varying float vY;

        void main() {
          float t = (vY + 1.0) * 0.5;
          vec3 sunsetColor;
          if (t < 0.5) sunsetColor = mix(uHorizon, uMid, t * 2.0);
          else sunsetColor = mix(uMid, uZenith, (t - 0.5) * 2.0);
          vec3 nightColor;
          if (t < 0.5) nightColor = mix(uNightHorizon, uNightMid, t * 2.0);
          else nightColor = mix(uNightMid, uNightZenith, (t - 0.5) * 2.0);
          gl_FragColor = vec4(mix(sunsetColor, nightColor, uNightFactor), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    return { geometry: geo, material: mat };
  }, []);

  useFrame(() => {
    const target = view.night ? 1.0 : 0.0;
    if (Math.abs(material.uniforms.uNightFactor.value - target) > 0.001) {
      material.uniforms.uNightFactor.value = target;
      prevNight.current = view.night;
    }
  });

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

/** Blocky sun quad at golden hour (low left); hidden at night. */
function Sun(): React.ReactElement {
  const mesh = useMemo(() => {
    const geo = new THREE.PlaneGeometry(24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff8e7,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(-180, 55, -120);
    return m;
  }, []);

  useFrame(() => {
    mesh.visible = !view.night;
    mesh.lookAt(0, 0, 0);
  });

  return <primitive object={mesh} />;
}

/** Blocky moon sphere upper-right with crater quads; hidden at golden hour. */
function Moon(): React.ReactElement {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const moon = new THREE.Mesh(
      new THREE.BoxGeometry(18, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xe8e8ff }),
    );
    g.add(moon);
    const craterGeo = new THREE.PlaneGeometry(4.5, 4.5);
    const craterMat = new THREE.MeshBasicMaterial({
      color: 0x3a2a5a,
      side: THREE.DoubleSide,
    });
    const craterPositions = [
      { x: 5, y: 3, z: 9.2 },
      { x: -4, y: -2, z: 9.2 },
      { x: 1, y: -5, z: 9.2 },
      { x: -6, y: 5, z: 9.2 },
    ];
    for (const pos of craterPositions) {
      const crater = new THREE.Mesh(craterGeo, craterMat);
      crater.position.set(pos.x, pos.y, pos.z);
      crater.rotation.y = Math.PI / 2;
      g.add(crater);
    }
    g.position.set(220, 160, -140);
    g.visible = false;
    return g;
  }, []);

  useFrame(() => {
    group.visible = view.night;
  });

  return <primitive object={group} />;
}

export function Sky(): React.ReactElement {
  return (
    <group>
      <SkyDome />
      <Sun />
      <Moon />
    </group>
  );
}
