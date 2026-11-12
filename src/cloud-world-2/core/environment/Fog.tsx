import * as THREE from 'three';
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { P } from '../palette';
import { view } from '../../player/state';

/** Scene fog — sunset: pale sky blue, night: indigo. Reacts to view.night. */
export function SceneFog() {
  const { scene } = useThree();

  useEffect(() => {
    const fog = new THREE.FogExp2(P.skyHorizon, 0.00035);
    scene.fog = fog;
    return () => {
      if (scene.fog === fog) scene.fog = null;
    };
  }, [scene]);

  // view.night is a mutable flag (not React state) — poll it in a frame loop
  useFrame(() => {
    const fog = scene.fog as THREE.FogExp2 | null;
    if (!fog) return;
    const targetColor = view.night ? 0x3a2a5a : P.skyHorizon;
    if (fog.color.getHex() !== targetColor) fog.color.setHex(targetColor);
  });

  return null;
}