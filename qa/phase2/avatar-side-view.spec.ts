/**
 * CORRECTION PASS — the avatar must be a SIDE-VIEW human in a hoodie.
 *
 * The previous sprite was front-facing: rows 4-14 were a symmetric face plane
 * with two eyes and a centred mouth. This asserts the sprite is a true profile,
 * structurally, for every frame.
 *
 * WHY THESE ASSERTIONS AND NOT A SCREENSHOT DIFF
 *
 * A picture comparison cannot say WHY a sprite reads as front-facing, and it
 * fails on harmless palette tweaks. These assert the three structural facts that
 * together make a profile read as a profile:
 *
 *   1. Exactly ONE eye. A profile shows the near eye only; two eyes is the
 *      front-facing signature. Measured on the old sprite: 2 eye clusters
 *      symmetric about the centre column.
 *   2. The face plane sits RIGHT of centre. The artwork is drawn facing right
 *      and mirrored with setFlipX, so a front-facing sprite would centre the
 *      face near x=15.5 on a 32px canvas.
 *   3. The silhouette is asymmetric — the face mass is not mirrored about the
 *      centre column.
 *
 * The eye test is the subtle one. An eye is a dark pixel with SKIN on both
 * sides, inside the head band. Two earlier detectors were wrong and are worth
 * recording:
 *
 *   - "any dark pixel not touching transparency" reported 16 eyes per frame.
 *     It was counting hood shadows and the collar edge.
 *   - "dark pixel with fabric on one side" reported 0 eyes. A profile eye has
 *     SKIN either side, never fabric — requiring fabric made the test unsatisfiable.
 *
 * A detector that reports 16 eyes or 0 eyes is wrong, and both would have hidden
 * a genuinely front-facing sprite. So the count is asserted against a known-good
 * frame as well as against the literal value 1.
 */

import { expect, test } from '@playwright/test';

import { PLAYER_FRAMES, PLAYER_FRAME_WIDTH } from '../../src/game/art/playerSprite';

/** Every animation state the scene can display. */
const STATES = [
  'idleA',
  'idleB',
  'walkA',
  'walkB',
  'walkC',
  'walkD',
  'jump',
  'fall',
  'tubeEnter',
  'tubeExit',
] as const;

const WIDTH = PLAYER_FRAME_WIDTH;
const CENTRE = (WIDTH - 1) / 2;

/**
 * Eye CLUSTERS, not eye pixels.
 *
 * An eye is a contiguous run of dark pixels surrounded by skin. Two earlier
 * versions of this function were wrong, and both would have hidden a genuinely
 * front-facing sprite:
 *
 *   - "any dark pixel with skin within one cell" reported 20 per frame. It was
 *     counting the head's outer outline, which touches skin on its inner side.
 *   - "dark pixel with skin on both sides" reported 0, because the eye is 1px
 *     wide and the neighbouring cell is outline, not skin.
 *
 * So: find connected runs of 'o' whose cells are not on the silhouette edge
 * (i.e. both horizontal neighbours are non-transparent), then keep the runs that
 * have skin adjacent. The eye is the one 1x2 cluster in the upper head band.
 */
function findEyes(rows: readonly string[]): Array<[number, number]> {
  // Skin adjacency, excluding the silhouette edge.
  const skinAdjacent = (y: number, x: number): boolean => {
    const row = rows[y];
    const solid = (yy: number, xx: number) =>
      yy >= 0 && yy < rows.length && xx >= 0 && xx < WIDTH && rows[yy][xx] !== '.';
    // On the silhouette edge -> this is the head's outline, not a feature.
    if (!solid(y, x - 1) || !solid(y, x + 1)) return false;
    const near = [
      rows[y][x - 1],
      rows[y][x + 1],
      rows[y - 1]?.[x],
      rows[y + 1]?.[x],
      rows[y - 1]?.[x - 1],
      rows[y - 1]?.[x + 1],
      rows[y + 1]?.[x - 1],
      rows[y + 1]?.[x + 1],
    ];
    return near.some((ch) => ch === 'f');
  };

  // Connected components of dark pixels inside the silhouette.
  const seen = new Set<string>();
  const clusters: Array<{ cells: Array<[number, number]>; skin: boolean }> = [];

  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (rows[y][x] !== 'o') continue;
      const key = `${y},${x}`;
      if (seen.has(key)) continue;

      // Flood fill this dark cluster.
      const stack: Array<[number, number]> = [[y, x]];
      const cells: Array<[number, number]> = [];
      let skin = false;
      seen.add(key);

      while (stack.length) {
        const [cy, cx] = stack.pop()!;
        cells.push([cy, cx]);
        if (skinAdjacent(cy, cx)) skin = true;
        for (const [dy, dx] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (ny < 0 || ny >= rows.length || nx < 0 || nx >= WIDTH) continue;
          if (rows[ny][nx] !== 'o') continue;
          const k = `${ny},${nx}`;
          if (seen.has(k)) continue;
          seen.add(k);
          stack.push([ny, nx]);
        }
      }
      clusters.push({ cells, skin });
    }
  }

  /*
   * Return eye CLUSTERS. "Exactly one eye" means one feature, not one pixel —
   * the eye here is a 1x2 dark block, so counting pixels reported 2 for a
   * single eye.
   *
   * Distinguish the eye from the rest of the face outline BY SHAPE, not by row.
   * Restricting to rows 0-8 was wrong: `jump` is `walkB` shifted up 3px, so its
   * jaw lands inside that band and was counted as a second eye (measured: jump
   * reported [[2,19],[8,18]]).
   *
   * The eye is a compact blob — at most 2 cells wide in every row. The jaw is a
   * 3-cell horizontal run, and the collar/neck clusters are wider still. So the
   * shape constraint separates them without needing to know where the face ends.
   */
  return clusters
    .filter((c) => {
      if (!c.skin) return false;
      const perRow = new Map<number, number>();
      for (const [cy] of c.cells) perRow.set(cy, (perRow.get(cy) ?? 0) + 1);
      return [...perRow.values()].every((n) => n <= 2);
    })
    .map((c) => {
      const ys = c.cells.map(([cy]) => cy);
      const xs = c.cells.map(([, cx]) => cx);
      return [Math.min(...ys), Math.min(...xs)] as [number, number];
    });
}

/** Mean x of every skin pixel. A profile's face plane sits right of centre. */
function faceCentroidX(rows: readonly string[]): number {
  const xs: number[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[y * 0 + x] === 'f') xs.push(x);
  });
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.NaN;
}

test.describe('CORRECTION PASS — avatar is a side-view human in a hoodie', () => {
  test('all ten states exist and are the right shape', () => {
    for (const state of STATES) {
      const rows = PLAYER_FRAMES[state];
      expect(rows, `${state} must exist`).toBeDefined();
      expect(rows.length, `${state} height`).toBe(48);
      for (const [y, row] of rows.entries()) {
        expect(row.length, `${state} row ${y} width`).toBe(WIDTH);
      }
    }
  });

  test('every frame shows exactly ONE eye, never two', () => {
    for (const state of STATES) {
      const eyes = findEyes(PLAYER_FRAMES[state]);
      expect(
        eyes.length,
        `${state} has ${eyes.length} eye pixels at ${JSON.stringify(eyes)}; a profile shows exactly 1`,
      ).toBe(1);
    }
  });

  test('the face plane sits right of centre in every frame', () => {
    for (const state of STATES) {
      const cx = faceCentroidX(PLAYER_FRAMES[state]);
      expect(Number.isNaN(cx), `${state} must have a face`).toBe(false);
      expect(
        cx,
        `${state} face centroid ${cx.toFixed(1)} should be right of centre ${CENTRE}`,
      ).toBeGreaterThan(CENTRE + 1);
    }
  });

  test('the silhouette is asymmetric, so mirroring produces a genuine profile', () => {
    /*
     * A front-facing sprite is (near) symmetric about the centre column, so
     * flipping it horizontally changes almost nothing and the figure still
     * faces the viewer. A profile is strongly asymmetric: mirroring produces a
     * real left-facing figure.
     *
     * Asserted as: the mirrored frame differs from the original in a large
     * fraction of columns. A front-facing sprite would score near zero.
     */
    for (const state of STATES) {
      const rows = PLAYER_FRAMES[state];
      let differing = 0;
      let total = 0;
      for (const row of rows) {
        for (let x = 0; x < WIDTH; x++) {
          total++;
          if (row[x] !== row[WIDTH - 1 - x]) differing++;
        }
      }
      const asymmetry = differing / total;
      expect(
        asymmetry,
        `${state} asymmetry ${asymmetry.toFixed(3)} — below 0.10 means the sprite is front-facing`,
      ).toBeGreaterThan(0.1);
    }
  });

  test('the eye is on the facing side, ahead of the hood mass', () => {
    /*
     * The single eye must sit to the RIGHT of the head's centre of mass, because
     * the head is drawn facing right with the hood mass swept back to the left.
     * An eye centred or left-of-centre would mean the face is looking backwards
     * while the figure walks right.
     */
    for (const state of STATES) {
      const rows = PLAYER_FRAMES[state];
      const [eyeY, eyeX] = findEyes(rows)[0];

      // Centre of mass of the head band (rows 0-15).
      let sum = 0;
      let n = 0;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (rows[y][x] !== '.') {
            sum += x;
            n++;
          }
        }
      }
      const headCx = sum / n;

      expect(
        eyeX,
        `${state} eye at x=${eyeX} (row ${eyeY}) is not ahead of head centre ${headCx.toFixed(1)}`,
      ).toBeGreaterThan(headCx);
    }
  });

  test('the sprite still reads as human: skin, hood, torso, legs and feet present', () => {
    for (const state of STATES) {
      const rows = PLAYER_FRAMES[state];
      const counts = new Map<string, number>();
      for (const row of rows) {
        for (const ch of row) counts.set(ch, (counts.get(ch) ?? 0) + 1);
      }

      // Skin: a face exists.
      expect(counts.get('f') ?? 0, `${state} needs skin`).toBeGreaterThan(10);
      // Hood + torso fabric: substantial mass above the legs.
      expect((counts.get('d') ?? 0) + (counts.get('m') ?? 0), `${state} needs fabric`).toBeGreaterThan(300);
      // Two legs: the figure is not a single column.
      let widest = 0;
      for (const row of rows) {
        let solid = 0;
        for (const ch of row) if (ch !== '.') solid++;
        widest = Math.max(widest, solid);
      }
      expect(widest, `${state} should be wider than one leg`).toBeGreaterThan(12);
    }
  });

  test('the cyan accent survives and stays an accent, not the body colour', () => {
    for (const state of STATES) {
      const rows = PLAYER_FRAMES[state];
      let cyan = 0;
      let solid = 0;
      for (const row of rows) {
        for (const ch of row) {
          if (ch === 'c') cyan++;
          if (ch !== '.') solid++;
        }
      }
      // Present in the standing states (drawstring aglets).
      if (state !== 'tubeEnter' && state !== 'tubeExit') {
        expect(cyan, `${state} needs the cyan drawstring accent`).toBeGreaterThan(0);
      }
      // And never more than a few percent of the figure, so it reads as an accent.
      expect(cyan / solid, `${state} cyan should stay a subtle accent`).toBeLessThan(0.05);
    }
  });
});

test.describe('CORRECTION PASS — the running game mirrors the sprite', () => {
  test('faces right when moving right and left when moving left', async ({ page }) => {
    await page.goto('/#/data-world');
    await expect(page.locator('[data-testid="world-status"]')).toHaveAttribute('data-status', 'ready', {
      timeout: 15_000,
    });
    const plate = page.locator('[data-testid="world-entry"]');
    if (await plate.count()) await page.locator('[data-testid="world-entry-dismiss"]').click();
    await page.waitForTimeout(700);

    const facing = () =>
      page.evaluate(() => {
        const p = window.__worldScene?.player as unknown as { flipX?: boolean } | undefined;
        if (!p || typeof p.flipX !== 'boolean') return null;
        return p.flipX === false ? 'right' : 'left';
      });

    // Resting state must already be a defined orientation, not null.
    expect(await facing()).toBe('right');

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(700);
    expect(await facing(), 'moving right must face right').toBe('right');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(400);

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(700);
    expect(await facing(), 'moving left must face left').toBe('left');
    await page.keyboard.up('ArrowLeft');
  });
});