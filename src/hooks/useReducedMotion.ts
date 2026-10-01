import { useEffect, useState } from 'react';

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    console.log('[useReducedMotion] Initial match:', mediaQuery.matches);
    setReduced(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => {
      console.log('[useReducedMotion] Changed:', e.matches);
      setReduced(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  console.log('[useReducedMotion] Returning:', reduced);
  return reduced;
};