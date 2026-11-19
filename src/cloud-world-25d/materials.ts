/**
 * Texture loading for the 2.5D world.
 *
 * AI-generated textures live in `public/assets/cw25d/` (produced by
 * scripts/ai_assets/manifest4.json via local ComfyUI SDXL and packed by
 * scripts/ai_assets/pack_atlas.py). If a file is not there yet, a procedural
 * canvas fallback is generated so the scene always renders — the generated
 * texture hot-swaps in once present (same slot, no code change).
 */
import * as THREE from 'three';
import { useEffect, useState } from 'react';

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

const FALLBACKS: Record<string, () => THREE.Texture> = {
  tex_grass: () => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#69a84f'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `hsl(${95 + Math.random() * 30}, ${45 + Math.random() * 25}%, ${32 + Math.random() * 18}%)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 2 + Math.random() * 4);
    }
  }, 8),
  tex_sand: () => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#e8d8a0'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${200 + Math.random() * 40}, ${180 + Math.random() * 30}, 120, 0.5)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  }, 8),
  tex_wood: () => canvasTex(256, (ctx, s) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = `hsl(${26 + Math.random() * 8}, ${38 + Math.random() * 12}%, ${38 + Math.random() * 10}%)`;
      ctx.fillRect(0, (r * s) / rows, s, s / rows - 2);
      ctx.fillStyle = 'rgba(40,24,12,0.8)';
      ctx.fillRect(0, ((r + 1) * s) / rows - 2, s, 2);
    }
  }, 3),
  tex_water: () => canvasTex(512, (ctx, s) => {
    ctx.fillStyle = '#35aecf'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.08})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      const y = Math.random() * s, len = 30 + Math.random() * 110, x = Math.random() * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + len / 2, y + (Math.random() - 0.5) * 6, x + len, y); ctx.stroke();
    }
  }, 4),
  tex_stone: () => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#8d9299'; ctx.fillRect(0, 0, s, s);
    const n = 7;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = `hsl(220, 6%, ${52 + Math.random() * 14}%)`;
      ctx.beginPath();
      ctx.ellipse((i + 0.5) * s / n + (Math.random() - 0.5) * 6, (j + 0.5) * s / n + (Math.random() - 0.5) * 6, s / n * 0.42, s / n * 0.36, Math.random() * 3, 0, 7);
      ctx.fill();
    }
  }, 2),
  tex_roof: () => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#b5533c'; ctx.fillRect(0, 0, s, s);
    for (let r = 0; r < 8; r++) for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${14 + Math.random() * 8}, 52%, ${38 + Math.random() * 10}%)`;
      ctx.beginPath(); ctx.arc((i + 0.5) * s / 6, (r + 0.7) * s / 8, s / 13, Math.PI, 0); ctx.fill();
    }
  }, 2),
  tex_metal: () => canvasTex(256, (ctx, s) => {
    for (let x = 0; x < s; x += 16) {
      const g = ctx.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, '#9aa3ad'); g.addColorStop(0.5, '#c3cad2'); g.addColorStop(1, '#878f99');
      ctx.fillStyle = g; ctx.fillRect(x, 0, 16, s);
    }
  }, 2),
  tex_canopy: () => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#4e8f3a'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `hsl(${100 + Math.random() * 30}, 48%, ${30 + Math.random() * 22}%)`;
      ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, 6 + Math.random() * 14, 0, 7); ctx.fill();
    }
  }, 1),
  tex_rock: () => canvasTex(256, (ctx, s) => {
    ctx.fillStyle = '#8b8f94'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `hsl(220, 5%, ${40 + Math.random() * 25}%)`;
      ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 22, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = 'rgba(90,140,60,0.55)';
      ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, 6 + Math.random() * 10, 0, 7); ctx.fill();
    }
  }, 1),
  tex_wall_house: () => canvasTex(512, (ctx, s) => {
    ctx.fillStyle = '#f6efdd'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, s - 14, s - 14);
    ctx.fillStyle = '#8a6a3c'; ctx.fillRect(s * 0.42, s * 0.55, s * 0.16, s * 0.45); // door
    ctx.fillStyle = '#bfe3f2';
    ctx.fillRect(s * 0.12, s * 0.2, s * 0.22, s * 0.24); ctx.fillRect(s * 0.66, s * 0.2, s * 0.22, s * 0.24); // windows
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 8;
    ctx.strokeRect(s * 0.12, s * 0.2, s * 0.22, s * 0.24); ctx.strokeRect(s * 0.66, s * 0.2, s * 0.22, s * 0.24);
    ctx.beginPath(); ctx.arc(s * 0.5, s * 0.12, s * 0.06, 0, 7); ctx.fillStyle = '#bfe3f2'; ctx.fill();
  }, 1),
  tex_whale: () => canvasTex(512, (ctx, s) => {
    ctx.fillStyle = '#2496ed'; ctx.fillRect(0, 0, s, s * 0.55);
    ctx.fillStyle = '#f4f8fb'; ctx.fillRect(0, s * 0.55, s, s * 0.45);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 6;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, s * (0.12 + i * 0.1)); ctx.lineTo(s, s * (0.12 + i * 0.1)); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.82, s * 0.3, s * 0.05, 0, 7); ctx.fill();
    ctx.fillStyle = '#12232e'; ctx.beginPath(); ctx.arc(s * 0.83, s * 0.3, s * 0.025, 0, 7); ctx.fill();
    ctx.strokeStyle = '#12232e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(s * 0.78, s * 0.62, s * 0.06, 0.2, Math.PI - 0.4); ctx.stroke(); // smile
  }, 1),
  tex_container: () => canvasTex(512, (ctx, s) => {
    ctx.fillStyle = '#2496ed'; ctx.fillRect(0, 0, s, s * 0.5);
    for (let x = 0; x < s; x += 24) { ctx.fillStyle = 'rgba(0,40,80,0.25)'; ctx.fillRect(x, 0, 6, s * 0.5); }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(s * 0.08, s * 0.12, s * 0.3, s * 0.24);
  }, 1),
};

const cache = new Map<string, THREE.Texture>();

/** Load `/assets/cw25d/<name>.png`; on failure use (and cache) the procedural fallback. */
export function useTex(name: string): THREE.Texture {
  const [tex, setTex] = useState<THREE.Texture>(() => {
    const hit = cache.get(name);
    if (hit) return hit;
    const fb = FALLBACKS[name] ? FALLBACKS[name]() : FALLBACKS.tex_grass();
    cache.set(name, fb);
    return fb;
  });
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      `/assets/cw25d/${name}.png`,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
        // keep the fallback's repeat for tiles
        const fb = cache.get(name);
        if (fb) t.repeat.copy(fb.repeat);
        if (name === 'tex_water') t.repeat.set(5, 5);
        cache.set(name, t);
        setTex(t);
      },
      undefined,
      () => { /* keep fallback */ },
    );
    return () => { cancelled = true; };
  }, [name]);
  return tex;
}

/** Crisp text sign on a wooden board (canvas texture). */
export function makeSignTexture(text: string, sub?: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7a5230'; ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, 496, 240);
  ctx.fillStyle = '#f5e9c8'; ctx.textAlign = 'center';
  ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
  wrapText(ctx, text, 256, sub ? 92 : 128, 440, 50);
  if (sub) {
    ctx.font = '26px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText(sub, 256, 200);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy); line = w; yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
}
