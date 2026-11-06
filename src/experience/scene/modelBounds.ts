import type { DestId } from '../experience.data';

/**
 * Runtime registry of each island model's fitted bounding-box size (world
 * units, after AtlasModel normalises the GLB to MODEL_HEIGHT). Camera poses
 * are derived from these measurements instead of hard-coded guesses.
 */
export interface ModelBounds {
  size: [number, number, number];
}

const registry: Partial<Record<DestId, ModelBounds>> = {};

export function setModelBounds(id: DestId, size: [number, number, number]): void {
  registry[id] = { size };
}

export function getModelBounds(id: DestId): ModelBounds | null {
  return registry[id] ?? null;
}

if (typeof window !== 'undefined') {
  (window as unknown as { __bounds?: unknown }).__bounds = registry;
}
