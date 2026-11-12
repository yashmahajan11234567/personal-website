/**
 * Data Nexus — World Map Data
 * Room boundaries, collision geometry, object positions for Starting Hub
 * Coordinates in world pixels (1664 x 896 reference)
 */

export const WORLD_WIDTH = 1664;
export const WORLD_HEIGHT = 896;

export interface RectBounds { x: number; y: number; width: number; height: number; }
export interface CircleBounds { x: number; y: number; radius: number; }
export interface Doorway { id: string; bounds: RectBounds; targetScene: string; entryDoor: string; }

type FloorZone = 
  | { x: number; y: number; width: number; height: number; type: 'metallic' | 'wood'; color: string }
  | { x: number; y: number; radius: number; type: 'metallic' | 'wood'; color: string };

export const startingHub = {
  id: 'starting-hub',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,

  // Room outer walls (spaceship hull) - thick boundaries
  walls: [
    // Top wall
    { x: 0, y: 0, width: WORLD_WIDTH, height: 48, type: 'wall' as const },
    // Bottom wall
    { x: 0, y: WORLD_HEIGHT - 48, width: WORLD_WIDTH, height: 48, type: 'wall' as const },
    // Left wall
    { x: 0, y: 0, width: 48, height: WORLD_HEIGHT, type: 'wall' as const },
    // Right wall
    { x: WORLD_WIDTH - 48, y: 0, width: 48, height: WORLD_HEIGHT, type: 'wall' as const },
  ],

  // Red structural wall borders (inner decorative)
  structuralBorders: [
    { x: 48, y: 48, width: WORLD_WIDTH - 96, height: 8, type: 'border' as const, color: '#e03e3e' }, // top
    { x: 48, y: WORLD_HEIGHT - 56, width: WORLD_WIDTH - 96, height: 8, type: 'border' as const, color: '#e03e3e' }, // bottom
    { x: 48, y: 48, width: 8, height: WORLD_HEIGHT - 96, type: 'border' as const, color: '#e03e3e' }, // left
    { x: WORLD_WIDTH - 56, y: 48, width: 8, height: WORLD_HEIGHT - 96, type: 'border' as const, color: '#e03e3e' }, // right
  ],

  // Windows (transparent wall sections showing Earth)
  windows: [
    { x: 200, y: 48, width: 320, height: 96, type: 'window' as const },
    { x: WORLD_WIDTH - 520, y: 48, width: 320, height: 96, type: 'window' as const },
    { x: 200, y: WORLD_HEIGHT - 144, width: 320, height: 96, type: 'window' as const },
    { x: WORLD_WIDTH - 520, y: WORLD_HEIGHT - 144, width: 320, height: 96, type: 'window' as const },
  ],

  // Floor zones
  floorZones: [
    // Blue metallic floor - central area around Data Core
    { x: 480, y: 200, width: 704, height: 496, type: 'metallic' as const, color: '#1a3a5c' },
    // Wooden floor - peripheral areas
    { x: 48, y: 48, width: 432, height: WORLD_HEIGHT - 96, type: 'wood' as const, color: '#c48e6e' },
    { x: WORLD_WIDTH - 480, y: 48, width: 432, height: WORLD_HEIGHT - 96, type: 'wood' as const, color: '#c48e6e' },
  ] as FloorZone[],

  // Floor lettering
  floorLettering: {
    text: 'DATA NEXUS / STARTING HUB',
    x: WORLD_WIDTH / 2,
    y: WORLD_HEIGHT - 100,
    color: '#ffd600',
    fontSize: 24,
  },

  // Central Data Core
  dataCore: {
    platform: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, radius: 120, type: 'platform' as const },
    pillar: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, radius: 32, type: 'hologram' as const },
    glowRadius: 160,
    glowColor: '#00d4ff',
  },

  // Console screens around Data Core (4 stations)
  consoles: [
    { x: WORLD_WIDTH / 2 - 200, y: WORLD_HEIGHT / 2 - 180, width: 80, height: 40, angle: 0, type: 'console' as const },
    { x: WORLD_WIDTH / 2 + 120, y: WORLD_HEIGHT / 2 - 180, width: 80, height: 40, angle: 0, type: 'console' as const },
    { x: WORLD_WIDTH / 2 - 200, y: WORLD_HEIGHT / 2 + 140, width: 80, height: 40, angle: 0, type: 'console' as const },
    { x: WORLD_WIDTH / 2 + 120, y: WORLD_HEIGHT / 2 + 140, width: 80, height: 40, angle: 0, type: 'console' as const },
  ],

  // Furniture objects
  furniture: [
    // Curved red sofa (left side, on wooden floor)
    { id: 'sofa', x: 180, y: 280, width: 160, height: 80, type: 'sofa' as const, color: '#e03e3e', solid: true },

    // Round wooden table (near sofa)
    { id: 'table', x: 280, y: 420, radius: 40, type: 'table' as const, color: '#c48e6e', solid: true },

    // Workstation desks (right side, on metallic floor)
    { id: 'desk1', x: 1100, y: 220, width: 160, height: 70, type: 'desk' as const, color: '#3d4a5c', solid: true },
    { id: 'desk2', x: 1100, y: 320, width: 160, height: 70, type: 'desk' as const, color: '#3d4a5c', solid: true },
    { id: 'desk3', x: 1100, y: 600, width: 160, height: 70, type: 'desk' as const, color: '#3d4a5c', solid: true },

    // Chairs (at desks)
    { id: 'chair1', x: 1280, y: 240, radius: 20, type: 'chair' as const, color: '#1a3a5c', solid: true },
    { id: 'chair2', x: 1280, y: 340, radius: 20, type: 'chair' as const, color: '#1a3a5c', solid: true },
    { id: 'chair3', x: 1280, y: 620, radius: 20, type: 'chair' as const, color: '#1a3a5c', solid: true },

    // Computer monitors (on desks)
    { id: 'monitor1', x: 1120, y: 200, width: 100, height: 12, type: 'monitor' as const, color: '#00d4ff', solid: false },
    { id: 'monitor2', x: 1120, y: 300, width: 100, height: 12, type: 'monitor' as const, color: '#00d4ff', solid: false },
    { id: 'monitor3', x: 1120, y: 580, width: 100, height: 12, type: 'monitor' as const, color: '#00d4ff', solid: false },

    // Server cabinets (back wall, right side)
    { id: 'server1', x: 1100, y: 460, width: 80, height: 160, type: 'server' as const, color: '#1a3a5c', solid: true },
    { id: 'server2', x: 1200, y: 460, width: 80, height: 160, type: 'server' as const, color: '#1a3a5c', solid: true },
    { id: 'server3', x: 1300, y: 460, width: 80, height: 160, type: 'server' as const, color: '#1a3a5c', solid: true },

    // Cylindrical machinery (scattered)
    { id: 'machine1', x: 1350, y: 200, radius: 35, type: 'machine' as const, color: '#3d4a5c', solid: true },
    { id: 'machine2', x: 1420, y: 650, radius: 40, type: 'machine' as const, color: '#3d4a5c', solid: true },

    // Plants
    { id: 'plant1', x: 200, y: 600, radius: 30, type: 'plant' as const, color: '#2e7d32', solid: true },
    { id: 'plant2', x: 1400, y: 200, radius: 25, type: 'plant' as const, color: '#2e7d32', solid: true },
    { id: 'plant3', x: 1500, y: 700, radius: 25, type: 'plant' as const, color: '#2e7d32', solid: true },

    // Floor vents
    { id: 'vent1', x: 600, y: 300, width: 48, height: 48, type: 'vent' as const, color: '#3d4a5c', solid: false },
    { id: 'vent2', x: 900, y: 650, width: 48, height: 48, type: 'vent' as const, color: '#3d4a5c', solid: false },

    // Cyan illuminated floor strips
    { id: 'strip1', x: 480, y: WORLD_HEIGHT / 2, width: 704, height: 4, type: 'strip' as const, color: '#00d4ff', solid: false },
    { id: 'strip2', x: WORLD_WIDTH / 2, y: 200, width: 4, height: 496, type: 'strip' as const, color: '#00d4ff', solid: false },
  ],

  // Skills Tunnel entrance (top center)
  skillsTunnelEntrance: {
    id: 'skills-tunnel-door',
    x: WORLD_WIDTH / 2,
    y: 60,
    width: 120,
    height: 48,
    signText: 'SKILLS TUNNEL',
    signColor: '#ffd600',
    signBgColor: '#00d4ff',
  },

  // Player spawn position
  playerSpawn: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 + 200 },

  // Doorways for scene transitions
  doorways: [
    {
      id: 'to-skills-tunnel',
      bounds: { x: WORLD_WIDTH / 2 - 60, y: 48, width: 120, height: 48 },
      targetScene: 'skills-tunnel',
      entryDoor: 'south',
    } as Doorway,
  ],
};

export type StartingHubData = typeof startingHub;