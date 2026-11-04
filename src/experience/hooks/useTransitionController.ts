import * as THREE from 'three';
import { useRef } from 'react';
import gsap from 'gsap';
import type { DestId } from '../experience.data';

export function useTransitionController() {
  const islandRefs = useRef<Record<DestId, THREE.Group | null>>({
    lighthouse: null,
    windmill: null,
    pagoda: null,
  });

  const isAnimating = useRef(false);

  const animateToOverview = (onComplete?: () => void) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
        onComplete?.();
      },
    });

    const destOrder = ['lighthouse', 'windmill', 'pagoda'] as const;

    destOrder.forEach((id) => {
      const group = islandRefs.current[id];
      if (!group) return;

      const targetPos = {
        lighthouse: [0, 0, -35],
        windmill: [-35, 0, 5],
        pagoda: [35, 0, 5],
      }[id];

      gsap.killTweensOf(group.position);
      gsap.killTweensOf(group.scale);
      gsap.killTweensOf(group.rotation);

      tl.to(group.position, {
        x: targetPos[0],
        y: targetPos[1],
        z: targetPos[2],
        duration: 1.2,
        ease: 'power2.inOut',
      }, 0);

      tl.to(group.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.2,
        ease: 'power2.inOut',
      }, 0);

      tl.to(group.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.2,
        ease: 'power2.inOut',
      }, 0);

      tl.to(group, {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
      }, 0.2);
    });

    return tl;
  };

  const animateToDestination = (selectedId: 'lighthouse' | 'windmill' | 'pagoda', onComplete?: () => void) => {
    const tl = gsap.timeline({
      onComplete: () => {
        onComplete?.();
      },
    });

    const destOrder = ['lighthouse', 'windmill', 'pagoda'] as const;

    destOrder.forEach((id) => {
      const group = islandRefs.current[id];
      if (!group) return;

      if (id === selectedId) {
        gsap.killTweensOf(group.position);
        gsap.killTweensOf(group.scale);
        gsap.killTweensOf(group.rotation);

        tl.to(group.position, {
          x: -28,
          y: 0,
          z: 0,
          duration: 1.5,
          ease: 'power2.inOut',
        }, 0);

        tl.to(group.scale, {
          x: 1.2,
          y: 1.2,
          z: 1.2,
          duration: 1.5,
          ease: 'power2.out',
        }, 0);

        tl.to(group.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.5,
          ease: 'power2.inOut',
        }, 0);

        tl.to(group, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }, 0.3);
      } else {
        const hiddenX = group.position.x > 0 ? 80 : -80;

        tl.to(group.position, {
          x: hiddenX,
          y: 0,
          z: 0,
          duration: 1.2,
          ease: 'power2.inOut',
        }, 0);

        tl.to(group.scale, {
          x: 0.3,
          y: 0.3,
          z: 0.3,
          duration: 1.2,
          ease: 'power2.inOut',
        }, 0);

        tl.to(group, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.in',
        }, 0.2);
      }
    });

    return tl;
  };

  const animateSwitchDestination = (fromId: 'lighthouse' | 'windmill' | 'pagoda', toId: 'lighthouse' | 'windmill' | 'pagoda', onComplete?: () => void) => {
    const tl = gsap.timeline({
      onComplete: () => {
        onComplete?.();
      },
    });

    const destOrder = ['lighthouse', 'windmill', 'pagoda'] as const;

    destOrder.forEach((id) => {
      const group = islandRefs.current[id];
      if (!group) return;

      if (id === fromId) {
        gsap.killTweensOf(group.position);
        gsap.killTweensOf(group.scale);
        gsap.killTweensOf(group.rotation);

        tl.to(group.position, {
          x: -80,
          y: 0,
          z: 0,
          duration: 1.2,
          ease: 'power2.inOut',
        }, 0);

        tl.to(group.scale, {
          x: 0.3,
          y: 0.3,
          z: 0.3,
          duration: 1.2,
          ease: 'power2.inOut',
        }, 0);

        tl.to(group, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.in',
        }, 0.2);
      } else if (id === toId) {
        group.position.set(80, 0, 0);
        group.scale.setScalar(0.3);
        group.rotation.set(0, 0, 0);
        group.visible = true;

        gsap.killTweensOf(group.position);
        gsap.killTweensOf(group.scale);
        gsap.killTweensOf(group.rotation);

        tl.to(group.position, {
          x: -28,
          y: 0,
          z: 0,
          duration: 1.5,
          ease: 'power2.out',
        }, 0.2);

        tl.to(group.scale, {
          x: 1.2,
          y: 1.2,
          z: 1.2,
          duration: 1.5,
          ease: 'power2.out',
        }, 0.2);

        tl.to(group.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.5,
          ease: 'power2.inOut',
        }, 0.2);

        tl.to(group, {
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
        }, 0.5);
      }
    });

    return tl;
  };

  const killTransitions = () => {
    const destOrder = ['lighthouse', 'windmill', 'pagoda'] as const;
    destOrder.forEach((id) => {
      const group = islandRefs.current[id];
      if (group) {
        gsap.killTweensOf(group.position);
        gsap.killTweensOf(group.scale);
        gsap.killTweensOf(group.rotation);
      }
    });
  };

  return {
    registerIsland: (id: 'lighthouse' | 'windmill' | 'pagoda', group: THREE.Group | null) => {
      islandRefs.current[id] = group;
    },
    animateToOverview,
    animateToDestination,
    animateSwitchDestination,
    killTransitions,
    isAnimating: () => false,
  };
}