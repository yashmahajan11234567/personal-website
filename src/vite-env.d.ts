/// <reference types="vite/client" />

declare module '*.json' {
  const value: any;
  export default value;
}

declare module '../../data/cinematic-beats.json' {
  const beats: {
    left: {
      introEnd: number;
      divergenceStart: number;
      divergenceEnd: number;
      selectionReveal: number;
      selectionCommit: number;
      transitionComplete: number;
    };
    right: {
      introEnd: number;
      divergenceStart: number;
      divergenceEnd: number;
      selectionReveal: number;
      selectionCommit: number;
      transitionComplete: number;
    };
    shared: {
      introEnd: number;
      divergenceStart: number;
      divergenceEnd: number;
    };
  };
  export default beats;
}

declare module '../../data/selection-compositing.json' {
  const config: {
    strategy: string;
    phases: {
      intro: { progress: [number, number]; mode: string; source: string };
      diverging: { progress: [number, number]; mode: string; source: string };
      dual: { progress: [number, number]; mode: string; source: string };
      selection: { progress: [number, number]; mode: string; source: string; hotspots: boolean };
      transition: { progress: [number, number]; mode: string; source: string };
    };
    hotspots: {
      data: { x: number; y: number; width: number; height: number };
      cloud: { x: number; y: number; width: number; height: number };
    };
    progressMapping: {
      left: { selectionStart: number; selectionEnd: number; transitionEnd: number };
      right: { selectionStart: number; selectionEnd: number; transitionEnd: number };
    };
  };
  export default config;
}