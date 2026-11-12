/**
 * Data Nexus — Phaser Game Configuration
 * Targets Phaser 4.2.1
 */
import Phaser from 'phaser';

// The Starting Hub is authored to the supplied reference frame (1672 x 941).
export const GAME_WIDTH = 1672;
export const GAME_HEIGHT = 941;
export const BASE_ZOOM = 1.0;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b1d3a',
  parent: null,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      fps: 60,
    },
  },
  banner: false,
  scene: [],
};