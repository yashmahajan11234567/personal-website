/**
 * InteractionSystem — proximity, hover, click and boarding.
 *
 * The two interaction modes required by the brief live here together so they
 * can never disagree:
 *
 *   PROXIMITY  the nearest hotspot within reach becomes `nearId`; the HTML
 *              layer renders its prompt and E acts on it.
 *   CLICK      a raycast against invisible hotspot volumes sets `hoveredId`;
 *              clicking opens that hotspot's panel.
 *
 * BOARDING OUTRANKS PANELS ON A DOCK. Standing at the end of a pier, the whale
 * hotspot and the board action overlap, and the visitor's intent there is
 * always to get on the boat. The whale's panel is still reachable by clicking
 * its hotspot.
 *
 * v2's version called `useInteraction()` inside a click handler — a hook call
 * outside render, which happens to survive because the dispatch is
 * renderer-global. Here the hovered id lives in a ref, which is simply correct.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BERTHS, HOTSPOTS, deckAt, nearestBerth } from './world';
import { islandAt, nearestShoreIsland } from './terrain';
import { pilot } from './state';
import { useInteraction } from './interactionStore';

const DISEMBARK_RANGE = 14;

export function InteractionSystem() {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2(9, 9));
  const hoveredRef = useRef<string | null>(null);
  const nearRef = useRef<string | null>(null);

  const setHovered = useInteraction((s) => s.setHovered);
  const setNear = useInteraction((s) => s.setNear);
  const setBoard = useInteraction((s) => s.setBoard);
  const open = useInteraction((s) => s.open);
  const close = useInteraction((s) => s.close);

  /* ---- pointer -> normalised device coords ---- */
  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      ndc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onLeave = () => ndc.current.set(9, 9);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [gl]);

  /* ---- click opens whatever is hovered ---- */
  useEffect(() => {
    const el = gl.domElement;
    const onClick = () => {
      const id = hoveredRef.current;
      if (!id) return;
      const hs = HOTSPOTS.find((h) => h.id === id);
      if (hs) open(hs.panel);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [gl, open]);

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        close();
        return;
      }
      if (k !== 'e') return;

      if (pilot.mode === 'walk') {
        const dock = deckAt(pilot.pos.x, pilot.pos.z);
        if (dock) {
          const b = nearestBerth(pilot.pos.x, pilot.pos.z);
          pilot.mode = 'boat';
          pilot.boatPos.set(b.x, 0, b.z);
          pilot.boatHeading = b.heading;
          // keep pos at the pier and let VoxelCharacter glide it to the deck
          pilot.boardFrom = { x: pilot.pos.x, z: pilot.pos.z, t: 0 };
          pilot.moving = false;
          useInteraction.getState().setMode('boat');
          useInteraction.getState().setZone('At sea — Docker Whale');
          close();
          return;
        }
      } else {
        const b = nearestBerth(pilot.boatPos.x, pilot.boatPos.z);
        if (Math.hypot(pilot.boatPos.x - b.x, pilot.boatPos.z - b.z) <= DISEMBARK_RANGE) {
          const d = b.dock;
          pilot.mode = 'walk';
          // land on the pier, then glide pos there instead of snapping
          const lx = THREE.MathUtils.clamp(b.x, d.x0 + 1, d.x1 - 1);
          const lz = THREE.MathUtils.clamp(b.z, d.z0 + 1, d.z1 - 1);
          pilot.boardFrom = { x: pilot.boatPos.x, z: pilot.boatPos.z, t: 0 };
          pilot.boatPos.set(lx, 0, lz);
          pilot.pos.set(lx, d.y, lz);
          pilot.moving = false;
          useInteraction.getState().setMode('walk');
          const isl = islandAt(lx, lz) ?? nearestShoreIsland(lx, lz, 24);
          useInteraction.getState().setZone(isl ? isl.label : 'Welcome Harbour');
          close();
          return;
        }
      }

      const id = nearRef.current;
      if (id) {
        const hs = HOTSPOTS.find((h) => h.id === id);
        if (hs) open(hs.panel);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  /* ---- per-frame hover + proximity ---- */
  /* hover raycast only re-runs when the pointer actually moved since the last
   * frame (or the camera did) — raycasting 30 volumes every frame while the
   * mouse sits still is wasted main-thread time */
  const pointerDirty = useRef(true);
  const lastCam = useRef([0, 0, 0]);
  useEffect(() => {
    const el = gl.domElement;
    const mark = () => {
      pointerDirty.current = true;
    };
    el.addEventListener('pointermove', mark);
    return () => el.removeEventListener('pointermove', mark);
  }, [gl]);

  useFrame(() => {
    // hover — re-raycast only when the pointer or the camera moved since the
    // last frame; a resting cursor over a hotspot keeps its tooltip
    if (group.current) {
      const cp = camera.position;
      const moved =
        Math.abs(cp.x - lastCam.current[0]) > 0.01 ||
        Math.abs(cp.y - lastCam.current[1]) > 0.01 ||
        Math.abs(cp.z - lastCam.current[2]) > 0.01;
      lastCam.current = [cp.x, cp.y, cp.z];
      if (moved) pointerDirty.current = true;
    }
    let hovered: string | null = hoveredRef.current;
    if (group.current && ndc.current.x < 2 && pointerDirty.current) {
      raycaster.setFromCamera(ndc.current, camera);
      const hits = raycaster.intersectObjects(group.current.children, false);
      hovered = hits.length > 0 ? (hits[0].object.userData.hotspotId as string) ?? null : null;
      pointerDirty.current = false;
    } else if (ndc.current.x >= 2) {
      hovered = null; // pointer left the canvas
    }
    if (hovered !== hoveredRef.current) {
      hoveredRef.current = hovered;
      setHovered(hovered);
    }

    // proximity
    let nearest: string | null = null;
    let bestD = Infinity;
    for (const h of HOTSPOTS) {
      const d = Math.hypot(h.x - pilot.pos.x, h.z - pilot.pos.z);
      if (d <= h.r && d < bestD) {
        bestD = d;
        nearest = h.id;
      }
    }
    if (nearest !== nearRef.current) {
      nearRef.current = nearest;
      setNear(nearest);
    }

    const onDeck = pilot.mode === 'walk' && deckAt(pilot.pos.x, pilot.pos.z) !== null;
    const b = nearestBerth(pilot.boatPos.x, pilot.boatPos.z);
    const canDisembark =
      pilot.mode === 'boat' &&
      Math.hypot(pilot.boatPos.x - b.x, pilot.boatPos.z - b.z) <= DISEMBARK_RANGE;
    setBoard(onDeck, canDisembark);
  });

  return (
    <group ref={group}>
      {HOTSPOTS.map((h) => (
        <mesh
          key={h.id}
          position={[h.x, h.y + 0.6, h.z]}
          userData={{ hotspotId: h.id }}
          visible={false}
        >
          <sphereGeometry args={[h.r * 0.55, 8, 6]} />
          <meshBasicMaterial />
        </mesh>
      ))}
    </group>
  );
}

/** Berth list re-exported for the QA hooks. */
export const QA_BERTHS = BERTHS;
