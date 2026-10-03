/**
 * Environment canvas renderer.
 *
 * Draws the PIP network (Data) and the cloud field (Cloud) into a single
 * canvas, driven by one progress value in [0,1].
 *
 * WHY ONE PROGRESS VALUE FOR BOTH DIRECTIONS
 *
 * The brief asks for a specific 0/20/40/60/80/100 build on enter and the exact
 * reverse on leave, and for Data -> Cloud to have the outgoing environment
 * recede while the incoming one builds -- with no flash and no blank frame.
 * Two independent easing curves cannot guarantee that, because at any instant
 * they could both be near zero and produce the blank frame the brief forbids.
 * A single monotonic value advanced toward a target gives all of it for free:
 * leave IS enter run backwards, and the crossfade is just the two targets
 * swapping while the shared value sweeps between them.
 *
 * The value is never advanced by scroll -- this is entirely attention-driven,
 * and deliberately isolated from progressBus so it cannot perturb the
 * choreography.
 */

import { buildPipNetwork, BAND_ALPHA, BAND_WIDTH } from './pipNetwork';
import { buildCloudField, CLOUD_BAND_ALPHA, CLOUD_BAND_BLUR } from './cloudField';
import { window01, clamp01 } from './random';
import type { PipNetwork } from './pipNetwork';
import type { CloudField } from './cloudField';

const PIP_NETWORK: PipNetwork = buildPipNetwork();
const CLOUD_FIELD: CloudField = buildCloudField();

/**
 * Enter/leave timings. The build is slow enough to read as "the world waking
 * up"; the leave is faster, matching the reference's group snap-off, but still
 * gradual. Neither is instant, which the brief forbids explicitly.
 */
const ENTER_SECONDS = 0.95;
const LEAVE_SECONDS = 0.62;

export interface EnvironmentDrawOptions {
  /** 0..1 build progress. */
  progress: number;
  /** Seconds since the environment became active, for drift/bob. */
  elapsed: number;
  /** Cap DPR so a 3x phone does not quadruple the fill cost. */
  dprCap?: number;
}

export interface Size {
  w: number;
  h: number;
}

/** Resize the backing store to match the element and its CSS box. */
export function sizeCanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dprCap = 2,
): Size {
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, dprCap);
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h };
}

/* ------------------------------------------------------------------ PIP --- */

/**
 * Draw the PIP network.
 *
 * Each segment is drawn only across its own progress window, and as a PARTIAL
 * polyline within that window -- so the pipe visibly extends from its origin
 * toward its end rather than the whole run appearing at once. That directional
 * growth is the reference's defining motion.
 */
function drawPip(ctx: CanvasRenderingContext2D, size: Size, p: number, elapsed: number): void {
  const { w, h } = size;
  const unit = Math.min(w, h);

  ctx.save();
  // Blueprint strokes: crisp, thin, additive against the multiply-blended wash
  // beneath. 'lighter' keeps the crossings bright without muddying them.
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const seg of PIP_NETWORK.segments) {
    const t = window01(p, seg.startAt, seg.endAt);
    if (t <= 0) continue;

    // Partial polyline: interpolate along the segment by t.
    const ex = seg.x0 + (seg.x1 - seg.x0) * t;
    const ey = seg.y0 + (seg.y1 - seg.y0) * t;

    const band = seg.band;
    /*
     * Bands breathe at different rates. The parallax is intentionally subtle --
     * the brief warns against cartoonish motion, and a strong per-band offset
     * would make the network shimmer instead of sitting in depth.
     */
    const sway = Math.sin(elapsed * 0.5 + band * 1.9) * unit * 0.0012 * (band + 1);

    ctx.strokeStyle = `rgba(214, 232, 255, ${BAND_ALPHA[band]})`;
    /*
     * The line width must be in BACKING-STORE pixels, because that is the space
     * the context is scaled into by sizeCanvas(). `unit` is the backing store's
     * min dimension, so dividing by 900 and multiplying back does scale -- but it
     * is confusingly close to a CSS-pixel value, and it silently doubles the
     * apparent weight on a 2x display. The reference's strokes are hairline, so
     * the base is deliberately small and the DPR is handled by the store size
     * alone.
     */
    ctx.lineWidth = BAND_WIDTH[band] * (unit / 1280);
    ctx.beginPath();
    ctx.moveTo(seg.x0 * w + sway, seg.y0 * h + sway);
    ctx.lineTo(ex * w + sway, ey * h + sway);
    ctx.stroke();
  }

  // Joints, brightest as their branch completes.
  for (const j of PIP_NETWORK.joints) {
    const t = window01(p, j.at, Math.min(1, j.at + 0.08));
    if (t <= 0) continue;
    const a = BAND_ALPHA[j.band] * t;
    ctx.fillStyle = `rgba(232, 242, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(j.x * w, j.y * h, j.r * (unit / 1280), 0, Math.PI * 2);
    ctx.fill();
  }

  /*
   * The origin spark, per the reference's opening point of light. It leads the
   * network slightly -- bright before anything has been drawn -- which is what
   * makes the build read as emanating FROM something rather than being
   * switched on.
   */
  const sparkT = window01(p, 0, 0.18);
  if (sparkT > 0) {
    const pulse = 1 + Math.sin(elapsed * 1.6) * 0.08;
    const r = unit * 0.004 * sparkT * pulse;
    const g = ctx.createRadialGradient(
      PIP_NETWORK.origin.x * w,
      PIP_NETWORK.origin.y * h,
      0,
      PIP_NETWORK.origin.x * w,
      PIP_NETWORK.origin.y * h,
      r * 6,
    );
    g.addColorStop(0, `rgba(255,255,255,${0.9 * sparkT})`);
    g.addColorStop(0.35, `rgba(190,220,255,${0.4 * sparkT})`);
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(PIP_NETWORK.origin.x * w, PIP_NETWORK.origin.y * h, r * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* --------------------------------------------------------------- CLOUD --- */

/**
 * Draw the cloud field.
 *
 * Each cloud grows from 0.62 of its size as it arrives, matching the
 * reference's scale-up entry, and its puffs are drawn twice: a beige pass
 * offset downward for the underside, then the white pass on top. That two-pass
 * offset is what produces the reference's flat vector look; a single fill with a
 * gradient reads as soft airbrush instead, which is a different aesthetic.
 */
function drawClouds(ctx: CanvasRenderingContext2D, size: Size, p: number, elapsed: number): void {
  const { w, h } = size;
  const unit = Math.min(w, h);

  for (const cloud of CLOUD_FIELD.clouds) {
    const t = window01(p, cloud.startAt, cloud.endAt);
    if (t <= 0) continue;

    const band = cloud.band;
    const alpha = CLOUD_BAND_ALPHA[band] * t;
    if (alpha <= 0.004) continue;

    const scale = cloud.scale * (0.62 + 0.38 * t);
    const driftX = cloud.drift * elapsed * w;
    const driftY = Math.sin(elapsed * cloud.bob + cloud.phase) * unit * 0.004;
    const cx = cloud.cx * w + driftX;
    const cy = cloud.cy * h + driftY;

    const blur = CLOUD_BAND_BLUR[band];
    ctx.save();
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    }

    // Under-shadow pass, offset down: the beige underside.
    ctx.fillStyle = `rgba(206, 150, 92, ${alpha * 0.85})`;
    for (const puff of cloud.puffs) {
      const r = puff.r * scale * unit;
      ctx.beginPath();
      ctx.arc(
        cx + puff.dx * scale * w,
        cy + puff.dy * scale * h + r * 0.16,
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Body pass.
    ctx.fillStyle = `rgba(252, 250, 246, ${alpha})`;
    for (const puff of cloud.puffs) {
      const r = puff.r * scale * unit;
      ctx.beginPath();
      ctx.arc(cx + puff.dx * scale * w, cy + puff.dy * scale * h, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pale top highlight: only the upper puffs, per the reference.
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    for (const puff of cloud.puffs) {
      if (puff.lift < 0.35) continue;
      const r = puff.r * scale * unit * 0.82;
      ctx.beginPath();
      ctx.arc(
        cx + puff.dx * scale * w,
        cy + puff.dy * scale * h - r * 0.28,
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ---------------------------------------------------------------- main --- */

export type EnvironmentKind = 'data' | 'cloud';

export function drawEnvironment(
  canvas: HTMLCanvasElement,
  kind: EnvironmentKind,
  opts: EnvironmentDrawOptions,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = { w: canvas.width, h: canvas.height };
  ctx.clearRect(0, 0, size.w, size.h);

  const p = clamp01(opts.progress);
  if (p <= 0.001) return;

  if (kind === 'data') drawPip(ctx, size, p, opts.elapsed);
  else drawClouds(ctx, size, p, opts.elapsed);
}

/** Advance a progress value toward a target. Exported for tests. */
export function stepProgress(
  current: number,
  target: number,
  dtSeconds: number,
): { value: number; done: boolean } {
  const seconds = target > current ? ENTER_SECONDS : LEAVE_SECONDS;
  const rate = 1 / seconds;
  const delta = rate * dtSeconds;
  if (Math.abs(target - current) <= delta) return { value: target, done: true };
  return { value: current + Math.sign(target - current) * delta, done: false };
}

/** How many PIP segments are drawn at a given progress (for tests). */
export function visibleSegmentCount(progress: number): number {
  let n = 0;
  for (const s of PIP_NETWORK.segments) {
    if (window01(clamp01(progress), s.startAt, s.endAt) > 0) n++;
  }
  return n;
}

/** How many clouds are drawn at a given progress (for tests). */
export function visibleCloudCount(progress: number): number {
  let n = 0;
  for (const c of CLOUD_FIELD.clouds) {
    if (window01(clamp01(progress), c.startAt, c.endAt) > 0) n++;
  }
  return n;
}

export const ENV_ENTER_SECONDS = ENTER_SECONDS;
export const ENV_LEAVE_SECONDS = LEAVE_SECONDS;