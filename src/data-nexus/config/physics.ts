/**
 * Data Nexus — Physics Configuration (Arcade)
 */
export const physicsConfig = {
  default: 'arcade' as const,
  arcade: {
    gravity: { x: 0, y: 0 },
    debug: false,
    fps: 60,
    maxVelocity: 500,
    tileBias: 64,
    forceX: false,
    forceY: false,
  },
};