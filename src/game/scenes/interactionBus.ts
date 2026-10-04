/**
 * The engine -> React interaction boundary.
 *
 * Phaser must not import React, and React must not reach into Phaser's scene
 * graph to discover what happened. Events cross in one direction only, through
 * this tiny typed bus.
 *
 * Phase 1 establishes the mechanism and proves it end to end with a single
 * probe object. Skills, projects and panels are later phases and attach
 * listeners here without any engine change.
 */

export type InteractionKind = 'probe';

export interface InteractionEvent {
  /** Stable identifier for the object that was touched. */
  id: string;
  /** Which world produced it. */
  world: string;
  kind: InteractionKind;
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
