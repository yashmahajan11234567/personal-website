/**
 * Fog — Exponential atmospheric depth with height-based density.
 */
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../world';

export function Fog() {
  const { scene } = useThree();
  // Exponential squared fog for natural atmospheric perspective
  scene.fog = new THREE.FogExp2(WORLD.FOG.color, 0.0045);
  return null;
}