import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type World = 'hero' | 'data-world' | 'cloud-world' | 'experience';

export interface GameState {
  currentWorld: World;
  setCurrentWorld: (world: World) => void;
  reset: () => void;
}

const initialState = {
  currentWorld: 'hero' as World,
};

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    setCurrentWorld: (world) => set({ currentWorld: world }),
    reset: () => set(initialState),
  }))
);