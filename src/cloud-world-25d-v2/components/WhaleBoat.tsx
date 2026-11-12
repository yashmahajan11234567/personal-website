/**
 * Whale Boat — Docker whale inspired procedural mesh with bob/tilt physics.
 * If AI-generated GLB becomes available, swap the mesh.
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot } from './Character';

const BOAT_CONFIG = {
  maxSpeed: 8,
  acceleration: 3,
  turnRate: 1.2,
  drag: 0.97,
  bobAmp: 0.12,
  bobFreq: 0.7,
  tiltFactor: 0.25,
};

export function WhaleBoat() {
  const meshRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(new THREE.Vector2(0, 0));
  const bobPhase = useRef(0);

  // Build whale geometry (procedural)
  useEffect(() => {
    if (!meshRef.current) return;

    const group = meshRef.current;

    // Body (elongated ellipsoid)
    const bodyGeo = new THREE.SphereGeometry(1, 24, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0077cc,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(3.5, 1.2, 6);
    body.position.y = 0.3;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // White belly
    const bellyGeo = new THREE.SphereGeometry(1, 20, 12);
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
    });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(2.8, 0.6, 5);
    belly.position.y = -0.4;
    group.add(belly);

    // Waterline stripes
    for (let i = 0; i < 3; i++) {
      const stripeGeo = new THREE.TorusGeometry(2.5 + i * 0.3, 0.03, 8, 32);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.y = -0.3 + i * 0.15;
      group.add(stripe);
    }

    // Bow eyes
    for (const side of [-1, 1]) {
      const eyeGeo = new THREE.SphereGeometry(0.25, 12, 8);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 1.8, 0.6, 2.8);
      eye.scale.z = 0.5;
      group.add(eye);
    }

    // Flukes (tail)
    const flukeGeo = new THREE.PlaneGeometry(1.8, 0.8);
    const flukeMat = new THREE.MeshStandardMaterial({
      color: 0x0055aa,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    for (const side of [-1, 1]) {
      const fluke = new THREE.Mesh(flukeGeo, flukeMat);
      fluke.position.set(side * 1.2, 0.1, -3.2);
      fluke.rotation.y = side * 0.4;
      fluke.rotation.x = -0.2;
      group.add(fluke);
    }

    // Container pods on back
    const podGeo = new THREE.BoxGeometry(1.2, 0.8, 1.5);
    const podMat = new THREE.MeshStandardMaterial({ color: 0x0066bb, roughness: 0.5 });
    for (let i = 0; i < 2; i++) {
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.set((i - 0.5) * 1.4, 1.0, -0.5);
      pod.castShadow = true;
      group.add(pod);
    }

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 1, 1.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.7 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.4, 0.5);
    cabin.castShadow = true;
    group.add(cabin);

    // Cabin roof
    const roofGeo = new THREE.BoxGeometry(1.7, 0.2, 1.4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 1.9, 0.5);
    group.add(roof);

    // Initial position
    group.position.set(pilot.boatPos.x, 0.5, pilot.boatPos.z);
  }, []);

  // Physics update (driven by Character component)
  useFrame((_, dt) => {
    const group = meshRef.current;
    if (!group) return;

    // Bob animation
    bobPhase.current += dt * BOAT_CONFIG.bobFreq;
    group.position.y = 0.5 + Math.sin(bobPhase.current) * BOAT_CONFIG.bobAmp;

    // Tilt based on velocity
    const vx = velocityRef.current.x;
    group.rotation.z = -vx * BOAT_CONFIG.tiltFactor;

    // Sync with pilot.boatPos
    group.position.x = pilot.boatPos.x;
    group.position.z = pilot.boatPos.z;
    group.rotation.y = pilot.heading;
  });

  return <group ref={meshRef} />;
}