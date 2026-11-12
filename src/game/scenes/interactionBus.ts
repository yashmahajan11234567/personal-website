/**
 * The engine -> React interaction boundary.
 *
 * Phaser must not import React, and React must not reach into Phaser's scene
 * graph to discover what happened. Events cross in one direction only, through
 * this tiny typed bus.
 *
 * PHASE 2 SHAPE
 *
 * Phase 1 proved the path with one `probe` event. Phase 2 adds the interactions
 * the world needs, and they differ in SHAPE because the visitor's intent differs:
 *
 *   proximity  — "you are near this station". Fires as the player moves, carries
 *                no open/close state, and exists so React can mirror the same
 *                highlight the canvas shows. A visitor who never reads the DOM
 *                mirror can still play: that is the property which stops the
 *                canvas from being the only route to the portfolio.
 *   activate   — "open this". Discrete, carries the content-model id, and is the
 *                only thing that makes a panel appear.
 *   close      — "put the panel away". Discrete, same payload as activate.
 *   chapter    — "the player travelled". Not a panel; it tells React which chapter
 *                is current so the mirror's heading stays honest.
 *
 * `payload` carries only ids and primitives — never a live object from the scene
 * graph. React resolves ids against the content model itself, which keeps the
 * content model the single source of truth for every word a visitor reads.
 *
 * `probe` is retained: the Phase 1 suite asserts the gem at world x=480 emits it.
 */

export type InteractionKind = 'probe' | 'proximity' | 'activate' | 'close' | 'chapter';

export interface InteractionEvent {
  /** Stable identifier for the object that was touched. */
  id: string;
  /** Which world produced it. */
  world: string;
  kind: InteractionKind;
  /**
   * Extra data, by kind:
   *   proximity — `{ stationKind, chapter, inRange }`
   *   activate  — `{ stationKind, chapter }`
   *   close     — `{ stationKind }`, omitted when nothing was open
   *   chapter   — `{ chapter }`
   */
  payload?: Record<string, string | number | boolean>;
}

type Listener = (event: InteractionEvent) => void;

const listeners = new Set<Listener>();

/** Subscribe to interaction events. Returns an unsubscribe function. */
export const onInteraction = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Emit an interaction. Called by the scene, never by React. */
export const emitInteraction = (event: InteractionEvent): void => {
  for (const listener of [...listeners]) listener(event);
};

/**
 * Drop every listener.
 *
 * Called when a game instance is torn down. Without this, a listener
 * registered by a previous mount stays in the set and fires against the next
 * world — the classic "world entered twice" leak.
 */
export const resetInteractionBus = (): void => {
  listeners.clear();
};

/** Current listener count. Exported for tests that assert no leak. */
export const interactionListenerCount = (): number => listeners.size;
