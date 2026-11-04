import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type ExperienceMode = 'overview' | 'entering' | 'destination' | 'switching' | 'exiting';

export interface ExperienceState {
  mode: ExperienceMode;
  selectedIsland: 'lighthouse' | 'windmill' | 'pagoda' | null;
  previousIsland: 'lighthouse' | 'windmill' | 'pagoda' | null;
  isTransitioning: boolean;
  rotationEnabled: boolean;
  setMode: (mode: ExperienceState['mode']) => void;
  selectIsland: (island: 'lighthouse' | 'windmill' | 'pagoda') => void;
  navigate: (direction: 'next' | 'prev') => void;
  goBack: () => void;
  setRotationEnabled: (enabled: boolean) => void;
  setTransitioning: (isTransitioning: boolean) => void;
}

const initialState = {
  mode: 'overview' as ExperienceMode,
  selectedIsland: null as 'lighthouse' | 'windmill' | 'pagoda' | null,
  previousIsland: null as 'lighthouse' | 'windmill' | 'pagoda' | null,
  isTransitioning: false,
  rotationEnabled: false,
};

export const useExperienceStore = create<ExperienceState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    setMode: (mode) => set({ mode }),
    selectIsland: (island) => set({
      mode: 'entering',
      selectedIsland: island,
      previousIsland: null,
      isTransitioning: true,
    }),
    navigate: (direction) => {
      const { selectedIsland } = get();
      if (!selectedIsland) return;
      const currentIndex = ['lighthouse', 'windmill', 'pagoda'].indexOf(selectedIsland);
      const nextIndex = direction === 'next'
        ? (currentIndex + 1) % 3
        : (currentIndex + 2) % 3;
      const nextIsland = ['lighthouse', 'windmill', 'pagoda'][nextIndex] as 'lighthouse' | 'windmill' | 'pagoda';
      set({
        mode: 'switching',
        previousIsland: selectedIsland,
        selectedIsland: nextIsland,
        isTransitioning: true,
      });
    },
    goBack: () => set({
      mode: 'exiting',
      previousIsland: get().selectedIsland,
      isTransitioning: true,
    }),
    setRotationEnabled: (enabled) => set({ rotationEnabled: enabled }),
    setTransitioning: (isTransitioning) => set({ isTransitioning }),
  }))
);