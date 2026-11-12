/**
 * InteractionSystem — raycast hotspots inside Canvas, updates shared context.
 * All HTML UI rendered outside Canvas via InteractionProvider.
 */
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS } from '../world';
import { useInteraction } from './InteractionContext';

interface HotspotMesh extends THREE.Mesh {
  userData: { hotspotId: string };
}

export function InteractionSystem() {
  const { camera, scene, gl } = useThree();
  const { setHoveredId, setOpenCardId, openCardId } = useInteraction();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(-2, -2)); // off-screen initially

  // Mouse move
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [gl]);

  // Click
  useEffect(() => {
    const onClick = () => {
      const { hoveredId } = useInteraction();
      if (hoveredId && !openCardId) {
        setOpenCardId(hoveredId);
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [setOpenCardId, openCardId]);

  // Raycast
  useFrame(() => {
    raycaster.current.setFromCamera(mouse.current, camera);
    const hotspotMeshes = scene.children.filter(
      (o): o is HotspotMesh => o.userData?.hotspotId !== undefined
    );
    const intersects = raycaster.current.intersectObjects(hotspotMeshes, true);

    if (intersects.length > 0) {
      const id = intersects[0].object.userData.hotspotId;
      setHoveredId(id);
    } else {
      setHoveredId(null);
    }
  });

  // Invisible hotspot meshes for raycasting
  return (
    <>
      {HOTSPOTS.map((hs) => (
        <mesh
          key={hs.id}
          geometry={new THREE.SphereGeometry(hs.r, 8, 6)}
          material={new THREE.MeshBasicMaterial({ visible: false })}
          position={[hs.x, 1, hs.z]}
          userData={{ hotspotId: hs.id }}
        />
      ))}
    </>
  );
}