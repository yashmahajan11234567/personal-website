/**
 * A 5x7 bitmap font, drawn procedurally.
 *
 * WHY A FONT RATHER THAN `add.text`
 *
 * Phaser's `add.text` rasterises through the browser's font stack, which
 * antialiases. Under `pixelArt: true` the result is a blurry, modern-looking
 * label sitting in a world made of hard pixel edges — exactly the "generic
 * AI-game-art" look the visual direction rules out. Every glyph here is a hand
 * placed 5x7 bitmap, so sign text is built from the same kind of pixel as the
 * character and the pipes, and it scales with nearest-neighbour filtering like
 * everything else.
 *
 * The set is deliberately small: uppercase letters, digits, and the handful of
 * punctuation marks the world's labels actually use. Labels are short by design
 * ("SQL / T-SQL"), with the full wording living in the React panel.
 */

const G: Record<string, readonly string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
};

/** Glyph cell. Every glyph is this wide and this tall. */
export const GLYPH_W = 5;
export const GLYPH_H = 7;

/** Columns between glyphs, in unscaled pixels. */
const TRACKING = 1;

/** Advance width of one character, in unscaled pixels. */
const ADVANCE = GLYPH_W + TRACKING;

/** Uppercase and map anything unmapped to a visible fallback. */
const glyphFor = (ch: string): readonly string[] => {
  const direct = G[ch];
  if (direct) return direct;
  const upper = ch.toUpperCase();
  return G[upper] ?? G['?'];
};

/** Width in pixels of `text` drawn at `scale`. */
export const pixelTextWidth = (text: string, scale = 1): number =>
  text.length === 0 ? 0 : (text.length * ADVANCE - TRACKING) * scale;

/** Height in pixels of one line of text drawn at `scale`. */
export const pixelTextHeight = (scale = 1): number => GLYPH_H * scale;

/**
 * Stamp `text` onto a 2D canvas context, one pixel per fill.
 *
 * The caller owns the context and decides where the text lands, so the same
 * routine draws a standalone label texture and text embedded in a larger
 * composed texture (a sign, a crate face, a station screen).
 */
export const stampPixelText = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  colour: string,
  scale = 1,
): void => {
  ctx.fillStyle = colour;
  let cursor = x;
  for (const ch of text) {
    const glyph = glyphFor(ch);
    for (let row = 0; row < GLYPH_H; row += 1) {
      const line = glyph[row];
      for (let col = 0; col < GLYPH_W; col += 1) {
        if (line[col] === '#') {
          ctx.fillRect(cursor + col * scale, y + row * scale, scale, scale);
        }
      }
    }
    cursor += ADVANCE * scale;
  }
};

/** Centre `text` horizontally within `[left, left + width]`. */
export const stampPixelTextCentred = (
  ctx: CanvasRenderingContext2D,
  centreX: number,
  y: number,
  text: string,
  colour: string,
  scale = 1,
): void => {
  stampPixelText(ctx, Math.round(centreX - pixelTextWidth(text, scale) / 2), y, text, colour, scale);
};

/**
 * Wrap `text` to `maxChars` per line on word boundaries.
 *
 * Used for the multi-line station screens. Returns the lines already trimmed.
 */
export const wrapPixelText = (text: string, maxChars: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      // A single word longer than the limit is split rather than dropped.
      if (word.length > maxChars) {
        let rest = word;
        while (rest.length > maxChars) {
          lines.push(rest.slice(0, maxChars));
          rest = rest.slice(maxChars);
        }
        line = rest;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
};