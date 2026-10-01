/**
 * Registry for the active hero timeline.
 *
 * WHY THIS EXISTS
 *
 * ScrollTrigger pins the hero by wrapping it in a pin-spacer element it creates
 * and inserts into <main> itself. React knows nothing about that node. So when
 * React deletes the hero — for ANY reason, not just world selection — the order
 * of "React removes host nodes" versus "ScrollTrigger removes its pin-spacer"
 * decides whether the tree survives.
 *
 * Letting React unmount a still-pinned hero makes React call removeChild on a
 * node ScrollTrigger has already detached, which throws
 *   NotFoundError: Failed to execute 'removeChild' on 'Node'
 * and takes down the whole app. This was reproducible on the deep-link path
 * (#/data-world on load, then navigating back), where no click handler runs and
 * so nothing tore the trigger down in time.
 *
 * Effect cleanup is not a reliable place to fix this: React interleaves cleanup
 * with host-node deletion inside a single commit, and the pin-spacer is an
 * invisible interleaving point.
 *
 * The fix is to remove the ordering question entirely — whoever is about to
 * change worlds calls destroyActiveTimeline() SYNCHRONOUSLY, in the same task
 * as the state change, while the DOM is still intact. The hero also registers
 * itself on unmount as a backstop.
 */

import type { HeroTimelineHandle } from './useHeroTimeline';

let active: HeroTimelineHandle | null = null;

/**
 * Tear down whichever hero timeline is currently pinned.
 *
 * Idempotent and safe to call when nothing is mounted, so every world-change
 * path can call it unconditionally instead of tracking whether the hero exists.
 */
export function destroyActiveTimeline(): void {
  const handle = active;
  active = null;
  handle?.destroy();
}

export function setActiveTimeline(handle: HeroTimelineHandle | null): void {
  active = handle;
}