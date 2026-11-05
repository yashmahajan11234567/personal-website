import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { TRANSITION_DURATION } from '../scene/poses';
import { DEST_ORDER } from '../experience.data';

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

/* Selector order lives in experience.data (DEST_ORDER: windmill, lighthouse,
 * pagoda) so the store, the component and the tests can never drift apart. */
const ORDER: readonly ('lighthouse' | 'windmill' | 'pagoda')[] = DEST_ORDER;

const initialState = {
  mode: 'overview' as ExperienceMode,
  selectedIsland: null as 'lighthouse' | 'windmill' | 'pagoda' | null,
  previousIsland: null as 'lighthouse' | 'windmill' | 'pagoda' | null,
  isTransitioning: false,
  rotationEnabled: false,
};

export const useExperienceStore = create<ExperienceState>()(
  subscribeWithSelector((set, get) => {
    /* Clears the transition lock after the camera/island tween has settled,
     * so rapid clicks queue safely instead of corrupting animation state. */
    const clearTransitionLater = () => {
      window.setTimeout(() => set({ isTransitioning: false }), TRANSITION_DURATION * 1000 + 200);
    };
    return {
      ...initialState,
      setMode: (mode) => set({ mode }),
      selectIsland: (island) => {
        // allow immediate re-selection after "Back to Islands" (mode exiting);
        // otherwise ignore clicks while a transition is still running
        if (get().isTransitioning && get().mode !== 'exiting') return;
        set({
          mode: 'entering',
          selectedIsland: island,
          previousIsland: null,
          isTransitioning: true,
        });
        clearTransitionLater();
      },
      navigate: (direction) => {
        const { selectedIsland, isTransitioning } = get();
        if (!selectedIsland || isTransitioning) return; // ignore clicks mid-transition
        const currentIndex = ORDER.indexOf(selectedIsland);
        const nextIndex = direction === 'next'
          ? (currentIndex + 1) % ORDER.length
          : (currentIndex + ORDER.length - 1) % ORDER.length;
        const nextIsland = ORDER[nextIndex];
        set({
          mode: 'switching',
          previousIsland: selectedIsland,
          selectedIsland: nextIsland,
          isTransitioning: true,
        });
        clearTransitionLater();
      },
      goBack: () => {
        if (get().isTransitioning) return;
        set({
          mode: 'exiting',
          previousIsland: get().selectedIsland,
          selectedIsland: null,
          isTransitioning: true,
        });
        clearTransitionLater();
      },
      setRotationEnabled: (enabled) => set({ rotationEnabled: enabled }),
      setTransitioning: (isTransitioning) => set({ isTransitioning }),
    };
  })
);
