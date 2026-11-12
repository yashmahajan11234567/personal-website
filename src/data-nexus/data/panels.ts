/**
 * Data Nexus — panel content resolution.
 *
 * Skill and project panels resolve live from the portfolio content model
 * (src/content), so a panel can never drift from the verified facts.
 * `info` panels are short static texts defined here.
 */
import { PORTFOLIO } from '../../content';
import type { PanelRef } from './rooms';
import type { Project, Skill } from '../../content/types';

export interface InfoPanelContent {
  title: string;
  paragraphs: string[];
}

export const INFO_PANELS: Record<string, InfoPanelContent> = {
  'hub-core': {
    title: 'Data Core — Starting Hub',
    paragraphs: [
      'Welcome to the Data Nexus, the interactive Data World of this portfolio.',
      'Walk with WASD or the arrow keys. Press E (or Space) at a glowing station to open it. Head north through the door to reach the Skills Tunnel, then the Projects Hub.',
      'Every station and kiosk shows verified, repository-backed content — nothing here is a placeholder.',
    ],
  },
};

export function resolvePanel(ref: PanelRef): { title: string; skill?: Skill; project?: Project; info?: InfoPanelContent } {
  if (ref.kind === 'skill') {
    const skill = PORTFOLIO.skills[ref.id];
    return { title: skill?.name ?? ref.id, skill };
  }
  if (ref.kind === 'project') {
    const project = PORTFOLIO.projects[ref.id];
    return { title: project?.title ?? ref.id, project };
  }
  return { title: INFO_PANELS[ref.id]?.title ?? ref.id, info: INFO_PANELS[ref.id] };
}
