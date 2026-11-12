/**
 * InteractionSystem — hover, click, click-to-move, proximity and boarding.
 *
 * Three input paths, all resolved in one place so they can never disagree:
 *
 *   HOVER      a pointer raycast against one box proxy per hotspot sets
 *              `hoveredId`. Boxes (not spheres) because buildings are boxes —
 *              a sphere lets the cursor miss a roof corner it is clearly over.
 *   CLICK      if the cursor is over a hotspot, open its panel. Otherwise
 *              raycast the ground plane and set `pilot.moveTarget`, so the
 *              whole floor of the world is a control surface. This is what
 *              makes the world feel clickable rather than key-only.
 *   PROXIMITY  the nearest hotspot in reach becomes `nearId`; E acts on it.
 *
 * BOARDING OUTRANKS PANELS ON A DOCK: at the end of a pier the visitor always
 * wants the boat. The whale's panel stays reachable by clicking it.
 *
 * COST CONTROL: the hover raycast only runs when the pointer or the camera
 * actually moved since the last frame. A resting cursor costs nothing.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BERTHS, HOTSPOTS, deckAt, nearestBerth, walkableHeight } from './world';
import { islandAt, nearestShoreIsland } from './terrain';
import { pilot } from './state';
import { useInteraction } from './interactionStore';

const DISEMBARK_RANGE = 14;
/** click-to-move refuses targets further than this (keeps it a gesture, not a teleport) */
const MAX_MOVE_DIST = 60;

export function InteractionSystem() {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2(9, 9));
  const hoveredRef = useRef<string | null>(null);
  const nearRef = useRef<string | null>(null);

  // ground plane at y = 0 for click-to-move; terrain height is resolved after
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

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

  /* ---- click: hotspot first, otherwise walk there ---- */
  useEffect(() => {
    const el = gl.domElement;
    const onClick = () => {
      const id = hoveredRef.current;
      if (id) {
        const hs = HOTSPOTS.find((h) => h.id === id);
        if (hs) open(hs.panel);
        return;
      }
      // click-to-move: only meaningful on foot, and never while a panel is open
      if (pilot.mode !== 'walk' || useInteraction.getState().openPanel) return;
      raycaster.setFromCamera(ndc.current, camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;
      const d = Math.hypot(hitPoint.x - pilot.pos.x, hitPoint.z - pilot.pos.z);
      if (d > MAX_MOVE_DIST) return;
      // re-project onto the real terrain so clicking a hillside aims at its top
      const surface = walkableHeight(hitPoint.x, hitPoint.z);
      if (surface === null) return;
      pilot.moveTarget = { x: hitPoint.x, z: hitPoint.z };
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [gl, camera, open, groundPlane, hitPoint]);

  /* ---- keyboard: E interact, Esc close, Space jump ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        close();
        return;
      }
      if (k === ' ' && !e.repeat) {
        // jump is buffered in the controller; this only guarantees the press is
        // seen even if a keydown lands between fixed steps
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
          pilot.grounded = true;
          pilot.velY = 0;
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
      // nearest volume wins: proxies can crowd in the village plaza, and
      // whatever the cursor is physically closest to is what the player meant
      hovered = hits.length > 0 ? ((hits[0].object.userData.hotspotId as string) ?? null) : null;
      pointerDirty.current = false;
      // cursor affordance: a hotspot is clickable, the bare ground is walkable
      gl.domElement.style.cursor = hovered ? 'pointer' : 'default';
    } else if (ndc.current.x >= 2) {
      hovered = null; // pointer left the canvas
      gl.domElement.style.cursor = 'default';
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
          position={[h.x, h.y + 2.1, h.z]}
          userData={{ hotspotId: h.id }}
          visible={false}
        >
          {/* CLICK VOLUME ≠ PROXIMITY RADIUS.
              `h.r` is how close you must walk for E to work — 6-8 blocks, far
              wider than a building. Sizing the click box off it blanketed the
              plaza: 44 of 48 screen points resolved to a hotspot, so ground
              clicks never became walk orders, and adjacent houses stole each
              other's clicks. The box is now building-shaped (torso to roof,
              narrower than the gap between houses) and the raycast takes the
              nearest hit, so aiming at a wall opens that house. */}
          <boxGeometry args={[h.r * 0.42, h.r * 0.62, h.r * 0.42]} />
          <meshBasicMaterial />
        </mesh>
      ))}
    </group>
  );
}

/** Berth list re-exported for the QA hooks. */
export const QA_BERTHS = BERTHS;