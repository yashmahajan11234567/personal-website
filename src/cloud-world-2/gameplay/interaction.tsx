/**
 * Cloud World 2.0 — interaction system: hover, click, click-to-move, proximity.
 *
 * Three input paths, resolved in one place so they can never disagree:
 *   HOVER      pointer raycast against one box proxy per hotspot → hoveredId
 *   CLICK      over a hotspot → open its panel; else ground plane → move order
 *   PROXIMITY  nearest hotspot in reach with a clear walk line → nearId; E acts
 *
 * Boarding outranks panels on a dock: at a pier end the visitor wants the boat.
 * The hover raycast only runs when the pointer or camera moved — a resting
 * cursor costs nothing.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BERTHS, DECKS, nearestBerthOf } from '../core/registry';
import { pilot } from '../player/state';
import { useInteraction, registerHotspots } from './store';
import { lineWalkable, findPath, ensureGrid } from '../player/navigation';
import { terrainY } from '../core/world';
import { staticWorld } from '../core/world';
import type { Hotspot } from '../core/types';

const DISEMBARK_RANGE = 14;
const MAX_MOVE_DIST = 60;

export function InteractionSystem(): React.ReactElement {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2(9, 9));
  const hovered = useRef<string | null>(null);
  const near = useRef<string | null>(null);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const pointerDirty = useRef(true);
  const lastCam = useRef([0, 0, 0]);

  const assembled = staticWorld();
  const proxySpecs = useMemo(
    () =>
      assembled.hotspots.map((h: Hotspot) => ({
        hotspotId: h.id,
        x: h.x,
        // box proxy: torso to rooftop, building-shaped — never the full r
        y: h.y + 1.6,
        z: h.z,
        hx: h.r * 0.42,
        hy: h.r * 0.55,
        hz: h.r * 0.42,
      })),
    [assembled.hotspots],
  );

  /* grid + hotspots boot */
  useEffect(() => {
    ensureGrid(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ISLANDS_REF,
      DECKS,
      terrainY,
    );
    registerHotspots(assembled.hotspots);
  }, [assembled.hotspots]);

  /* pointer → NDC */
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

  /* click: hotspot first, otherwise walk there */
  useEffect(() => {
    const el = gl.domElement;
    const onClick = () => {
      const id = hovered.current;
      if (id) {
        const hs = assembled.hotspots.find((h) => h.id === id);
        if (hs) useInteraction.getState().open(hs.panelId);
        return;
      }
      if (pilot.mode !== 'walk' || useInteraction.getState().openPanel) return;
      raycaster.setFromCamera(ndc.current, camera);
      if (!raycaster.ray.intersectPlane(groundPlane, hitPoint)) return;
      const d = Math.hypot(hitPoint.x - pilot.pos.x, hitPoint.z - pilot.pos.z);
      if (d > MAX_MOVE_DIST) return;
      if (terrainY(hitPoint.x, hitPoint.z) === null) return;
      if (d <= 1.5) {
        pilot.moveTarget = { x: hitPoint.x, z: hitPoint.z };
        pilot.path = null;
        pilot.pathIndex = 0;
        return;
      }
      const route = findPath({ x: pilot.pos.x, z: pilot.pos.z }, { x: hitPoint.x, z: hitPoint.z }, terrainY);
      if (!route.ok) return;
      pilot.path = route.points;
      pilot.pathIndex = 0;
      const last = route.points[route.points.length - 1];
      pilot.moveTarget = { x: last.x, z: last.z };
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [gl, camera, groundPlane, hitPoint, assembled.hotspots]);

  /* keyboard: E interact / Esc close (panel Esc handled in the UI layer) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      if (e.key.toLowerCase() !== 'e') return;
      if (pilot.mode === 'walk') {
        const onDeck = DECKS.some((d) => pilot.pos.x >= d.x0 && pilot.pos.x <= d.x1 && pilot.pos.z >= d.z0 && pilot.pos.z <= d.z1);
        if (onDeck) {
          const b = nearestBerthOf(pilot.pos.x, pilot.pos.z);
          pilot.mode = 'boat';
          pilot.boatPos.set(b.x, 0, b.z);
          pilot.boatHeading = b.heading;
          pilot.boardFrom = { x: pilot.pos.x, z: pilot.pos.z, t: 0 };
          pilot.moving = false;
          useInteraction.getState().setMode('boat');
          useInteraction.getState().setZone('At sea — Docker Whale');
          useInteraction.getState().close();
          return;
        }
      } else {
        const b = nearestBerthOf(pilot.boatPos.x, pilot.boatPos.z);
        if (Math.hypot(pilot.boatPos.x - b.x, pilot.boatPos.z - b.z) <= DISEMBARK_RANGE) {
          const d = DECKS.find((deck) => deck.label === b.dockLabel) ?? DECKS[0];
          pilot.mode = 'walk';
          const lx = THREE.MathUtils.clamp(b.x, d.x0 + 1, d.x1 - 1);
          const lz = THREE.MathUtils.clamp(b.z, d.z0 + 1, d.z1 - 1);
          pilot.boardFrom = { x: pilot.boatPos.x, z: pilot.boatPos.z, t: 0 };
          pilot.boatPos.set(lx, 0, lz);
          pilot.pos.set(lx, d.y, lz);
          pilot.moving = false;
          pilot.grounded = true;
          pilot.velY = 0;
          useInteraction.getState().setMode('walk');
          useInteraction.getState().close();
          return;
        }
      }
      const id = useInteraction.getState().nearId;
      if (id) {
        const hs = assembled.hotspots.find((h) => h.id === id);
        if (hs) useInteraction.getState().open(hs.panelId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assembled.hotspots]);

  /* mark hover dirty on pointer move */
  useEffect(() => {
    const el = gl.domElement;
    const mark = () => {
      pointerDirty.current = true;
    };
    el.addEventListener('pointermove', mark);
    return () => el.removeEventListener('pointermove', mark);
  }, [gl]);

  useFrame(() => {
    /* QA: frame liveness probe */
    (window as unknown as Record<string, unknown>).__cw2Frames =
      ((window as unknown as Record<string, unknown>).__cw2Frames as number | undefined ?? 0) + 1;
    /* hover — re-raycast only when pointer or camera moved */
    if (group.current) {
      const cp = camera.position;
      const moved =
        Math.abs(cp.x - lastCam.current[0]) > 0.01 ||
        Math.abs(cp.y - lastCam.current[1]) > 0.01 ||
        Math.abs(cp.z - lastCam.current[2]) > 0.01;
      lastCam.current = [cp.x, cp.y, cp.z];
      if (moved) pointerDirty.current = true;
    }
    let h: string | null = hovered.current;
    if (group.current && ndc.current.x < 2 && pointerDirty.current) {
      raycaster.setFromCamera(ndc.current, camera);
      const hits = raycaster.intersectObjects(group.current.children, false);
      h = hits.length > 0 ? ((hits[0].object.userData.hotspotId as string) ?? null) : null;
      pointerDirty.current = false;
      gl.domElement.style.cursor = h ? 'pointer' : 'default';
    } else if (ndc.current.x >= 2) {
      h = null;
      gl.domElement.style.cursor = 'default';
    }
    if (h !== hovered.current) {
      hovered.current = h;
      useInteraction.getState().setHovered(h);
    }

    /* proximity — nearest in reach with a clear walk line (E key) */
    let nearest: string | null = null;
    let bestD = Infinity;
    const px = pilot.pos.x;
    const pz = pilot.pos.z;
    for (const s of assembled.hotspots) {
      const d = Math.hypot(s.x - px, s.z - pz);
      if (d > s.r || d >= bestD) continue;
      const overWater = terrainY(px, pz) === null || terrainY(s.x, s.z) === null;
      if (!overWater && pilot.mode === 'walk' && !lineWalkable({ x: px, z: pz }, { x: s.x, z: s.z }, terrainY)) continue;
      bestD = d;
      nearest = s.id;
    }
    if (nearest !== near.current) {
      near.current = nearest;
      useInteraction.getState().setNear(nearest);
    }

    /* boarding affordances */
    const onDeck = pilot.mode === 'walk' && DECKS.some((d) => pilot.pos.x >= d.x0 && pilot.pos.x <= d.x1 && pilot.pos.z >= d.z0 && pilot.pos.z <= d.z1);
    const b = nearestBerthOf(pilot.boatPos.x, pilot.boatPos.z);
    const canDisembark = pilot.mode === 'boat' && Math.hypot(pilot.boatPos.x - b.x, pilot.boatPos.z - b.z) <= DISEMBARK_RANGE;
    const st = useInteraction.getState();
    if (st.canBoard !== onDeck || st.canDisembark !== canDisembark) st.setBoard(onDeck, canDisembark);
  });

  return (
    <group ref={group}>
      {proxySpecs.map((p) => (
        <mesh key={p.hotspotId} position={[p.x, p.y, p.z]} userData={{ hotspotId: p.hotspotId }} visible={false}>
          <boxGeometry args={[p.hx * 2, p.hy * 2, p.hz * 2]} />
          <meshBasicMaterial />
        </mesh>
      ))}
    </group>
  );
}

/* island specs are static — kept out of the effect deps */
import { ISLANDS as ISLANDS_REF } from '../core/registry';
void BERTHS;
