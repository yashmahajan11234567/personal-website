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
 * fov between the overview pose and the selected island's pose. Other islands
 * are never touched — they simply fall outside the frustum.
 */
export function CameraRig({ selected }: { selected: DestId | null }) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...OVERVIEW_POSE.target));
  const cam = camera as THREE.PerspectiveCamera;

  useEffect(() => {
    const dur = prefersReducedMotion() ? 0 : TRANSITION_DURATION;
    const pose = selected ? selectedPose(selected) : OVERVIEW_POSE;
    // Portrait screens have a narrow horizontal FOV: pull the camera nearly
    // frontal so the selected island stays inside the frame (still left-biased).
    let pos = pose.pos;
    if (selected && cam.aspect < 0.9) {
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
  }, [selected, camera, cam]);

  useFrame(() => {
    camera.lookAt(target.current);
  });

  return null;
}
