/**
 * Interaction state.
 *
 * A tiny zustand store rather than a React context: the interaction system runs
 * inside the WebGL reconciler and the panels render outside it, and a store
 * sidesteps every question about whether context crosses that boundary. It also
 * gives the QA scripts one predictable object to drive.
 */
import { create } from 'zustand';
import { HOTSPOTS, type Hotspot } from './world';
import { PANELS, type PanelDef } from './panels';

export interface InteractionState {
  /** hotspot under the mouse */
  hoveredId: string | null;
  /** hotspot within reach of the character */
  nearId: string | null;
  /** panel currently open, by panel id */
  openPanel: string | null;
  /** a berth is in reach, so E will board or step ashore */
  canBoard: boolean;
  canDisembark: boolean;
  /** current zone label, published by the character on zone change (event, not poll) */
  zone: string;
  /** walk | boat, mirrored from pilot on transitions */
  mode: 'walk' | 'boat';
  setHovered: (id: string | null) => void;
  setNear: (id: string | null) => void;
  setBoard: (canBoard: boolean, canDisembark: boolean) => void;
  setZone: (zone: string) => void;
  setMode: (mode: 'walk' | 'boat') => void;
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
    set((s) =>
      s.canBoard === canBoard && s.canDisembark === canDisembark ? s : { canBoard, canDisembark },
    ),
  setZone: (zone) => set((s) => (s.zone === zone ? s : { zone })),
  setMode: (mode) => set((s) => (s.mode === mode ? s : { mode })),
  open: (panelId) => set({ openPanel: panelId }),
  close: () => set({ openPanel: null }),
}));

/** Imperative handle for the Canvas-side system and for QA scripts. */
export const interaction = {
  open: (panelId: string) => useInteraction.getState().open(panelId),
  close: () => useInteraction.getState().close(),
  hotspots: () => HOTSPOTS,
};

export function hotspot(id: string | null): Hotspot | null {
  if (!id) return null;
  return HOTSPOTS.find((h) => h.id === id) ?? null;
}

export function panelFor(id: string | null): PanelDef | null {
  const hs = hotspot(id);
  if (hs) return PANELS[hs.panel] ?? null;
  if (id && PANELS[id]) return PANELS[id];
  return null;
}
