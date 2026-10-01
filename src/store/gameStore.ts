import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CinematicPhase } from '../cinematic/timeline/beats';

export type World = 'hero' | 'data-world' | 'cloud-world' | 'experience';

/** The two worlds offered at the selection hold. */
export type Path = 'data' | 'cloud';

export interface GameState {
  currentWorld: World;
  /** Set once, on explicit user confirmation. Drives the handoff. */
  selectedPath: Path | null;
  /** Discrete interaction state only. Continuous values live in refs/GSAP. */
  hoveredBoard: Path | null;
  focusedBoard: Path | null;
  cinematicPhase: CinematicPhase;
  /** True while the world handoff is playing (Task 8). */
  isHandoff: boolean;

  setCurrentWorld: (world: World) => void;
  selectPath: (path: Path) => void;
  clearSelection: () => void;
  setHoveredBoard: (board: Path | null) => void;
  setFocusedBoard: (board: Path | null) => void;
  setCinematicPhase: (phase: CinematicPhase) => void;
  setHandoff: (active: boolean) => void;
  reset: () => void;
}

const initialState = {
  currentWorld: 'hero' as World,
  selectedPath: null as Path | null,
  hoveredBoard: null as Path | null,
  focusedBoard: null as Path | null,
  cinematicPhase: 'ignition' as CinematicPhase,
  isHandoff: false,
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    setCurrentWorld: (world) => set({ currentWorld: world }),
    selectPath: (path) => set({ selectedPath: path }),
    clearSelection: () =>
      set({ selectedPath: null, isHandoff: false, hoveredBoard: null, focusedBoard: null }),
    setHoveredBoard: (board) => set({ hoveredBoard: board }),
    setFocusedBoard: (board) => set({ focusedBoard: board }),
    setCinematicPhase: (phase) => set({ cinematicPhase: phase }),
    setHandoff: (active) => set({ isHandoff: active }),
    reset: () => set(initialState),
  }))
);