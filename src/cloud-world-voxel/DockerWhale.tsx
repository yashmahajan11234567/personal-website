/**
 * DockerWhale — the vehicle, and its foam wake.
 *
 * Motion model: the controller in VoxelCharacter integrates `pilot.boatPos`;
 * this component is purely presentational and reads it. That split is what lets
 * the whale bob, bank, swish its fluke and shed foam without any of it feeding
 * back into collision.
 *
 * The hull is built at a comfortably large scale and then shrunk by GROUP_SCALE
 * so the mesh keeps its proportions while matching the world's block size.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildWhale, WHALE_DECK_Y } from './whale';
import { pilot, boatPose } from './state';

/** Hull geometry is authored large; this brings it to world scale. */
export const GROUP_SCALE = 0.62;
/** Wake quads in the pool. Recycled, never allocated per frame. */
const WAKE_COUNT = 30;
const WAKE_LIFE = 1.7;

export function DockerWhale() {
  const parts = useMemo(() => buildWhale(), []);
  const material = useMemo(() => new THREE.MeshLambertMaterial({ vertexColors: true }), []);

  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const wakeMesh = useRef<THREE.InstancedMesh>(null);

  const bobPhase = useRef(0);
  const wakeTimer = useRef(0);
  const wakeCursor = useRef(0);
  // scratch objects hoisted out of the frame loop — allocating these per frame
  // was feeding the GC a few hundred bytes 60 times a second
  const _m = useRef(new THREE.Matrix4());
  const _pos = useRef(new THREE.Vector3());
  const _quat = useRef(new THREE.Quaternion());
  const _scl = useRef(new THREE.Vector3());
  const _euler = useRef(new THREE.Euler());
  const wake = useRef(
    Array.from({ length: WAKE_COUNT }, () => ({ x: 0, z: 0, age: WAKE_LIFE, yaw: 0, live: false })),
  );

  const wakeGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.2);
    const g = group.current;
    if (!g) return;

    bobPhase.current += dt * 1.25;
    const bobY = Math.sin(bobPhase.current) * 0.16;
    g.position.set(pilot.boatPos.x, bobY, pilot.boatPos.z);
    // turn toward the ordered heading, and bank into the turn
    let dy = pilot.boatHeading - g.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    g.rotation.y += dy * Math.min(1, dt * 2.4);
    g.rotation.z = THREE.MathUtils.clamp(-dy * 1.4, -0.16, 0.16);
    g.rotation.x = pilot.moving ? -0.035 : 0;

    boatPose.worldY = bobY;
    boatPose.deckY = WHALE_DECK_Y * GROUP_SCALE;

    if (tail.current) {
      tail.current.rotation.y = Math.sin(bobPhase.current * 1.5) * 0.22;
    }

    // ---- wake ----
    const moving = pilot.moving && pilot.mode === 'boat';
    wakeTimer.current += dt;
    if (moving && wakeTimer.current > 0.1) {
      wakeTimer.current = 0;
      const slot = wake.current[wakeCursor.current];
      wakeCursor.current = (wakeCursor.current + 1) % WAKE_COUNT;
      const back = 6.2;
      slot.x = pilot.boatPos.x - Math.sin(pilot.boatHeading) * back;
      slot.z = pilot.boatPos.z - Math.cos(pilot.boatHeading) * back;
      slot.yaw = pilot.boatHeading;
      slot.age = 0;
      slot.live = true;
    }

    const mesh = wakeMesh.current;
    if (mesh) {
      const m = _m.current;
      const pos = _pos.current;
      const quat = _quat.current;
      const scl = _scl.current;
      const euler = _euler.current;
      for (let i = 0; i < WAKE_COUNT; i++) {
        const w = wake.current[i];
        if (!w.live) {
          m.makeScale(0, 0, 0);
          mesh.setMatrixAt(i, m);
          continue;
        }
        w.age += dt;
        if (w.age > WAKE_LIFE) {
          w.live = false;
          m.makeScale(0, 0, 0);
          mesh.setMatrixAt(i, m);
          continue;
        }
        const k = w.age / WAKE_LIFE;
        const size = 2.4 + k * 5.2;
        pos.set(w.x, 0.72, w.z);
        euler.set(0, w.yaw, 0);
        quat.setFromEuler(euler);
        scl.set(size, 1, size * 0.6);
        m.compose(pos, quat, scl);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
      // frustumCulled=false on this mesh, so the bounding sphere is never
      // consulted — recomputing it every frame was pure waste
    }
  });

  return (
    <>
      <group ref={group} scale={[GROUP_SCALE, GROUP_SCALE, GROUP_SCALE]}>
        <mesh geometry={parts.hull} material={material} castShadow receiveShadow />
        <mesh ref={tail} geometry={parts.tail} material={material} castShadow />
      </group>
      <instancedMesh ref={wakeMesh} args={[wakeGeo, undefined, WAKE_COUNT]} frustumCulled={false}>
        <meshBasicMaterial color={0xffffff} transparent opacity={0.62} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
