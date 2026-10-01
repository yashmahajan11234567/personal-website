/**
 * World board and figure copy.
 *
 * Everything the viewer reads as *content* lives here, not in pixels and not in
 * JSX, so it can be replaced without touching artwork (plan section 9, D2).
 *
 * The strings currently match the reference artwork, which uses
 * "DATA ANALYST / DATA ENGINEER" and "CLOUD / DEVOPS" as placeholders
 * (brief section 11). Swap them here.
 */

import type { Path } from '../../store/gameStore';

export interface WorldBoardContent {
  path: Path;
  /** Primary label, may be two lines. */
  lines: string[];
  /** Small monospace metadata strip at the foot of the plate. */
  status: string;
  /** Screen-reader action label. */
  ariaLabel: string;
  /** Short name used by the live region and the world handoff. */
  worldName: string;
}

export const WORLD_BOARDS: Record<Path, WorldBoardContent> = {
  data: {
    path: 'data',
    lines: ['DATA ANALYST', 'DATA ENGINEER'],
    status: 'SELECT',
    ariaLabel: 'Enter the Data world — data analyst and data engineering',
    worldName: 'DATA',
  },
  cloud: {
    path: 'cloud',
    lines: ['CLOUD', 'DEVOPS'],
    status: 'STATUS: LIVE',
    ariaLabel: 'Enter the Cloud world — cloud and DevOps',
    worldName: 'CLOUD / DEVOPS',
  },
};

/** Headline words in beat S0-S2. */
export const HEADLINE = {
  left: 'PERSONAL',
  right: 'PORTFOLIO',
} as const;

/**
 * Copy for the ID plate the figure holds. The plate is artwork, so this is
 * reference metadata only — it is not rendered as live text (D2 keeps the
 * existing figure artwork). Kept here so the plate can later be re-skinned.
 */
export const FIGURE_PLATE = {
  name: 'YASH MAHAJAN',
  age: '21',
  email: 'hitoyash1130@gmail.com',
} as const;
