/**
 * Cloud World 2.0 — interaction store (zustand).
 *
 * Fresh UI state boundary for the greenfield implementation. The interaction
 * system runs inside the WebGL reconciler; panels render outside it; the store
 * is the bridge, and QA scripts get one predictable object to drive.
 * Event-driven by contract: producers publish on change, UI subscribes — the
 * HUD never polls game state.
 */

import { create } from 'zustand';
import type { Hotspot, PilotMode } from '../core/types';
import { PANELS, type PanelDef } from '../core/registry';

export interface InteractionState {
  hoveredId: string | null;
  nearId: string | null;
  openPanel: string | null;
  canBoard: boolean;
  canDisembark: boolean;
  zone: string;
  mode: PilotMode;
  setHovered: (id: string | null) => void;
  setNear: (id: string | null) => void;
  setBoard: (canBoard: boolean, canDisembark: boolean) => void;
  setZone: (zone: string) => void;
  setMode: (mode: PilotMode) => void;
  open: (panelId: string) => void;
  close: () => void;
}

export const useInteraction = create<InteractionState>((set) => ({
  hoveredId: null,
  nearId: null,
  openPanel: null,
  canBoard: false,
  canDisembark: false,
  zone: 'Starting Island',
  mode: 'walk',
  setHovered: (id) => set((s) => (s.hoveredId === id ? s : { hoveredId: id })),
  setNear: (id) => set((s) => (s.nearId === id ? s : { nearId: id })),
  setBoard: (canBoard, canDisembark) =>
    set((s) => (s.canBoard === canBoard && s.canDisembark === canDisembark ? s : { canBoard, canDisembark })),
  setZone: (zone) => set((s) => (s.zone === zone ? s : { zone })),
  setMode: (mode) => set((s) => (s.mode === mode ? s : { mode })),
  open: (panelId) => set({ openPanel: panelId }),
  close: () => set({ openPanel: null }),
}));

/** Hotspot lookup — injected by the interaction system at mount. */
let HOTSPOT_INDEX: Map<string, Hotspot> = new Map();

/** QA/debug: full registered hotspot list. */
export function allHotspots(): Hotspot[] {
  return [...HOTSPOT_INDEX.values()];
}

export function registerHotspots(hotspots: Hotspot[]): void {
  HOTSPOT_INDEX = new Map(hotspots.map((h) => [h.id, h]));
}

export function hotspot(id: string | null): Hotspot | null {
  if (!id) return null;
  return HOTSPOT_INDEX.get(id) ?? null;
}

export function panelFor(id: string | null): PanelDef | null {
  const hs = hotspot(id);
  if (hs) return PANELS[hs.panelId] ?? null;
  if (id && PANELS[id]) return PANELS[id];
  return null;
}

/** Imperative handle for canvas-side systems and QA scripts. */
export const interaction = {
  open: (panelId: string) => useInteraction.getState().open(panelId),
  close: () => useInteraction.getState().close(),
};
