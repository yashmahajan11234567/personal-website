/**
 * Hero barrel.
 *
 * The exported name is unchanged so App.tsx keeps its import path, but the
 * implementation is now the rebuilt code-driven cinematic (Phase 1, Tasks 2-6).
 *
 * Removed in this rebuild:
 *   SelectionVideo.tsx      - the <video> overlay and its mid-cinematic media swap
 *   FrameSequenceCanvas.tsx - the bitmap frame-sequence renderer (reference only, D1/D2)
 *   Hero.tsx / Hero.css     - the earlier, unreferenced hero
 *   selection-compositing.json / cinematic-beats.json - hardcoded geometry and beats
 */

export { CinematicHero } from '../../cinematic/CinematicHero';
export type { CinematicHeroProps } from '../../cinematic/CinematicHero';