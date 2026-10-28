/**
 * PixelGridTrail — white background, subtle gray grid, black pixel trail following mouse.
 * Matches reference: white canvas, fine gray grid, black cells trail with fade.
 */
import { useEffect, useRef } from 'react';
import './SpotlightLayer.css';

const CELL_SIZE = 20;
const FADE_SPEED = 0.93;
const TRAIL_RADIUS = 5;

interface Cell {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
}

export interface SpotlightLayerProps {
  disabled: boolean;
}

export function SpotlightLayer({ disabled }: SpotlightLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cells = new Map<string, Cell>();
    let mx = -1000, my = -1000, hm = false;
    let lastX = -1000, lastY = -1000;
    const history: Array<{x:number,y:number}> = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cells.clear();
      history.length = 0;
    };

    const getCell = (cx: number, cy: number): Cell => {
      const key = cx + ',' + cy;
      if (!cells.has(key)) {
        cells.set(key, { x: cx, y: cy, alpha: 0, targetAlpha: 0 });
      }
      return cells.get(key)!;
    };

    const illuminate = (px: number, py: number, intensity: number) => {
      const cx = Math.floor(px / CELL_SIZE);
      const cy = Math.floor(py / CELL_SIZE);
      for (let dy = -TRAIL_RADIUS; dy <= TRAIL_RADIUS; dy++) {
        for (let dx = -TRAIL_RADIUS; dx <= TRAIL_RADIUS; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > TRAIL_RADIUS + 0.5) continue;
          const cell = getCell(cx + dx, cy + dy);
          const bright = (1 - dist / (TRAIL_RADIUS + 1.2)) * intensity * (0.85 + Math.random() * 0.15);
          if (bright > cell.targetAlpha) cell.targetAlpha = Math.min(1, bright);
        }
      }
    };

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      
      const speed = hm ? Math.hypot(mx - lastX, my - lastY) : 0;
      const intensity = Math.min(1, 0.5 + speed / 25);
      
      if (hm && speed > 0.5) {
        const steps = Math.min(12, Math.max(2, Math.floor(speed / 3)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          illuminate(lastX + (mx - lastX) * t, lastY + (my - lastY) * t, intensity * (1 - t * 0.2));
        }
      }
      illuminate(mx, my, intensity);
      
      history.push({x: mx, y: my});
      if (history.length > 35) history.shift();
      
      lastX = mx; lastY = my;
      hm = true;
    };

    const draw = () => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      
      // Draw subtle grid
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < r.width; x += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, r.height);
        ctx.stroke();
      }
      for (let y = 0; y < r.height; y += CELL_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(r.width, y);
        ctx.stroke();
      }
      
      // Draw ambient pixels
      if (Math.random() < 0.001) {
        const ax = Math.floor(Math.random() * r.width / CELL_SIZE) * CELL_SIZE;
        const ay = Math.floor(Math.random() * r.height / CELL_SIZE) * CELL_SIZE;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(ax, ay, CELL_SIZE - 1, CELL_SIZE - 1);
      }

      for (const cell of cells.values()) {
        if (cell.targetAlpha > cell.alpha) {
          cell.alpha += (cell.targetAlpha - cell.alpha) * 0.35;
        } else {
          cell.alpha *= FADE_SPEED;
        }
        cell.targetAlpha *= 0.88;
        
        if (cell.alpha > 0.02) {
          const px = cell.x * CELL_SIZE;
          const py = cell.y * CELL_SIZE;
          // Black to gray fade
          const gray = Math.floor(0 + (1 - cell.alpha) * 180);
          ctx.fillStyle = 'rgba(' + gray + ',' + gray + ',' + gray + ',' + cell.alpha + ')';
          ctx.fillRect(px, py, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }
      
      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    canvas.parentElement?.addEventListener('mousemove', onMove);
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.parentElement?.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      cells.clear();
      history.length = 0;
    };
  }, [disabled]);

  return <canvas ref={canvasRef} className="cinematic-spotlight" aria-hidden="true" />;
}
