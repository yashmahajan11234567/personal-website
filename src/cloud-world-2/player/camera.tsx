/**
 * Cloud World 2.0 — third-person follow camera.
 *
 * Fresh rig per doc 04 §6: over-shoulder framing (character lower-left third),
 * exponential smoothing (rate 8, frame-rate independent), deadzone so
 * micro-movement never nudges the camera, look-ahead in the travel direction,
 * per-zone bounds clamp, spring-arm collision pull-in, and an additive
 * trauma-shake hook (game-feel). Drag still orbits/pitches manually — follow
 * resumes on release.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { pilot, view } from './state';

const DIST = 5.2;
const HEIGHT = 3.0;
const LOOK_AHEAD = 1.1;
const DEADZONE = { x: 0.55, z: 0.35 };
const SMOOTH_RATE = 8;
const PITCH_MIN = -1.15;
const PITCH_MAX = 0.85;
const FOV = 66;

/** Trauma-based shake: game-feel writes here, camera composes it additively. */
export const shake = { trauma: 0 };

export function addTrauma(amount: number): void {
  shake.trauma = Math.min(1, shake.trauma + amount);
}

/** Soft world bounds per zone — the camera never shows the void. */
const BOUNDS = { minX: -70, maxX: 84, minZ: -70, maxZ: 84 };

export function CameraRig(): null {
  const { camera, gl, scene } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const shakeT = useRef(0);
  const solidsCache = useRef<THREE.Object3D[] | null>(null);
  const refreshIn = useRef(60);

  useEffect(() => {
      const cam = camera as THREE.PerspectiveCamera;
      if (cam.fov !== FOV) {
        cam.fov = FOV;
        cam.updateProjectionMatrix();
        cam.near = 0.55;
        cam.updateProjectionMatrix();
      }
    }, [camera]);

  /* drag to orbit / tilt (no pointer lock — hotspots stay clickable) */
  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      view.orbit -= (e.clientX - lastX) * 0.005;
      view.pitch = THREE.MathUtils.clamp(view.pitch - (e.clientY - lastY) * 0.005, PITCH_MIN, PITCH_MAX);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);

    /* 1. ideal target: character + look-ahead in the travel direction */
    const heading = pilot.mode === 'boat' ? pilot.boatHeading : pilot.heading;
    const aheadX = pilot.moving ? Math.sin(heading) * LOOK_AHEAD : 0;
    const aheadZ = pilot.moving ? Math.cos(heading) * LOOK_AHEAD : 0;
    const idealX = pilot.pos.x + aheadX;
    const idealZ = pilot.pos.z + aheadZ;
    const idealY = pilot.visualY + 1.2;

    /* 2. deadzone: chase only the overflow beyond the inner box */
    const dx = idealX - target.x;
    const dz = idealZ - target.z;
    if (Math.abs(dx) > DEADZONE.x) target.x += Math.sign(dx) * (Math.abs(dx) - DEADZONE.x);
    if (Math.abs(dz) > DEADZONE.z) target.z += Math.sign(dz) * (Math.abs(dz) - DEADZONE.z);
    const k = 1 - Math.exp(-SMOOTH_RATE * dt);
    target.y += (idealY - target.y) * k;
    // clamp inside world bounds so the view never leaves the playable area
    target.x = THREE.MathUtils.clamp(target.x, BOUNDS.minX, BOUNDS.maxX);
    target.z = THREE.MathUtils.clamp(target.z, BOUNDS.minZ, BOUNDS.maxZ);

    /* 3. offset: behind + above, zoom applies multiplicatively */
    const dist = DIST * view.zoom;
    offset.set(
      -Math.sin(view.orbit) * Math.cos(view.pitch) * dist,
      HEIGHT + Math.sin(view.pitch) * dist * 0.42,
      -Math.cos(view.orbit) * Math.cos(view.pitch) * dist,
    );

    /* 4. spring arm: pull in when STRUCTURE geometry blocks the shot.
     * Terrain is excluded — the rig rides over hills, and raycasting the
     * 12k-instance terrain mesh every frame was both wrong (collapsed the
     * camera at spawn) and far too expensive. */
    const len = offset.length();
    dir.copy(offset).normalize();
    ray.set(target, dir);
    ray.far = len;
    let usable = len;
    try {
      if (solidsCache.current === null) {
        const solids: THREE.Object3D[] = [];
        scene.traverse((o) => {
          const flags = o.userData as { cw2Solid?: boolean; cw2Terrain?: boolean };
          if (flags.cw2Solid && !flags.cw2Terrain) solids.push(o);
        });
        solidsCache.current = solids.length > 0 ? solids : null;
        refreshIn.current = solids.length === 0 ? 60 : 3600;
      }
      if (solidsCache.current) {
        const hits = ray.intersectObjects(solidsCache.current, false);
        for (const hit of hits) {
          if (hit.distance < usable && hit.distance > 1.4) usable = hit.distance;
        }
      } else if (--refreshIn.current <= 0) {
        solidsCache.current = null;
      }
    } catch {
      usable = len;
    }
    if (usable < len) offset.multiplyScalar(Math.max(0.55, usable / len));

    /* 5. trauma shake — additive, decaying, never fights the follow */
    let sx = 0;
    let sy = 0;
    if (shake.trauma > 0.001) {
      shakeT.current += dt * 30;
      const s = shake.trauma * shake.trauma;
      sx = Math.sin(shakeT.current * 1.7) * 0.18 * s;
      sy = Math.cos(shakeT.current * 2.3) * 0.14 * s;
      shake.trauma = Math.max(0, shake.trauma - dt * 1.4);
    }

    camera.position.set(target.x + offset.x + sx, target.y + offset.y + sy, target.z + offset.z);
    camera.lookAt(target.x + sx * 0.5, target.y + sy * 0.5, target.z);
    (window as unknown as Record<string, unknown>).__cw2Camera = camera;

    /* 6. publish ground-plane basis for camera-relative movement */
    dir.set(-Math.sin(view.orbit) * Math.cos(view.pitch), 0, -Math.cos(view.orbit) * Math.cos(view.pitch)).normalize();
    view.camFwd.x = dir.x;
    view.camFwd.z = dir.z;
    view.camRight.x = -dir.z;
    view.camRight.z = dir.x;
  });

  return null;
}
