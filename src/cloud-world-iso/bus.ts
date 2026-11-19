/**
 * Typed event bus between the Phaser scene and the React shell.
 * Mirrors the interactionBus contract used by the Data World.
 */
export type IsoEvent =
  | { kind: 'activate'; id: string; contentId?: string; skills?: string[]; label: string }
  | { kind: 'close' }
  | { kind: 'prompt'; text: string | null; key: string | null } // context prompt chip
  | { kind: 'probe'; fps: number; calls: number; mode: 'foot' | 'boat'; x: number; y: number }
  | { kind: 'hover'; id: string | null; label: string | null };

type Handler = (e: IsoEvent) => void;

const handlers = new Set<Handler>();

export const bus = {
  on(h: Handler): () => void {
    handlers.add(h);
    return () => handlers.delete(h);
  },
  emit(e: IsoEvent): void {
    for (const h of handlers) h(e);
  },
};
