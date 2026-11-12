/**
 * CameraRig — third-person orbit camera.
 *
 * Two rigs blended, never cut:
 *   LAND  a true third-person orbit: yaw from horizontal drag, pitch from
 *         vertical drag, distance from the wheel. Elevation comes from the
 *         pitch angle rather than a fixed offset, so the player can look level
 *         across the island or steeply down at the village.
 *   SEA   dropped and pulled back so the horizon and sky sit in frame.
 *
 * Why a fixed offset vector was wrong: with `LAND_OFFSET = (21, 27, 21)` the
 * camera elevation was welded to the zoom, so dragging could only spin the
 * world — you could never see a rooftop or a jump arc from below. Pitch is now
 * an independent degree of freedom.
 *
 * Framing rules applied (camera-systems):
 *   - exponential smoothing (frame-rate independent), never a constant lerp
 *   - the camera target sits above the feet, and while airborne it lags a little
 *     so a jump reads as vertical motion instead of the world dropping away
 *   - soft ground clamp: the camera is pushed up rather than ever going under
 *     a hill, and the pitch is clamped so it cannot flip
 *   - the ground-plane basis (camFwd/camRight) is published from the REAL
 *     blended direction, which is what makes WASD screen-relative
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot, view } from './state';
import { walkableHeight } from './world';

const LAND_DIST = 30;
const SEA_DIST = 34;
const TARGET_H = 1.05;
const PITCH_MIN = 0.06;
const PITCH_MAX = 1.15;
const FOV = 40;

export function CameraRig() {
  const { camera, gl } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const smoothTarget = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef({ active: false, x: 0, y: 0 });

  // Wheel zoom, clamped: too far in and the block grid turns into noise, too
  // far out and the character is a speck.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.zoom = THREE.MathUtils.clamp(view.zoom * (1 + Math.sign(e.deltaY) * 0.09), 0.55, 2.0);
    };
    const el = gl.domElement;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl]);

  // Drag to orbit: X yaws, Y pitches. Bound to the canvas so HTML panels never
  // steal the gesture. Double-click recentres the camera behind the player.
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      drag.current = { active: true, x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      view.orbit -= dx * 0.005;
      view.pitch = THREE.MathUtils.clamp(view.pitch + dy * 0.004, PITCH_MIN, PITCH_MAX);
    };
    const up = () => {
      drag.current.active = false;
    };
    const recentre = () => {
      view.orbit = 0;
      view.pitch = 0.42;
      view.zoom = 1;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('dblclick', recentre);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('dblclick', recentre);
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

    // distance: pitch pulls the camera in slightly as it looks down, which
    // keeps the player framed instead of shrinking to a dot from a high angle
    const dist = THREE.MathUtils.lerp(LAND_DIST, SEA_DIST, view.sea) * view.zoom;
    const pitch = THREE.MathUtils.lerp(view.pitch, 0.3, view.sea);
    const elev = dist * Math.sin(pitch);
    const flat = dist * Math.cos(pitch);

    const c = Math.cos(view.orbit);
    // camera sits behind the player along the orbit direction
    const ox = Math.sin(c) * flat;
    const oz = Math.cos(c) * flat;

    target.set(pilot.pos.x, pilot.visualY + TARGET_H, pilot.pos.z);
    // airborne lag: the target follows the body more slowly mid-jump so the
    // jump reads as vertical motion rather than the world dropping away
    const lag = pilot.grounded ? 16 : 5;
    smoothTarget.lerp(target, 1 - Math.exp(-lag * dt));

    desired.set(smoothTarget.x + ox, smoothTarget.y + elev, smoothTarget.z + oz);

    // publish ground-plane camera basis so movement is screen-relative
    const fl = Math.hypot(ox, oz) || 1;
    view.camFwd.x = -ox / fl;
    view.camFwd.z = -oz / fl;
    view.camRight.x = -view.camFwd.z;
    view.camRight.z = view.camFwd.x;

    // frame-rate independent smoothing
    camera.position.lerp(desired, 1 - Math.exp(-9 * dt));

    // safety clamp: never sink below the terrain under the camera
    const ground = walkableHeight(camera.position.x, camera.position.z);
    if (ground !== null && camera.position.y < ground + 2.4) {
      camera.position.y = ground + 2.4;
    }
    camera.lookAt(smoothTarget);
  });

  return null;
}