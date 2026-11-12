/**
 * Cloud World 2.0 — the visitor: voxel body + animation.
 *
 * Fresh character for the greenfield world. Rigid part boxes (no skinning):
 * legs/arms swing from `pilot.stride`, body bobs, landing squash is applied
 * from `pilot.landImpact`. Three cosmetic variants (doc 03 §8.2):
 *   arrival   — red cape with white cloud emblem
 *   explorer  — red hoodie
 *   traveller — red scarf + khaki backpack
 * Swap is instant via `pilot.variant`; only one group is ever visible.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { P } from '../core/palette';
import { pilot, CHAR } from './state';
import { stepPhysics, publishZoneFrame, bindWorldQueries } from './controller';
import { terrainY } from '../core/world';
import { placePilotAtSpawn } from './controller';
import { useEffect } from 'react';

let bound = false;

export function VoxelCharacter(): React.ReactElement {
  const acc = useRef(0);
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Mesh>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const variantGroup = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!bound) {
      bindWorldQueries(terrainY);
      placePilotAtSpawn(terrainY);
      bound = true;
    }
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.2);
    acc.current = Math.min(acc.current + dt, 0.25);
    while (acc.current >= 1 / 60) {
      acc.current -= 1 / 60;
      stepPhysics();
    }
    publishZoneFrame();

    /* ---- transform + animation (render-side) ---- */
    if (group.current) {
      // render Y eases only when grounded so terraces glide, jumps stay crisp
      if (pilot.grounded) {
        pilot.visualY += (pilot.pos.y - pilot.visualY) * Math.min(1, dt * 14);
      } else {
        pilot.visualY = pilot.pos.y;
      }
      group.current.position.set(pilot.pos.x, pilot.visualY, pilot.pos.z);
      group.current.rotation.y = pilot.heading;

      const walking = pilot.moving && pilot.grounded;
      const animSpeed = walking ? (pilot.running ? 18 : 14) : 5;
      const swing = Math.sin(pilot.stride * animSpeed);

      if (legL.current && legR.current) {
        const s = walking ? swing * 0.32 : 0;
        legL.current.rotation.x = s;
        legR.current.rotation.x = -s;
      }
      if (armL.current && armR.current) {
        const s = walking ? Math.sin(pilot.stride * animSpeed + Math.PI) * 0.26 : 0;
        armL.current.rotation.x = s;
        armR.current.rotation.x = -s;
      }
      if (body.current && head.current) {
        const bob = walking ? Math.abs(Math.sin(pilot.stride * animSpeed)) * 0.045 : Math.sin(pilot.simTime * 2.2) * 0.012;
        body.current.position.y = 0.85 + bob;
        head.current.position.y = CHAR.BODY_H - 0.45 + bob;
      }
      // landing squash: scale Y down by impact, spring back
      if (group.current) {
        const squash = 1 - pilot.landImpact * 0.18;
        group.current.scale.set(1 + pilot.landImpact * 0.1, squash, 1 + pilot.landImpact * 0.1);
        pilot.landImpact = Math.max(0, pilot.landImpact - dt * 3.2);
      }
      // variant swap
      if (variantGroup.current) {
        const want = pilot.variant;
        variantGroup.current.children.forEach((child) => {
          child.visible = child.name === want;
        });
      }
    }
  });

  return (
    <group ref={group}>
      {/* legs — dark capri trousers */}
      <mesh ref={legL} position={[-0.2, 0.6, 0]} castShadow>
        <boxGeometry args={[0.32, 1.2, 0.32]} />
        <meshStandardMaterial color={P.charPants} roughness={0.85} />
      </mesh>
      <mesh ref={legR} position={[0.2, 0.6, 0]} castShadow>
        <boxGeometry args={[0.32, 1.2, 0.32]} />
        <meshStandardMaterial color={P.charPants} roughness={0.85} />
      </mesh>
      {/* boots */}
      <mesh position={[-0.2, 0.12, 0.03]} castShadow>
        <boxGeometry args={[0.34, 0.24, 0.4]} />
        <meshStandardMaterial color={P.charBoots} roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 0.12, 0.03]} castShadow>
        <boxGeometry args={[0.34, 0.24, 0.4]} />
        <meshStandardMaterial color={P.charBoots} roughness={0.9} />
      </mesh>
      {/* torso — cream shirt */}
      <mesh ref={body} position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[0.6, 1.0, 0.4]} />
        <meshStandardMaterial color={P.charShirt} roughness={0.8} />
      </mesh>
      {/* head with hair cap */}
      <mesh ref={head} position={[0, CHAR.BODY_H - 0.45, 0]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={P.charSkin} roughness={0.75} />
      </mesh>
      <mesh position={[0, CHAR.BODY_H - 0.18, -0.02]} castShadow>
        <boxGeometry args={[0.64, 0.22, 0.64]} />
        <meshStandardMaterial color={P.charHair} roughness={0.9} />
      </mesh>
      {/* arms */}
      <mesh ref={armL} position={[-0.42, 0.95, 0]} castShadow>
        <boxGeometry args={[0.24, 0.8, 0.24]} />
        <meshStandardMaterial color={P.charShirt} roughness={0.8} />
      </mesh>
      <mesh ref={armR} position={[0.42, 0.95, 0]} castShadow>
        <boxGeometry args={[0.24, 0.8, 0.24]} />
        <meshStandardMaterial color={P.charShirt} roughness={0.8} />
      </mesh>

      {/* cosmetic variants — exactly one visible */}
      <group ref={variantGroup}>
        {/* arrival: red cape with white cloud emblem */}
        <group name="arrival">
          <mesh position={[0, 1.05, -0.26]} castShadow>
            <boxGeometry args={[0.62, 1.15, 0.1]} />
            <meshStandardMaterial color={P.charScarf} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.32, -0.32]}>
            <boxGeometry args={[0.2, 0.2, 0.06]} />
            <meshStandardMaterial color={0xffffff} roughness={0.6} />
          </mesh>
        </group>
        {/* explorer: red hoodie (torso overlay + hood) */}
        <group name="explorer">
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[0.66, 0.9, 0.46]} />
            <meshStandardMaterial color={P.charScarf} roughness={0.85} />
          </mesh>
          <mesh position={[0, CHAR.BODY_H - 0.02, -0.18]} castShadow>
            <boxGeometry args={[0.6, 0.3, 0.4]} />
            <meshStandardMaterial color={P.charScarf} roughness={0.85} />
          </mesh>
        </group>
        {/* traveller: scarf + backpack */}
        <group name="traveller">
          <mesh position={[0, 1.28, 0]} castShadow>
            <boxGeometry args={[0.56, 0.26, 0.5]} />
            <meshStandardMaterial color={P.charScarf} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.1, -0.14]} rotation={[0.5, 0, 0]} castShadow>
            <boxGeometry args={[0.3, 0.7, 0.14]} />
            <meshStandardMaterial color={P.charScarf} roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.0, -0.32]} castShadow>
            <boxGeometry args={[0.44, 0.56, 0.22]} />
            <meshStandardMaterial color={P.charBackpack} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.92, -0.44]}>
            <boxGeometry args={[0.3, 0.12, 0.05]} />
            <meshStandardMaterial color={P.woodDark} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
