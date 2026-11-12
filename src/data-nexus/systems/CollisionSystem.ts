/**
 * Data Nexus — Collision System
 * Sets up world bounds, furniture colliders, doorway triggers
 * Based on phaser-arcade-physics and physics-tuning skills
 */
import Phaser from 'phaser';
import { startingHub } from '../data/worldMap';
import type { Doorway } from '../data/worldMap';

export interface CollisionObjects {
  walls: Phaser.Physics.Arcade.StaticGroup;
  furniture: Phaser.Physics.Arcade.StaticGroup;
  doorways: Phaser.Physics.Arcade.StaticGroup;
  consoles: Phaser.Physics.Arcade.StaticGroup;
}

export function createCollisionObjects(scene: Phaser.Scene): CollisionObjects {
  const walls = scene.physics.add.staticGroup();
  const furniture = scene.physics.add.staticGroup();
  const doorways = scene.physics.add.staticGroup();
  const consoles = scene.physics.add.staticGroup();

  // Walls
  startingHub.walls.forEach(w => {
    const obj = scene.add.rectangle(w.x + w.width/2, w.y + w.height/2, w.width, w.height);
    walls.add(obj);
  });

  // Furniture collision bodies
  startingHub.furniture.forEach(f => {
    if (!f.solid) return;

    let obj: Phaser.GameObjects.GameObject;
    if ('radius' in f) {
      obj = scene.add.circle(f.x, f.y, f.radius);
    } else {
      obj = scene.add.rectangle(f.x, f.y, f.width, f.height);
    }
    furniture.add(obj);
  });

  // Console interaction zones (overlap, not collision)
  startingHub.consoles.forEach(c => {
    const obj = scene.add.rectangle(c.x, c.y, c.width + 40, c.height + 40);
    obj.setData('consoleId', c);
    consoles.add(obj);
  });

  // Doorways (overlap triggers)
  startingHub.doorways.forEach(d => {
    const obj = scene.add.rectangle(
      d.bounds.x + d.bounds.width/2,
      d.bounds.y + d.bounds.height/2,
      d.bounds.width,
      d.bounds.height
    );
    obj.setData('doorway', d);
    doorways.add(obj);
  });

  return { walls, furniture, doorways, consoles };
}

export function setupCollisions(
  scene: Phaser.Scene,
  player: Phaser.Physics.Arcade.Sprite,
  collisionObjects: CollisionObjects,
  onDoorwayEnter: (doorway: Doorway) => void,
  onConsoleOverlap: (console: any) => void
): void {
  const { walls, furniture, doorways, consoles } = collisionObjects;

  scene.physics.add.collider(player, walls);
  scene.physics.add.collider(player, furniture);

  scene.physics.add.overlap(player, doorways, (_player, doorwayObj) => {
    const doorway = (doorwayObj as Phaser.GameObjects.GameObject).getData('doorway') as Doorway;
    if (doorway) onDoorwayEnter(doorway);
  });

  scene.physics.add.overlap(player, consoles, (_player, consoleObj) => {
    const consoleData = (consoleObj as Phaser.GameObjects.GameObject).getData('consoleId');
    if (consoleData) onConsoleOverlap(consoleData);
  });

  player.setCollideWorldBounds(true);
  scene.physics.world.setBounds(0, 0, startingHub.width, startingHub.height);
}