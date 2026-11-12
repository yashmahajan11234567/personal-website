/** CameraRig — third-person Minecraft-style camera.
 *
 * Camera orbits behind and above the character. Drag the canvas to rotate
 * around the player horizontally and tilt vertically. No pointer lock — the
 * canvas stays interactive for clicking hotspots and the ground (click to
 * walk, E to interact).
 *
 * Publishes view.camFwd / view.camRight so movement stays camera-relative.
 * The character body is rendered by VoxelCharacter.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot, view } from './state';

const DIST = 5;        // camera distance from character, in blocks
const HEIGHT = 3.2;    // camera height above character's feet
const LOOK_AHEAD = 1.0;// camera looks slightly ahead of the character
const PITCH_MIN = -1.1;
const PITCH_MAX = 0.9;
const FOV = 70;

export function CameraRig() {
  const { camera, gl } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.fov !== FOV) {
      cam.fov = FOV;
      cam.updateProjectionMatrix();
    }
  }, [camera]);

  // Drag to orbit / tilt (no pointer lock)
  useEffect(() => {
    const el = gl.domElement;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId = 0;

    const onDown = (e: PointerEvent) => {
      isDragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging) return;
      view.orbit -= (e.clientX - lastX) * 0.005;
      view.pitch = THREE.MathUtils.clamp(
        view.pitch - (e.clientY - lastY) * 0.005,
        PITCH_MIN,
        PITCH_MAX,
      );
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      isDragging = false;
      el.releasePointerCapture(pointerId);
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl]);

  useFrame((_, _rawDt) => {

    // Character heading follows movement direction (set in VoxelCharacter),
    // not camera yaw — camera can look around independently in 360°.
    target.set(
      pilot.pos.x - Math.sin(view.orbit) * LOOK_AHEAD,
      pilot.visualY + 1.2,
      pilot.pos.z - Math.cos(view.orbit) * LOOK_AHEAD,
    );

    // Camera offset: behind and above the character
    offset.set(
      -Math.sin(view.orbit) * Math.cos(view.pitch) * DIST,
      HEIGHT + Math.sin(view.pitch) * DIST * 0.4,
      -Math.cos(view.orbit) * Math.cos(view.pitch) * DIST,
    );

    camera.position.copy(target).add(offset);
    camera.lookAt(target);

    // Publish ground-plane camera basis for camera-relative movement
    dir.set(
      -Math.sin(view.orbit) * Math.cos(view.pitch),
      0,
      -Math.cos(view.orbit) * Math.cos(view.pitch),
    ).normalize();
    view.camFwd.x = dir.x;
    view.camFwd.z = dir.z;
    view.camRight.x = -dir.z;
    view.camRight.z = dir.x;
  });

  return null;
}
