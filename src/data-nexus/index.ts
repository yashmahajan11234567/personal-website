/**
 * Data Nexus — Main Entry Point
 * Creates Phaser.Game instance and exports mount function for React integration
 */
import Phaser from 'phaser';
import { gameConfig } from './config/game';
import { BootScene } from './scenes/BootScene';
import { StartingHubScene } from './scenes/StartingHubScene';

let game: Phaser.Game | null = null;
let panelOpen = false;

export function setPanelOpen(open: boolean): void {
  panelOpen = open;
}

export function mountDataNexusWorld(container: HTMLElement): () => void {
  if (game) {
    game.destroy(false);
    game = null;
  }

  const config = {
    ...gameConfig,
    parent: container,
    scene: [BootScene, StartingHubScene],
  };

  game = new Phaser.Game(config);
  (window as unknown as Record<string, unknown>).__dataNexusGame = game;

  const bindScene = (): void => {
    const scene = game!.scene.getScene('starting-hub');
    if (scene) {
      (scene as any).setPanelOpenGetter?.(() => panelOpen);
    } else {
      setTimeout(bindScene, 0);
    }
  };
  bindScene();

  return () => {
    if (game) {
      game.destroy(false);
      game = null;
    }
  };
}

export function getGame(): Phaser.Game | null {
  return game;
}