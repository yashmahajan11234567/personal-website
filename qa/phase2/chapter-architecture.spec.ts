/*
 * STAGE C — chapter architecture: isolated chapters, no x-range inference.
 *
 * These assertions are about STRUCTURE, not pixels. The whole claim of this stage
 * is that a chapter that has not been travelled to does not exist, and that is
 * checkable without a canvas: if `chapterWorld` only ever returns one chapter's
 * geometry, and no station or platform can fall outside the chapter it belongs to,
 * then there is nothing for the renderer to leak.
 */
import { expect, test } from '@playwright/test';

/*
 * The config is pure data with no browser dependency, so it is imported directly
 * rather than read out of the page. That also means a failure here is a real
 * structural failure, not a timing artefact of the harness.
 */
import {
  DATA_WORLD,
  WORLD_CONFIGS,
  chapterViaPipe,
  chapterWorld,
  isPlayable,
  previousChapter,
} from '../../src/game/config/worldConfig';
// Namespace import alongside the named ones, to assert the removed exports are
// genuinely gone rather than merely unused.
import * as configModule from '../../src/game/config/worldConfig';
import type { ChapterId } from '../../src/game/config/worldConfig';

const CHAPTERS: ChapterId[] = DATA_WORLD.chapters.map((c) => c.id);

test.describe('STAGE C — chapter architecture', () => {
  test('exactly three chapters, in journey order', () => {
    expect(CHAPTERS).toEqual(['cliff', 'skills', 'projects']);
    expect(DATA_WORLD.entryChapter).toBe('cliff');
  });

  test('chapterAtX and x-range inference are gone', () => {
    expect('chapterAtX' in configModule).toBe(false);
    for (const chapter of DATA_WORLD.chapters) {
      expect('start' in chapter).toBe(false);
      expect('end' in chapter).toBe(false);
      // Each chapter declares a width and a spawn, not a slice of a shared world.
      expect(typeof chapter.width).toBe('number');
      expect(typeof chapter.spawn.x).toBe('number');
    }
  });

  test('the world config exposes no combined geometry', () => {
    // If any of these exist, some code path can reach all chapters at once.
    expect('stations' in DATA_WORLD).toBe(false);
    expect('pipes' in DATA_WORLD).toBe(false);
    expect('platforms' in DATA_WORLD).toBe(false);
    expect('spawn' in DATA_WORLD).toBe(false);
    expect('width' in DATA_WORLD).toBe(false);
  });

  test('each chapter builds alone, at its own width', () => {
    for (const id of CHAPTERS) {
      const built = chapterWorld(DATA_WORLD, id);
      const descriptor = DATA_WORLD.chapters.find((c) => c.id === id);
      expect(descriptor).toBeDefined();
      expect(built.chapter).toBe(id);
      expect(built.width).toBe(descriptor!.width);
      expect(built.spawn.x).toBeGreaterThanOrEqual(0);
      expect(built.spawn.x).toBeLessThan(built.width);
    }
  });

  test('the cliff has no stations; skills and projects carry their own', () => {
    expect(chapterWorld(DATA_WORLD, 'cliff').stations).toHaveLength(0);
    expect(chapterWorld(DATA_WORLD, 'skills').stations).toHaveLength(6);
    expect(chapterWorld(DATA_WORLD, 'projects').stations).toHaveLength(4);
  });

  test('no chapter contains another chapter\'s stations', () => {
    for (const id of CHAPTERS) {
      const foreign = chapterWorld(DATA_WORLD, id).stations.filter((s) => s.chapter !== id);
      expect(foreign, `${id} must not contain foreign stations`).toEqual([]);
    }
  });

  test('every station and platform sits inside its own chapter width', () => {
    for (const id of CHAPTERS) {
      const w = chapterWorld(DATA_WORLD, id);
      // A station past the right edge would be unreachable: the camera stops at
      // the chapter boundary, so it could never be walked to.
      for (const station of w.stations) {
        expect(station.x, `${id}/${station.id} x`).toBeGreaterThanOrEqual(0);
        expect(station.x, `${id}/${station.id} x`).toBeLessThan(w.width);
      }
      for (const platform of w.platforms) {
        expect(platform.x, `${id} platform x`).toBeGreaterThanOrEqual(0);
        expect(platform.x, `${id} platform x`).toBeLessThan(w.width);
      }
    }
  });

  test('no two stations in a chapter share a position', () => {
    // THE BUG THIS CATCHES: stations were laid out at a fixed pitch and any that
    // ran past the chapter's right edge were CLAMPED to the same x. Six skills in
    // a 760px chapter produced x = 230, 360, 490, 620, 620, 620 — three stations
    // stacked on each other, so half the chapter's content was unreachable. A
    // bounds check passes on stacked stations; only a uniqueness check fails.
    for (const id of CHAPTERS) {
      const xs = chapterWorld(DATA_WORLD, id).stations.map((s) => s.x);
      expect(new Set(xs).size, `${id} station x positions: ${xs.join(',')}`).toBe(xs.length);
    }
  });

  test('stations are spaced far enough apart to read', () => {
    // Below roughly 96px the station art and its name plate start to collide, and
    // two adjacent stations become ambiguous about which one is being approached.
    const MIN = 96;
    for (const id of CHAPTERS) {
      const xs = chapterWorld(DATA_WORLD, id).stations.map((s) => s.x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i] - xs[i - 1], `${id} gap between station ${i - 1} and ${i}`).toBeGreaterThanOrEqual(MIN);
      }
    }
  });

  test('stations clear both the entry pipe and the exit pipe', () => {
    for (const id of CHAPTERS) {
      const w = chapterWorld(DATA_WORLD, id);
      for (const station of w.stations) {
        // Standing on top of the entry pipe would re-trigger arrival immediately.
        expect(station.x - w.entryPipe.x, `${id}/${station.id} vs entry pipe`)
          .toBeGreaterThanOrEqual(80);
        if (w.exitPipe) {
          // A station on the exit pipe would be reached by walking into the pipe.
          expect(w.exitPipe.x - station.x, `${id}/${station.id} vs exit pipe`)
            .toBeGreaterThanOrEqual(80);
        }
      }
    }
  });

  test('chapters are separate coordinate spaces, not offsets', () => {
    // Each chapter's spawn is near ITS OWN left edge. If these were offsets into
    // one world, later chapters would spawn at large x values.
    for (const id of CHAPTERS) {
      const w = chapterWorld(DATA_WORLD, id);
      expect(w.spawn.x, `${id} spawn must be local, not a global offset`).toBeLessThan(w.width / 2);
    }
  });

  test('every chapter has an entry pipe and a clear spawn from it', () => {
    for (const id of CHAPTERS) {
      const w = chapterWorld(DATA_WORLD, id);
      expect(w.entryPipe, `${id} needs an entry pipe to emerge from`).toBeTruthy();
      // Drawn in the chapter, so it is there to be emerged from.
      expect(w.pipes.map((p) => p.id)).toContain(w.entryPipe.id);
      // Spawn clear of the mouth, or arrival re-triggers the pipe immediately.
      expect(w.spawn.x).toBeGreaterThan(w.entryPipe.x);
    }
  });

  test('only the terminal chapter lacks an exit', () => {
    expect(chapterWorld(DATA_WORLD, 'projects').exitPipe).toBeNull();
    expect(chapterWorld(DATA_WORLD, 'cliff').exitPipe).not.toBeNull();
    expect(chapterWorld(DATA_WORLD, 'skills').exitPipe).not.toBeNull();
  });

  test('exit pipes sit near the right edge, past the camera deadzone', () => {
    for (const id of CHAPTERS) {
      const w = chapterWorld(DATA_WORLD, id);
      if (!w.exitPipe) continue;
      // The player must walk to the pipe; a pipe visible on arrival defeats the
      // journey, and one at x<400 would still be on screen when the chapter loads.
      expect(w.exitPipe.x, `${id} exit pipe x`).toBeGreaterThan(w.width * 0.6);
      expect(w.exitPipe.x, `${id} exit pipe x`).toBeLessThan(w.width);
    }
  });

  test('all four required routes resolve', () => {
    // Forward uses the exit pipe; backward uses the pipe the player arrived by.
    const forward = (from: ChapterId, to: ChapterId) => {
      const w = chapterWorld(DATA_WORLD, from);
      expect(w.exitPipe, `${from} needs an exit to reach ${to}`).toBeTruthy();
      expect(w.exitPipe!.destination).toBe(to);
      expect(chapterViaPipe(DATA_WORLD, from, w.exitPipe!.id)).toBe(to);
    };
    const back = (from: ChapterId, to: ChapterId) => {
      const w = chapterWorld(DATA_WORLD, from);
      expect(previousChapter(DATA_WORLD, from)).toBe(to);
      expect(chapterViaPipe(DATA_WORLD, from, w.entryPipe.id)).toBe(to);
    };

    forward('cliff', 'skills'); // START -> SKILLS
    back('skills', 'cliff'); // SKILLS -> START
    forward('skills', 'projects'); // SKILLS -> PROJECTS
    back('projects', 'skills'); // PROJECTS -> SKILLS
  });

  test('no route is a one-way trap', () => {
    // Every chapter except the first can be left backwards, and every chapter
    // except the last can be left forwards.
    for (const id of CHAPTERS) {
      const prev = previousChapter(DATA_WORLD, id);
      const w = chapterWorld(DATA_WORLD, id);
      if (prev) {
        expect(chapterViaPipe(DATA_WORLD, id, w.entryPipe.id), `${id} must allow going back`).toBe(prev);
      }
      if (w.exitPipe) {
        expect(chapterViaPipe(DATA_WORLD, id, w.exitPipe.id), `${id} must allow going on`).toBeTruthy();
      }
    }
  });

  test('chapterWorld refuses an unknown chapter rather than returning nothing', () => {
    expect(() => chapterWorld(DATA_WORLD, 'nope' as ChapterId)).toThrow(/unknown chapter/);
  });

  test('Cloud World is still declared but unplayable', () => {
    expect(WORLD_CONFIGS.cloud).toBeDefined();
    expect(isPlayable('cloud')).toBe(false);
    expect(isPlayable('data')).toBe(true);
    // And it too is chapter-shaped, so shared code works against it unchanged.
    expect(WORLD_CONFIGS.cloud.chapters.length).toBeGreaterThan(0);
    expect(() => chapterWorld(WORLD_CONFIGS.cloud, 'cliff')).not.toThrow();
  });
});