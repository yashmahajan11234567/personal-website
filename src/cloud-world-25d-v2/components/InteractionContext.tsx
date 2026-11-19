/**
 * Interaction Context — shared state between Canvas (raycasting) and HTML overlay (UI).
 */
import { createContext, useContext, useState, type ReactNode } from 'react';
import { HOTSPOTS, CONTENT } from '../world';

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  r: number;
}

interface InteractionContextValue {
  hoveredId: string | null;
  openCardId: string | null;
  showBoardingPrompt: boolean;
  setHoveredId: (id: string | null) => void;
  setOpenCardId: (id: string | null) => void;
  setShowBoardingPrompt: (show: boolean) => void;
  hotspots: Hotspot[];
  content: typeof CONTENT;
}

const InteractionContext = createContext<InteractionContextValue | null>(null);

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [showBoardingPrompt, setShowBoardingPrompt] = useState(false);

  const hotspots: Hotspot[] = HOTSPOTS.map(h => ({ ...h, y: 1 }));

  return (
    <InteractionContext.Provider
      value={{
        hoveredId,
        openCardId,
        showBoardingPrompt,
        setHoveredId,
        setOpenCardId,
        setShowBoardingPrompt,
        hotspots,
        content: CONTENT,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteraction() {
  const ctx = useContext(InteractionContext);
  if (!ctx) throw new Error('useInteraction must be used within InteractionProvider');
  return ctx;
}