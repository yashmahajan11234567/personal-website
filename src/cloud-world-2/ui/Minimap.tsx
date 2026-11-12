/** Cloud World 2.0 — Minimap (canvas, requestAnimationFrame) */

import { useEffect, useRef } from 'react';
import { pilot, view } from '../player/state';
import { ISLANDS, DECKS, BERTHS } from '../core/registry';
import { hexString } from '../core/palette';
import '../styles/cloudWorld2.css';

const MAP_SIZE = 150;
const WORLD_RADIUS = 90; // blocks (max extent of islands from 0,0)
const SCALE = MAP_SIZE / (WORLD_RADIUS * 2); // world 180 → 150px

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_SIZE * dpr;
    canvas.height = MAP_SIZE * dpr;
    canvas.style.width = `${MAP_SIZE}px`;
    canvas.style.height = `${MAP_SIZE}px`;
    ctx.scale(dpr, dpr);

    const center = MAP_SIZE / 2;

    // Pre-compute island draw data
    const islandsDraw = ISLANDS.map((isl) => ({
      x: center + isl.cx * SCALE,
      y: center - isl.cz * SCALE, // cz → -y for screen coords
      r: Math.max(2, isl.r * SCALE),
      color: hexString('grassTop'),
    }));

    // Pre-compute dock draw data
    const docksDraw = DECKS.map((d) => ({
      x0: center + d.x0 * SCALE,
      y0: center - d.z0 * SCALE,
      x1: center + d.x1 * SCALE,
      y1: center - d.z1 * SCALE,
      color: hexString('wood'),
    }));

    // Pre-compute berth draw data
    const berthsDraw = BERTHS.map((b) => ({
      x: center + b.x * SCALE,
      y: center - b.z * SCALE,
      color: hexString('whaleBlue'),
    }));

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

      // Ocean fill
      ctx.fillStyle = hexString('oceanMid');
      ctx.beginPath();
      ctx.arc(center, center, center, 0, Math.PI * 2);
      ctx.fill();

      // Islands
      for (const isl of islandsDraw) {
        ctx.fillStyle = isl.color;
        ctx.beginPath();
        ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Docks (rectangles)
      ctx.strokeStyle = hexString('wood');
      ctx.lineWidth = 2;
      for (const d of docksDraw) {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        ctx.strokeRect(d.x0, d.y0, w, h);
      }

      // Berths (dots)
      ctx.fillStyle = hexString('whaleBlue');
      for (const b of berthsDraw) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player triangle
      const isBoat = pilot.mode === 'boat';
      const px = isBoat ? pilot.boatPos.x : pilot.pos.x;
      const pz = isBoat ? pilot.boatPos.z : pilot.pos.z;
      const heading = isBoat ? pilot.boatHeading : pilot.heading;

      const sx = center + px * SCALE;
      const sy = center - pz * SCALE;

      ctx.save();
      ctx.translate(sx, sy);
      // Triangle points NORTH-UP; heading 0 = +Z (north in world), so rotate by -heading
      // But we want triangle to FACE the heading direction. Triangle points up (north) by default.
      // World: heading 0 = +Z (north). Screen: y down, so north = -y.
      // Triangle default points to -y (north on screen). So rotate by -heading.
      ctx.rotate(-heading);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(-3, 3);
      ctx.lineTo(3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Optional: camera facing wedge (subtle)
      if (!isBoat) {
        const camHeading = Math.atan2(-view.camFwd.z, view.camFwd.x) - Math.PI / 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-camHeading);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(-4, -1);
        ctx.lineTo(4, -1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    draw();
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="cw2-minimap" aria-hidden="true" title="Minimap — north up">
      <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} />
    </div>
  );
}