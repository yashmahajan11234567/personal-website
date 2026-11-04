import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { DestId } from '../experience.data';
import { OVERVIEW_POSE, selectedPose, TRANSITION_DURATION } from './poses';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * GSAP-driven camera rig. Tweens camera.position + a lookAt target vector +
 * fov between the overview pose and the selected island's bounding-box-derived
 * pose. Unselected islands are hidden by IslandGroup itself, so they can never
 * appear in the frustum, between camera and island, or during transitions.
 */
export function CameraRig({ selected }: { selected: DestId | null }) {
  const { camera } = useThree();
  const size = useThree((s) => s.size);
  const target = useRef(new THREE.Vector3(...OVERVIEW_POSE.target));
  const cam = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    const dur = prefersReducedMotion() ? 0 : TRANSITION_DURATION;
    const aspect = size.width / Math.max(size.height, 1);
    const pose = selected ? selectedPose(selected, aspect) : OVERVIEW_POSE;
    // Portrait screens have a narrow horizontal FOV: pull the camera nearly
    // frontal so the selected island stays inside the frame (still left-biased).
    let pos = pose.pos;
    if (selected && aspect < 0.9) {
      pos = [
        pose.target[0] + (pose.pos[0] - pose.target[0]) * 0.08,
        pose.pos[1] * 0.85,
        pose.target[2] + (pose.pos[2] - pose.target[2]) * 1.3,
      ];
    }
    gsap.killTweensOf(camera.position);
    gsap.to(camera.position, {
      x: pos[0],
      y: pos[1],
      z: pos[2],
      duration: dur,
      ease: 'power2.inOut',
      onComplete: () => {
        (window as unknown as { __camSettled?: string }).__camSettled = selected ?? 'overview';
      },
    });
    gsap.killTweensOf(target.current);
    gsap.to(target.current, {
      x: pose.target[0],
      y: pose.target[1],
      z: pose.target[2],
      duration: dur,
      ease: 'power2.inOut',
    });
    gsap.killTweensOf(cam);
    gsap.to(cam, {
      fov: pose.fov,
      duration: dur,
      ease: 'power2.inOut',
      onUpdate: () => cam.updateProjectionMatrix(),
    });
  }, [selected, camera, cam, size]);

  useFrame(() => {
    camera.lookAt(target.current);
    // Left-side placement for the selected island via projection offset:
    // shifts the render window right, so the island lands left-of-centre
    // without changing the fitted camera distance (panel owns the right).
    const aspect = size.width / Math.max(size.height, 1);
    if (selected) {
      const frac = aspect < 0.9 ? 0.04 : 0.11;
      cam.setViewOffset(size.width, size.height, size.width * frac, 0, size.width, size.height);
    } else {
      cam.clearViewOffset();
    }
  });

  return null;
}
