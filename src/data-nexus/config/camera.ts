/**
 * Data Nexus — Camera Configuration
 * Implements smooth follow with deadzone, look-ahead, and bounds clamping
 * Based on camera-systems skill patterns for Phaser
 */
import Phaser from 'phaser';

export const cameraConfig = {
  baseZoom: 2.0,
  deadzone: { x: 96, y: 64 },
  lookAheadDistance: 120,
  followLerp: 0.1,
  contentBandHeight: 280,
};

export function setupCamera(
  scene: Phaser.Scene,
  player: Phaser.GameObjects.Sprite,
  worldWidth: number,
  worldHeight: number,
  zoom?: number
): Phaser.Cameras.Scene2D.Camera {
  const cam = scene.cameras.main;

  cam.setBounds(0, 0, worldWidth, worldHeight);
  cam.setRoundPixels(true);
  cam.setBackgroundColor('#0b1d3a');

  // Contain-fit: show the whole reference room when the viewport allows it, so
  // the rendered frame is directly comparable to the supplied image. Only when
  // the viewport is smaller than the room do we zoom in and follow the player.
  const fitZoom = Math.min(
    scene.scale.width / worldWidth,
    scene.scale.height / worldHeight,
  );
  const useZoom = zoom ?? fitZoom;
  const showsWholeRoom = useZoom * worldWidth <= scene.scale.width + 1
    && useZoom * worldHeight <= scene.scale.height + 1;

  cam.setZoom(useZoom);
  cam.centerOn(worldWidth / 2, worldHeight / 2);

  if (!showsWholeRoom) {
    cam.startFollow(player, true, cameraConfig.followLerp, cameraConfig.followLerp);
    cam.deadzone = new Phaser.Geom.Rectangle(
      (scene.scale.width / cam.zoom - cameraConfig.deadzone.x) / 2,
      (scene.scale.height / cam.zoom - cameraConfig.deadzone.y) / 2,
      cameraConfig.deadzone.x,
      cameraConfig.deadzone.y,
    );
  }

  return cam;
}

export function updateCameraLookAhead(
  cam: Phaser.Cameras.Scene2D.Camera,
  player: Phaser.GameObjects.Sprite,
  delta: number
): void {
  if (!player.body) return;

  const body = player.body as Phaser.Physics.Arcade.Body;
  const velocity = body.velocity;

  if (velocity.length() > 10) {
    const leadX = velocity.x * 0.15;
    const leadY = velocity.y * 0.15;
    cam.scrollX += leadX * delta * 0.001;
    cam.scrollY += leadY * delta * 0.001;
  }
}

export function computeZoomForViewport(
  _canvasWidth: number,
  canvasHeight: number
): number {
  const maxByHeight = canvasHeight / cameraConfig.contentBandHeight;
  const zoom = Math.min(cameraConfig.baseZoom, maxByHeight);
  return Math.max(1, Math.floor(zoom * 4) / 4);
}