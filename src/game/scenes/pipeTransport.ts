/**
 * The pipe transport — the world's chapter-transition mechanic.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * The brief requires that the same transport architecture later works for Cloud
 * World with a different visual skin, and that no Data-only architecture blocks
 * that reuse. Keeping the transport out of `WorldScene` is what makes that real
 * rather than aspirational: this module never imports world art, never reads
 * `WorldId`, and never branches on which world it is running in. It knows three
 * things — how to animate, how long to animate, and what the host must do at each
 * phase. Everything visual is passed in through the `PipeSkin` interface.
 *
 * THE TWELVE PHASES
 *
 * Travel is an explicit state machine, not a 0..1 progress value. The previous
 * version was `progress > 0.5` -> teleport, which is exactly the "it just
 * teleported" reading: the player stood visibly at the source pipe for most of the
 * run and then simply appeared somewhere else.
 *
 * The ordering below is the whole point, and it is a HARD GATE rather than a
 * preference:
 *
 *   approach  activate  entering  occluded  conduit  blackout
 *   build     position  reveal    emerging  settle    idle
 *
 *   1. approach   the player walks to the pipe under their own power.
 *   2. activate   the pipe is armed; input is captured.
 *   3. entering   the player is walked INTO the tube and shrinks behind the rim.
 *   4. occluded   the player is FULLY hidden. Done by the host, not assumed.
 *   5. conduit    the conduit rushes past -- the "travelling through" read.
 *   6. blackout   the screen goes fully opaque. Held, not merely reached.
 *   7. build      the destination chapter is CONSTRUCTED, behind the black.
 *   8. position   the destination camera is placed, still behind the black.
 *   9. reveal     the black lifts; the destination is seen for the first time.
 *  10. emerging   the player rises OUT of the destination tube.
 *  11. settle     pipe art returns to rest; input is released.
 *  12. idle       gameplay resumes.
 *
 * Phases 3 and 4 are what were missing before, and they are what make the player
 * visibly ENTER the tube rather than blink out of existence. Phase 7 is the second
 * hard gate: the destination does not exist until the screen is opaque, which is
 * only possible because chapters are standalone worlds built on demand.
 */

import type { ChapterId, ChapterWorld, PipeSkin, WorldPipe } from '../config/worldConfig';

/**
 * The twelve phases, in the order they must occur.
 *
 * Exported so a test can assert the sequence rather than trusting the
 * implementation to have kept it.
 */
export const TRANSPORT_PHASES = [
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
] as const;

export type TransportPhase = (typeof TRANSPORT_PHASES)[number];

/** The timed phases, in order. `approach` is the resting state before travel. */
const SEQUENCE = [
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
] as const satisfies TransportPhase[];

type TimedPhase = (typeof SEQUENCE)[number];

/** What the transport needs from whoever owns the visuals. */
export interface TransportSkin {
  /** The named skin this implementation draws. */
  readonly name: PipeSkin;
  /** Place the pipe's art in the world. Called once at build time. */
  draw: (pipe: WorldPipe) => void;
  /** Hide the pipe for the duration of the travel. */
  hide: () => void;
  /** Restore the pipe afterwards. */
  show: () => void;
  /** The conduit rush. `t` is 0..1 across the conduit phase. */
  conduit?: (t: number) => void;
  /** The conduit rush has ended. */
  conduitEnd?: () => void;
}

/** What the transport does to the player, resolved by the owner. */
export interface TransportHost {
  /** Freeze player input and physics for the duration. */
  lockPlayer: (locked: boolean) => void;
  /** Tell React which chapter is now current. */
  announceChapter: (chapter: ChapterId) => void;

  /**
   * Move the player for the two pipe-climb phases.
   *
   * Called with `t` so the host can shrink the sprite and slide it behind the
   * pipe's rim as it goes. This is a SHORT, VISIBLE movement -- to the pipe mouth
   * and back out of one -- never a jump across the world.
   */
  placePlayerForClimb: (x: number, y: number, t: number, climbing: 'in' | 'out') => void;

  /**
   * Make the player fully invisible, proving occlusion.
   *
   * Called on entry to `occluded` with `true`, and on `settle` with `false`. The
   * host is expected to do something observable, because the occlusion gate is the
   * single requirement this transport exists to satisfy.
   */
  occludePlayer: (occluded: boolean) => void;

  /** The screen goes fully opaque (`true`) or lifts (`false`). */
  setBlackout: (on: boolean) => void;

  /**
   * CONSTRUCT the destination chapter, while the screen is fully opaque.
   *
   * The only place a destination is ever built, so nothing about it can exist --
   * let alone be seen -- before this call.
   */
  buildDestination: (destination: ChapterId) => ChapterWorld;

  /** Place the destination camera, while still black. */
  positionDestinationCamera: (world: ChapterWorld) => void;

  /** Where the player stands in `world`, already built. */
  landingPointFor: (world: ChapterWorld) => { x: number; y: number };

  /** Restore the scene: pipe art, input, occluder. */
  onArrive: (from: WorldPipe, destination: ChapterId, world: ChapterWorld) => void;
}

/**
 * Per-phase durations in ms.
 *
 * `entering` and `emerging` are the longest because they are the phases that make
 * the travel legible. `blackout` exceeds the ~180ms the brief asks for, because the
 * destination is constructed in the phase immediately after it and the screen must
 * be opaque for the whole of that time.
 */
const PHASE_MS: Readonly<Record<TimedPhase, number>> = {
  activate: 200,
  entering: 640,
  occluded: 180,
  conduit: 520,
  blackout: 340,
  // Constructing and positioning are synchronous work, not animation. They get a
  // token 16ms each so a clock jump cannot skip them.
  build: 16,
  position: 16,
  reveal: 260,
  emerging: 640,
  settle: 220,
  idle: 16,
};

/*
 * Assert the phase constants and the sequence agree.
 *
 * A phase present in one and missing from the other is a silent no-op or a silent
 * hang, so it is checked at module load rather than left to a test nobody runs.
 */
(() => {
  const keys = Object.keys(PHASE_MS).sort();
  const seq = [...SEQUENCE].sort();
  if (keys.length !== seq.length || keys.some((k, i) => k !== seq[i])) {
    throw new Error(`pipeTransport: PHASE_MS keys [${keys}] do not match SEQUENCE [${seq}]`);
  }
})();

/** Every phase the transport entered this travel, in order. For assertions. */
export type PhaseLog = TransportPhase[];

/**
 * Drives one pipe transition.
 *
 * One instance per scene. It owns the timing and the phase ordering only -- not the
 * animation, not the player. That split is what keeps it reusable across worlds
 * and testable without a canvas.
 *
 * `erasableSyntaxOnly` is enabled in this project, so fields are assigned in the
 * constructor body rather than declared as constructor parameter properties.
 */
export class PipeTransport {
  private phase: TransportPhase = 'approach';

  /** The pipe currently being travelled, if any. */
  private current: WorldPipe | null = null;

  /**
   * The chapter this travel is heading for, resolved by the caller.
   *
   * Deliberately NOT derived from `pipe.destination`: an entry pipe's destination
   * is its own chapter, so deriving it would make reverse travel a no-op.
   */
  private destination: ChapterId = 'cliff';

  /** Timestamp the current phase started. */
  private phaseStartedAt = 0;

  /** Every phase entered this travel, in order. */
  private log: PhaseLog = [];

  /** The chapter built during `build`, kept for `position` and `landingPointFor`. */
  private destinationWorld: ChapterWorld | null = null;

  /** Latched once the destination exists, so `position` cannot precede `build`. */
  private destinationBuilt = false;

  /** Where the player stood when travel began, so `entering` interpolates from it. */
  private sourceX = 0;

  private sourceY = 0;

  private readonly scene: Phaser.Scene;

  private readonly host: TransportHost;

  private readonly skin: TransportSkin | null;

  /** Scoped to this engine instance; never static. */
  constructor(scene: Phaser.Scene, host: TransportHost, skin: TransportSkin | null) {
    this.scene = scene;
    this.host = host;
    this.skin = skin;
  }

  /**
   * True while a transition is running.
   *
   * `approach` and `idle` both count as "not travelling": `approach` is the resting
   * state before a pipe is taken, and `idle` is the resting state after arrival.
   */
  get isTravelling(): boolean {
    return this.phase !== 'approach' && this.phase !== 'idle';
  }

  /** The pipe currently in transit, if any. */
  get travellingPipe(): WorldPipe | null {
    return this.current;
  }

  /**
   * The phases entered so far, in order.
   *
   * Read by the transport tests to assert the sequence -- particularly that
   * `occluded` precedes `blackout`, and that `build` happens during `blackout`.
   */
  get phaseLog(): Readonly<PhaseLog> {
    return this.log;
  }

  /** The phase currently running. */
  get currentPhase(): TransportPhase {
    return this.phase;
  }

  /** True once the destination chapter has been constructed. */
  get destinationExists(): boolean {
    return this.destinationBuilt;
  }

  /**
   * Begin travelling through `pipe`.
   *
   * `destination` is passed EXPLICITLY rather than read from `pipe.destination`.
   * That field names the chapter a pipe leads into when it is an exit pipe, but an
   * entry pipe's `destination` is its OWN chapter — it is where the player arrived
   * from, not where they go. Reading it directly meant reverse travel rebuilt the
   * chapter the player was already standing in. The caller resolves the real
   * destination with `chapterViaPipe`, which understands both cases.
   *
   * `fromX`/`fromY` are the player's position, so `entering` interpolates from
   * where they actually stand to the pipe mouth rather than snapping.
   *
   * Returns false when a transition is already running, so a second trigger during
   * the first transition is ignored rather than queueing a second jump.
   */
  start(pipe: WorldPipe, destination: ChapterId, fromX: number, fromY: number): boolean {
    if (this.isTravelling) return false;

    this.phase = 'activate';
    this.current = pipe;
    this.destination = destination;
    this.phaseStartedAt = this.scene.time.now;
    this.log = ['approach', 'activate'];
    this.destinationWorld = null;
    this.destinationBuilt = false;
    this.sourceX = fromX;
    this.sourceY = fromY;

    // Freeze the player: input is ignored during travel and the physics body is
    // disabled so nothing can fall or drift.
    this.host.lockPlayer(true);
    this.skin?.hide();

    /*
     * The chapter is announced at the START, not on arrival.
     *
     * React's mirror must never describe a chapter the player is not in, and any
     * open panel must be dismissed before the world changes. This is display state
     * only -- the destination still does not exist as geometry.
     */
    this.host.announceChapter(destination);

    return true;
  }

  /**
   * Advance the transport. Call once per frame from the scene's `update`.
   *
   * Progress within a phase is derived from wall-clock time rather than
   * accumulated per frame, so a dropped frame shortens a phase instead of
   * stretching it.
   *
   * Phases advance ONE PER FRAME and never jump. That is what guarantees the
   * occlusion gate cannot be skipped: `blackout` cannot be entered until
   * `occluded` has run a full frame, and `build` cannot be entered until
   * `blackout` has. A stalled or wildly uneven clock shortens phases; it never
   * reorders them.
   */
  update(): void {
    if (!this.isTravelling || !this.current) return;

    const index = SEQUENCE.indexOf(this.phase as TimedPhase);
    if (index < 0) return;

    const elapsed = this.scene.time.now - this.phaseStartedAt;
    const duration = PHASE_MS[this.phase as TimedPhase];
    const t = duration > 0 ? Math.min(1, elapsed / duration) : 1;

    this.runPhase(this.phase, t);

    if (t < 1) return;

    const next = SEQUENCE[index + 1];
    if (!next) return;

    this.phase = next;
    this.phaseStartedAt = this.scene.time.now;
    this.log.push(next);
    /*
     * Entry work runs immediately on transition rather than on the next frame's
     * update. A 16ms phase could otherwise be entered and left within a single
     * slow frame, and a one-shot action like `build` would be skipped entirely.
     */
    this.enterPhase(next);
  }

  /** Run a phase's entry work immediately on transition into it. */
  private enterPhase(phase: TransportPhase): void {
    const pipe = this.current;
    if (!pipe) return;

    switch (phase) {
      case 'occluded':
        // The gate: the player is made invisible the instant this phase is entered.
        this.host.occludePlayer(true);
        break;
      case 'conduit':
        this.skin?.conduit?.(0);
        break;
      case 'blackout':
        this.host.setBlackout(true);
        break;
      case 'build': {
        this.destinationWorld = this.host.buildDestination(this.destination);
        this.destinationBuilt = true;
        break;
      }
      case 'position':
        if (!this.destinationBuilt) {
          throw new Error('pipeTransport: position reached before the destination was built');
        }
        this.host.positionDestinationCamera(this.destinationWorld!);
        break;
      case 'reveal':
        this.host.setBlackout(false);
        break;
      default:
        break;
    }
  }

  /** Run the per-frame work belonging to one phase at local progress `t`. */
  private runPhase(phase: TransportPhase, t: number): void {
    const pipe = this.current;
    if (!pipe) return;

    switch (phase) {
      /* ACTIVATE -- the pipe is armed. Nothing positional yet. */
      case 'activate':
        break;

      /*
       * ENTERING -- the player visibly walks into the tube.
       *
       * The player moves from where they actually stood to the pipe mouth over
       * 640ms, shrinking as they go. This is the phase whose absence made every
       * previous transition read as a teleport: the player was simply present in
       * one place and then present in another.
       */
      case 'entering': {
        const x = this.sourceX + (pipe.x - this.sourceX) * t;
        // Drop toward the mouth's ground line from wherever the player stood, so
        // the climb reads as descending into the pipe rather than sliding flat.
        const y = this.sourceY + (pipe.y - this.sourceY) * t;
        this.host.placePlayerForClimb(x, y, t, 'in');
        break;
      }

      /* OCCLUDED -- held. The player stays invisible for the whole phase. */
      case 'occluded':
        break;

      /* CONDUIT -- the rush. Purely visual. */
      case 'conduit':
        this.skin?.conduit?.(t);
        break;

      /* BLACKOUT -- held fully opaque for PHASE_MS.blackout. */
      case 'blackout':
        break;

      /* BUILD / POSITION / REVEAL -- entry work only, done in enterPhase. */
      case 'build':
      case 'position':
      case 'reveal':
        break;

      /*
       * EMERGING -- the player climbs OUT of the destination tube.
       *
       * Mirrors `entering` at the other end: the player rises from inside the
       * destination's entry pipe up to standing on the ground beside it.
       */
      case 'emerging': {
        const world = this.destinationWorld;
        if (!world) break;
        const landing = this.host.landingPointFor(world);
        const entry = world.entryPipe;
        const x = entry.x + (landing.x - entry.x) * t;
        const y = entry.y + (landing.y - entry.y) * t;
        this.host.placePlayerForClimb(x, y, t, 'out');
        break;
      }

      /* SETTLE -- restore the scene. */
      case 'settle':
        this.host.occludePlayer(false);
        this.skin?.conduitEnd?.();
        this.skin?.show();
        this.host.onArrive(pipe, this.destination, this.destinationWorld!);
        this.host.lockPlayer(false);
        break;

      /* IDLE -- the travel is over. */
      case 'idle':
        this.current = null;
        break;

      /* APPROACH is the pre-travel state and does no work. */
      case 'approach':
        break;
    }
  }

  /**
   * Abort any travel in progress.
   *
   * Used on scene shutdown: leaving mid-transition would otherwise keep the player
   * locked and frozen forever, since `update` will never run again.
   */
  cancel(): void {
    if (!this.isTravelling) return;
    /*
     * The screen and the occluder are restored unconditionally. A cancelled travel
     * may have passed `blackout`, and leaving the overlay up would black out
     * whatever world the player is returned to.
     */
    this.host.setBlackout(false);
    this.host.occludePlayer(false);
    this.skin?.conduitEnd?.();
    this.host.lockPlayer(false);
    this.phase = 'idle';
    this.current = null;
  }
}

/** Total travel time, derived from the phases so the two cannot disagree. */
export const TOTAL_TRAVEL_MS: number = SEQUENCE.reduce((sum, p) => sum + PHASE_MS[p], 0);
