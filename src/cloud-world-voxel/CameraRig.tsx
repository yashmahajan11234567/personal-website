/**
 * CameraRig — two deliberate camera modes (brief 02 "Camera").
 *
 * Land: elevated isometric three-quarter view, no horizon, buildings and signs
 *       read clearly.
 * Sea:  dropped and pulled back so the horizon and the sky sit in frame with
 *       the whale.
 *
 * The two are BLENDED by `view.sea`, never switched, so boarding the whale is a
 * camera move rather than a cut. FOV stays narrow (34) because that is what
 * produces the flattened, miniaturised look the references have — a wide lens
 * reintroduces the perspective distortion that makes voxel worlds read as
 * "3D scene" instead of "diorama".
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot, view } from './state';
import { walkableHeight } from './world';

const LAND_OFFSET = new THREE.Vector3(21, 27, 21);
const SEA_OFFSET = new THREE.Vector3(2, 12.5, 31);
const FOV = 34;

export function CameraRig() {
  const { camera, gl } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef({ active: false, x: 0 });

  // Wheel zoom, clamped: too far in and the block grid turns into noise, too
  // far out and the character is a speck.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.zoom = THREE.MathUtils.clamp(view.zoom * (1 + Math.sign(e.deltaY) * 0.09), 0.5, 2.1);
    };
    const el = gl.domElement;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl]);

  // Drag to orbit. Bound to the canvas so the HTML panels never steal it.
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { active: true, x: e.clientX };
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      drag.current.x = e.clientX;
      view.orbit -= dx * 0.005;
    };
    const up = () => {
      drag.current.active = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== FOV) {
      cam.fov = FOV;
      cam.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);

    const wantSea = pilot.mode === 'boat' ? 1 : 0;
    view.sea += (wantSea - view.sea) * Math.min(1, dt * 1.8);

    offset.copy(LAND_OFFSET).lerp(SEA_OFFSET, view.sea).multiplyScalar(view.zoom);
    const c = Math.cos(view.orbit);
    const s = Math.sin(view.orbit);
    const ox = offset.x * c - offset.z * s;
    const oz = offset.x * s + offset.z * c;

    target.set(pilot.pos.x, pilot.visualY + 1.05, pilot.pos.z);
    desired.set(target.x + ox, target.y + offset.y, target.z + oz);

    // publish ground-plane camera basis so movement is screen-relative, not
    // tied to a hardcoded offset direction
    const fl = Math.hypot(ox, oz) || 1;
    view.camFwd.x = -ox / fl;
    view.camFwd.z = -oz / fl;
    view.camRight.x = -view.camFwd.z;
    view.camRight.z = view.camFwd.x;

    // frame-rate independent smoothing
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
    // safety clamp: never sink below the terrain under the camera
    const ground = walkableHeight(camera.position.x, camera.position.z);
    if (ground !== null && camera.position.y < ground + 2.2) {
      camera.position.y = ground + 2.2;
    }
    camera.lookAt(target);
  });

  return null;
}
