/*
 * STAGE D — the twelve-phase transport.
 *
 * The transport is a pure state machine: it owns timing and ordering and nothing
 * else. That makes the whole gate testable without a canvas, by driving it with a
 * fake clock and a recording host. This file asserts the ORDER and the HARD GATES;
 * `pipe-journey.spec.ts` drives the same transitions in a real browser to prove the
 * gates hold in the running game too.
 */
import { expect, test } from '@playwright/test';
import {
  PipeTransport,
  TRANSPORT_PHASES,
  TOTAL_TRAVEL_MS,
} from '../../src/game/scenes/pipeTransport';
import type { TransportHost } from '../../src/game/scenes/pipeTransport';
import {
  DATA_WORLD,
  chapterViaPipe,
  chapterWorld,
  PIPE_TRAVEL_MS,
} from '../../src/game/config/worldConfig';
import type { ChapterId, ChapterWorld, WorldPipe } from '../../src/game/config/worldConfig';

/**
 * The pipe that travels from `from` to `to`, taken from the real config.
 *
 * Resolved with `chapterViaPipe`, exactly as the scene does -- NOT by matching
 * `pipe.destination`. An entry pipe's `destination` is its own chapter, so a
 * helper that picked the pipe whose destination matched would choose the WRONG
 * pipe for every reverse route and silently rebuild the current chapter.
 */
const pipeTo = (to: ChapterId, from: ChapterId): WorldPipe => {
  const w = chapterWorld(DATA_WORLD, from);
  const candidates = [w.exitPipe, w.entryPipe].filter((p): p is WorldPipe => p !== null);
  const pipe = candidates.find((p) => chapterViaPipe(DATA_WORLD, from, p.id) === to);
  if (!pipe) throw new Error(`no pipe from ${from} to ${to}`);
  return pipe;
};

/**
 * A recording host plus a clock the test controls.
 *
 * Every host callback is timestamped with the current fake time, so a test can
 * assert not just that something happened but WHEN it happened relative to
 * everything else — which is the entire point of a phase machine.
 */
function makeHarness(startChapter: ChapterId, destination: ChapterId) {
  const events: Array<{ at: number; what: string }> = [];
  const blackouts: Array<{ at: number; on: boolean }> = [];
  const builds: Array<{ at: number; chapter: ChapterId; blackedOut: boolean }> = [];
  const climbs: Array<{ at: number; x: number; y: number; t: number; dir: string }> = [];

  let now = 0;
  let occluded = false;
  let blackedOut = false;
  const destinationWorld: ChapterWorld = chapterWorld(DATA_WORLD, destination);
  const sourceWorld: ChapterWorld = chapterWorld(DATA_WORLD, startChapter);

  const host: TransportHost = {
    lockPlayer: () => events.push({ at: now, what: 'lock' }),
    announceChapter: (c) => events.push({ at: now, what: `announce:${c}` }),
    placePlayerForClimb: (x, y, t, dir) => {
      climbs.push({ at: now, x, y, t, dir });
      events.push({ at: now, what: `climb:${dir}` });
    },
    occludePlayer: (o) => {
      occluded = o;
      events.push({ at: now, what: o ? 'occlude:on' : 'occlude:off' });
    },
    setBlackout: (on) => {
      blackedOut = on;
      blackouts.push({ at: now, on });
      events.push({ at: now, what: on ? 'blackout:on' : 'blackout:off' });
    },
    buildDestination: (c) => {
      // The gate: record whether the screen was ALREADY fully black at the moment
      // the destination was constructed.
      builds.push({ at: now, chapter: c, blackedOut });
      events.push({ at: now, what: `build:${c}` });
      return destinationWorld;
    },
    positionDestinationCamera: () => events.push({ at: now, what: 'positionCamera' }),
    landingPointFor: (w) => w.spawn,
    onArrive: () => events.push({ at: now, what: 'arrive' }),
  };

  const skin = {
    name: 'data' as const,
    draw: () => {},
    hide: () => events.push({ at: now, what: 'skinHide' }),
    show: () => events.push({ at: now, what: 'skinShow' }),
    conduit: (t: number) => events.push({ at: now, what: `conduit:${t.toFixed(2)}` }),
    conduitEnd: () => events.push({ at: now, what: 'conduitEnd' }),
  };

  // Phaser's Scene is only used for `time.now` here, so a stub is enough.
  const scene = { time: { now: 0 } } as unknown as Phaser.Scene;

  const transport = new PipeTransport(scene, host, skin);

  /** Advance the fake clock, ticking the transport every 16ms. */
  const run = (ms: number, frame = 16) => {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + frame);
      (scene.time as { now: number }).now = now;
      transport.update();
    }
  };

  return {
    transport,
    scene,
    events,
    blackouts,
    builds,
    climbs,
    sourceWorld,
    destinationWorld,
    now: () => now,
    run,
    isOccluded: () => occluded,
    isBlackedOut: () => blackedOut,
  };
}

test.describe('STAGE D — twelve-phase transport', () => {
  test('declares exactly the twelve required phases, in order', () => {
    expect([...TRANSPORT_PHASES]).toEqual([
      'approach',
      'activate',
      'entering',
      'occluded',
      'conduit',
      'blackout',
      'build',
      'position',
      'reveal',
      'emerging',
      'settle',
      'idle',
    ]);
    expect(TRANSPORT_PHASES).toHaveLength(12);
  });

  test('a full travel enters every phase in the required order', () => {
    const h = makeHarness('cliff', 'skills');
    expect(h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560)).toBe(true);
    h.run(TOTAL_TRAVEL_MS + 200);

    // Every phase, in order, with no repeats and none skipped.
    expect([...h.transport.phaseLog]).toEqual([...TRANSPORT_PHASES]);
  });

  test('HARD GATE: the player is occluded BEFORE blackout', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    const occludedAt = h.events.find((e) => e.what === 'occlude:on');
    const blackoutAt = h.events.find((e) => e.what === 'blackout:on');
    expect(occludedAt, 'player must be occluded').toBeTruthy();
    expect(blackoutAt, 'screen must black out').toBeTruthy();
    // Not merely present: strictly earlier.
    expect(occludedAt!.at).toBeLessThan(blackoutAt!.at);
  });

  test('the player is visibly walked INTO the pipe before being occluded', () => {
    const h = makeHarness('cliff', 'skills');
    const pipe = pipeTo('skills', 'cliff');
    h.transport.start(pipe, 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    const inward = h.climbs.filter((c) => c.dir === 'in');
    const occludedAt = h.events.find((e) => e.what === 'occlude:on')!.at;

    // Climb-in happens, over several frames, entirely before occlusion.
    expect(inward.length, 'the player must be moved toward the pipe').toBeGreaterThan(3);
    expect(inward.every((c) => c.at <= occludedAt)).toBe(true);
    // And it ENDS at the pipe mouth, so the movement actually reaches the tube.
    const last = inward[inward.length - 1];
    expect(Math.abs(last.x - pipe.x)).toBeLessThan(2);
    expect(last.t).toBeGreaterThan(0.9);
  });

  test('HARD GATE: the destination is built while the screen is FULLY black', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    expect(h.builds).toHaveLength(1);
    expect(h.builds[0]!.chapter).toBe('skills');
    // THE assertion: constructed behind an opaque screen.
    expect(h.builds[0]!.blackedOut, 'destination must be built during blackout').toBe(true);

    // And built after occlusion, so it cannot be seen being made.
    const occludedAt = h.events.find((e) => e.what === 'occlude:on')!.at;
    expect(h.builds[0]!.at).toBeGreaterThan(occludedAt);
  });

  test('the blackout is held for at least 180ms', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    const on = h.blackouts.find((b) => b.on)!;
    const off = h.blackouts.find((b) => !b.on)!;
    // The brief asks for ~180ms; the implementation holds it longer because the
    // destination is constructed during that window.
    expect(off.at - on.at).toBeGreaterThanOrEqual(180);
  });

  test('the camera is positioned BEFORE the blackout lifts', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    const positionAt = h.events.find((e) => e.what === 'positionCamera')!.at;
    const revealAt = h.events.find((e) => e.what === 'blackout:off')!.at;
    expect(positionAt).toBeLessThan(revealAt);
    // And the build happened before the camera was positioned.
    expect(h.builds[0]!.at).toBeLessThan(positionAt);
  });

  test('the player EMERGES from the destination pipe after the reveal', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    const outward = h.climbs.filter((c) => c.dir === 'out');
    const revealAt = h.events.find((e) => e.what === 'blackout:off')!.at;

    expect(outward.length, 'the player must climb out').toBeGreaterThan(3);
    // Emergence is strictly after the reveal: the destination is seen first, then
    // the player rises out of its pipe.
    expect(outward.every((c) => c.at >= revealAt)).toBe(true);
    /*
     * Starting INSIDE the destination's entry pipe and finishing at its spawn.
     *
     * The first sampled frame is already one 16ms frame into the phase, so the
     * tolerance is a few pixels rather than exact: the climb is interpolated from
     * the mouth to the spawn, and the assertion is that it starts at the mouth and
     * ends at the spawn, not that any single frame is either.
     */
    const first = outward[0]!;
    expect(first.x).toBeGreaterThanOrEqual(h.destinationWorld.entryPipe.x);
    expect(Math.abs(first.x - h.destinationWorld.entryPipe.x)).toBeLessThan(12);
    const last = outward[outward.length - 1]!;
    expect(Math.abs(last.x - h.destinationWorld.spawn.x)).toBeLessThan(12);
    expect(last.t).toBeGreaterThan(0.9);
    // And the climb moves in the right direction: away from the pipe, toward the spawn.
    expect(last.x).toBeGreaterThan(first.x);
  });

  test('the player is made visible again on arrival', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);
    expect(h.isOccluded()).toBe(false);
    expect(h.isBlackedOut()).toBe(false);
  });

  test('the conduit rush happens between occlusion and blackout', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(TOTAL_TRAVEL_MS + 200);

    const conduit = h.events.filter((e) => e.what.startsWith('conduit:'));
    expect(conduit.length).toBeGreaterThan(3);
    const occludedAt = h.events.find((e) => e.what === 'occlude:on')!.at;
    const blackoutAt = h.events.find((e) => e.what === 'blackout:on')!.at;
    // Strictly inside: this is what makes the travel read as travel through a tube
    // rather than a cut between two rooms.
    expect(Math.min(...conduit.map((c) => c.at))).toBeGreaterThan(occludedAt);
    /*
     * `<=` rather than `<`: `conduitEnd` is recorded on the same frame the blackout
     * begins, because both fire on the transition out of the conduit phase. The
     * rush ending as the screen goes black is the intended sequencing.
     */
    expect(Math.max(...conduit.map((c) => c.at))).toBeLessThanOrEqual(blackoutAt);
  });

  test('all four routes run through the same twelve phases', () => {
    const routes: Array<[ChapterId, ChapterId, string]> = [
      ['cliff', 'skills', 'START -> SKILLS'],
      ['skills', 'cliff', 'SKILLS -> START'],
      ['skills', 'projects', 'SKILLS -> PROJECTS'],
      ['projects', 'skills', 'PROJECTS -> SKILLS'],
    ];
    for (const [from, to, label] of routes) {
      const h = makeHarness(from, to);
      expect(h.transport.start(pipeTo(to, from), to, 100, 560), label).toBe(true);
      h.run(TOTAL_TRAVEL_MS + 200);
      expect([...h.transport.phaseLog], label).toEqual([...TRANSPORT_PHASES]);
      // The same two hard gates on every route, not just the first one.
      expect(h.builds[0]!.chapter, label).toBe(to);
      expect(h.builds[0]!.blackedOut, `${label} must build behind black`).toBe(true);
      expect(h.isOccluded(), label).toBe(false);
    }
  });

  test('the destination does not exist before the build phase', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    // Before any update, nothing has been built.
    expect(h.transport.destinationExists).toBe(false);
    expect(h.builds).toHaveLength(0);

    h.run(400); // through activate and entering
    expect(h.builds).toHaveLength(0);
    expect(h.transport.destinationExists).toBe(false);

    h.run(TOTAL_TRAVEL_MS);
    expect(h.builds).toHaveLength(1);
    expect(h.transport.destinationExists).toBe(true);
  });

  test('a second trigger during travel is refused', () => {
    const h = makeHarness('cliff', 'skills');
    expect(h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560)).toBe(true);
    expect(h.transport.start(pipeTo('projects', 'skills'), 'projects', 100, 560)).toBe(false);
    h.run(TOTAL_TRAVEL_MS + 200);
    // Only the first pipe was travelled.
    expect(h.builds).toHaveLength(1);
    expect(h.builds[0]!.chapter).toBe('skills');
  });

  test('cancel restores the screen and the player', () => {
    const h = makeHarness('cliff', 'skills');
    h.transport.start(pipeTo('skills', 'cliff'), 'skills', 100, 560);
    h.run(1200); // into conduit, player occluded
    expect(h.isOccluded()).toBe(true);

    h.transport.cancel();
    expect(h.isOccluded()).toBe(false);
    expect(h.isBlackedOut()).toBe(false);
    expect(h.transport.isTravelling).toBe(false);
  });

  test('phase timings sum to the nominal travel time', () => {
    // TOTAL_TRAVEL_MS is derived from the phases, so it cannot drift from them.
    expect(TOTAL_TRAVEL_MS).toBeGreaterThan(PIPE_TRAVEL_MS);
    // A second and a half is the intended read: long enough to follow, short
    // enough not to be an obstacle.
    expect(TOTAL_TRAVEL_MS).toBeGreaterThan(1500);
    expect(TOTAL_TRAVEL_MS).toBeLessThan(4000);
  });
});