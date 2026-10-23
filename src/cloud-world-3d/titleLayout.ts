export const CANVAS_W = 2048;
export const CANVAS_H = 1024;
export const TITLE_FONT = "Georgia, 'Times New Roman', serif";
export const TITLE_FLOOR_BIG = 120;
export const TITLE_FLOOR_SMALL = 96;
export const MAX_W_FRAC = 0.74;
export const MAX_H_FRAC = 0.84;

const CONNECTORS = new Set(['&', '/', '+', '—', '-', '·']);

export function wrapTitle(ctx: CanvasRenderingContext2D, title: string, maxW: number, maxLines: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? current + ' ' + w : w;
    if (ctx.measureText(candidate).width <= maxW || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current) lines.push(current);
  // Over the line cap: merge the remainder onto the last line (it will be
  // handled by the caller's size search instead of being clipped).
  if (lines.join(' ') !== title) {
    const rest = words.slice(lines.reduce((n, l) => n + l.split(/\s+/).length, 0)).join(' ');
    if (rest) lines[lines.length - 1] += ' ' + rest;
  }
  return lines;
}

export function computeTitleLayout(ctx: CanvasRenderingContext2D, title: string, big: boolean): { lines: string[]; size: number } {
  const floor = big ? TITLE_FLOOR_BIG : TITLE_FLOOR_SMALL;
  const maxW = CANVAS_W * MAX_W_FRAC;
  let size = big ? 520 : 420;

  // Vertical fit gate: the rendered title plane is 2:1 (w×h/2 effective on
  // the board). 3 lines at full size overflow the canvas and get clipped —
  // shrink the font until totalH fits 84% of the canvas height. For each
  // candidate line count (fewest first), find the largest size ≥ floor
  // whose wrapped lines fit BOTH maxW and maxH.
  const maxH = CANVAS_H * MAX_H_FRAC;

  let layout: { lines: string[]; size: number } | null = null;
  // LARGEST-GLYPH-WINS: the old loop took the FIRST fit (n=1), which squeezed
  // multi-word titles onto a single tiny ~124px line — unreadable at gameplay
  // distance. Instead evaluate n=1..3 and keep the layout with the biggest font
  // size. A layout whose any line is a bare connector ('&', '/', '+') is
  // rejected: a dangling ampersand reads as broken typography. VIS-003 also
  // forbids lines starting with a connector.
  for (const n of [1, 2, 3]) {
    let s = size;
    while (s >= floor) {
      ctx.font = `bold ${s}px ${TITLE_FONT}`;
      const wrapped = n === 1 ? [title] : wrapTitle(ctx, title, maxW, n);
      let clean =
        wrapped.length <= n &&
        !wrapped.some((l) => CONNECTORS.has(l.trim())) &&
        !wrapped.some((l) => CONNECTORS.has(l.trim()[0])); // VIS-003: no connector-initial lines
      if (clean) {
        const widest = Math.max(...wrapped.map((l) => ctx.measureText(l).width));
        if (widest <= maxW && s * 1.08 * wrapped.length <= maxH) {
          if (!layout || s > layout.size) layout = { lines: wrapped, size: s };
          break;
        }
      }
      s -= 12;
    }
  }
  if (!layout) {
    // Last resort: 3 lines at the floor, allow the widest line to exceed
    // maxW slightly rather than clipping vertically.
    ctx.font = `bold ${floor}px ${TITLE_FONT}`;
    layout = { lines: wrapTitle(ctx, title, maxW, 3), size: floor };
  }
  return layout;
}
