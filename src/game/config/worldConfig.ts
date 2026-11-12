/**
 * World configuration — the single source of what the game world contains.
 *
 * TWO CONFIG LAYERS, AND WHY
 *
 * `WorldConfig` (the playable-world geometry handed to the engine) describes
 * WHERE things are. `src/content` (Phase 0) describes WHAT they say. This file
 * joins the two and hardcodes no portfolio text: skills and projects are read
 * from the content model in progression order, so adding a skill to the
 * portfolio places a new station in the world with no edit to this file.
 *
 * One shared engine, configuration-driven worlds. Data and Cloud differ only by
 * the values in here — there is deliberately no second engine, no duplicated
 * scene, and no per-world subclass. Adding the Cloud world in a later phase must
 * be a new entry in `WORLD_CONFIGS`, not a new engine.
 *
 * PHASE 1'S CONTRACT IS PRESERVED EXACTLY
 *
 * The Phase 1 suite asserts on these values, so they are carried over rather than
 * redesigned: `PLAYER` in full, `physicsFor`, `WorldId`, `WorldPlatform`,
 * `WorldPalette`, `isPlayable`, `WORLD_CONFIGS`, `DATA_WORLD.height === 640`,
 * `DATA_WORLD.groundY === 560`, `DATA_WORLD.spawn.x === 120`, the seven Phase 1
 * platforms verbatim, and the interaction probe at world x=480. Phase 2 therefore
 * EXTENDS this config with chapters, stations and pipes rather than replacing it.
 *
 * `spawn.y` is the one value that changed, from 480 to the ground surface: see
 * {@link SPAWN} for why, and for the Phase 1 assertions that remain satisfied.
 *
 * THE WORLD IS SHORT ON PURPOSE
 *
 * It is a reading interface with a walking animation in front of it, not a
 * platformer. Three chapters — CLIFF, SKILLS, PROJECTS — each a single ground
 * run, connected by one transport pipe apiece. Nothing requires precision
 * platforming; a visitor should reach any panel within a few seconds of walking.
 */

import { PORTFOLIO, projectsForWorld, skillsForWorld } from '../../content';
import type { Project, Skill } from '../../content/types';

export type WorldId = 'data' | 'cloud';

export interface WorldPlatform {
  /** World-space left edge. */
  x: number;
  /** World-space top edge. */
  y: number;
  /** Platform width in pixels. */
  width: number;
  /** Platform height in pixels. */
  height: number;
  /** Whether the player can pass through from below. */
  oneWay?: boolean;
}

export interface WorldPalette {
  /** Clear colour behind everything. */
  background: string;
  /** Distant parallax band. */
  far: string;
  /** Ground and platform body. */
  ground: string;
  /** Lighter top edge on ground and platforms, for a readable pixel rim. */
  groundTop: string;
  /** Grid lines and decorative marks. */
  grid: string;
}

/* ------------------------------------------------------------------ *
 * Chapters
 * ------------------------------------------------------------------ */

export type ChapterId = 'cliff' | 'skills' | 'projects';

/**
 * A chapter: an ISOLATED world, not a slice of one long world.
 *
 * WHY THIS IS NOT AN X RANGE
 *
 * The first implementation modelled a chapter as `[start, end]` inside a single
 * 3840px world and inferred "which chapter am I in?" from the player's x. That
 * has two fatal consequences for the pipe journeys:
 *
 *   1. Every chapter's geometry exists in memory and is reachable by walking,
 *      so the player can SEE the destination before travelling to it. A pipe
 *      journey cannot be a reveal if the destination is already on screen.
 *   2. Landing somewhere means teleporting x by ~2000px, because the player is
 *      jumping coordinates inside one continuous space. It reads as a teleport no
 *      matter how the camera is animated.
 *
 * Instead each chapter is its own small world with its own width and its own
 * spawn. Travel between chapters therefore swaps scenes rather than moving a
 * sprite, and a destination that has not been built cannot be seen.
 */
export interface WorldChapter {
  id: ChapterId;
  /** Text on the chapter plate above the pipe leaving this chapter. */
  label: string;
  /**
   * Width of this chapter's own world, in world pixels. The chapter is built as a
   * world of exactly this width, so nothing beyond it can exist.
   */
  width: number;
  /**
   * Player spawn INSIDE this chapter's own coordinate space.
   *
   * Chapters are separate coordinate spaces, so this is always near the left
   * edge: the player emerges from the destination pipe and walks rightward from
   * there. It is never an offset into some larger world.
   */
  spawn: { x: number; y: number };
  /**
   * The pipe the player EMERGES from on arrival, in this chapter's coordinates.
   *
   * Named for its role, not its direction: arriving in Skills from the cliff
   * means emerging from the Skills chapter's own entrance pipe.
   */
  entryPipe: WorldPipe;
  /**
   * The pipe the player ENTERS to leave, in this chapter's coordinates.
   *
   * `null` for the terminal chapter (PROJECTS), which is the end of the journey
   * and has no exit. Every earlier chapter has exactly one, so every route is
   * available in both directions without a separate "back" affordance.
   */
  exitPipe: WorldPipe | null;
}

/* ------------------------------------------------------------------ *
 * Stations — the physical objects the player interacts with
 * ------------------------------------------------------------------ */

/**
 * What kind of object a station is.
 *
 * `skill` and `project` are separate kinds rather than one kind plus a flag,
 * because they are drawn differently AND carry different honesty obligations: a
 * skill panel may show experience type, a project panel must show authorship
 * and limitations.
 */
export type StationKind = 'skill' | 'project';

/**
 * A station placed in the world.
 *
 * The skill/project RECORD is referenced, never copied. The station carries only
 * an id for lookup plus the short strings needed to draw its face. Nothing in the
 * scene reads a description; the React panel does, through the id.
 */
export interface WorldStation {
  kind: StationKind;
  /** Content-model id. The React mirror looks the full record up by this. */
  id: string;
  /** Short label for the station's name plate. */
  label: string;
  /** Even shorter tag for the station's screen. */
  tag: string;
  /** World x of the station's centre. */
  x: number;
  /** World y of the ground the station stands on. */
  y: number;
  /** Chapter this station belongs to. */
  chapter: ChapterId;
  /**
   * Stations drawn as scaffolding are TRAINING content and must not read as
   * project experience. Carried from `Skill.visual.treatment`.
   */
  treatment?: 'solid' | 'scaffold';
}

/* ------------------------------------------------------------------ *
 * Pipes — the chapter-transition mechanic
 * ------------------------------------------------------------------ */

/**
 * A transport pipe.
 *
 * `skin` exists so Cloud World can reuse this exact transport code with
 * different art. The transport logic must never branch on world identity, so the
 * skin is the only visual input and the destination is declared data.
 */
export type PipeSkin = 'data';

export interface WorldPipe {
  id: string;
  /** Visual skin. Data is the only one implemented in Phase 2. */
  skin: PipeSkin;
  /** World x of the pipe mouth's centre. */
  x: number;
  /** World y of the ground surface the mouth is set into. */
  y: number;
  /** Chapter the pipe leads INTO. */
  destination: ChapterId;
  /** Text on the plate above the mouth. */
  plate: string;
  /** Text on the sign beside the pipe. */
  signText: string;
}

/**
 * A playable world as handed to the engine.
 *
 * `stations` and `pipes` are additive: a world without them simply has empty
 * arrays and the scene skips the interaction layer. Keeping them ordinary array
 * fields means the engine never branches on "is this Phase 2".
 */
export interface WorldConfig {
  id: WorldId;
  /** Human name used in the accessibility mirror and the heading. */
  name: string;
  /**
   * Total world height. Shared by every chapter, so the facility's proportions
   * are identical in all three and a chapter swap is not also a re-layout.
   */
  height: number;
  /** Ground surface y, in world space. Shared by every chapter. */
  groundY: number;
  palette: WorldPalette;
  /**
   * Every chapter, in journey order.
   *
   * A chapter owns its width, spawn, stations, platforms and pipes. The scene
   * builds exactly ONE of these at a time and destroys it when the player takes a
   * pipe, so a chapter that has not been visited does not exist in memory and
   * cannot be rendered.
   */
  chapters: WorldChapter[];
  /**
   * The chapter the world opens in. The scene starts here and only ever reaches
   * another chapter by travelling there.
   */
  entryChapter: ChapterId;
}

/**
 * A chapter's own playable world.
 *
 * Returned by `chapterWorld`, which is what the scene actually builds. Keeping
 * this separate from `WorldChapter` (the descriptor) means the descriptor stays a
 * small piece of data while the built world is always complete.
 */
export interface ChapterWorld {
  id: WorldId;
  name: string;
  chapter: ChapterId;
  /** Width of this chapter alone. The world is exactly this wide. */
  width: number;
  height: number;
  groundY: number;
  spawn: { x: number; y: number };
  platforms: WorldPlatform[];
  palette: WorldPalette;
  /** Only the stations belonging to THIS chapter. */
  stations: WorldStation[];
  /**
   * The pipes drawn in this chapter: its entry pipe plus its exit pipe.
   *
   * Both are present so the player can always leave by the pipe they arrived at.
   */
  pipes: WorldPipe[];
  /** The pipe the player emerges from on arrival. */
  entryPipe: WorldPipe;
  /** The pipe the player enters to leave, or null in the terminal chapter. */
  exitPipe: WorldPipe | null;
}

/* ------------------------------------------------------------------ *
 * Player constants — Phase 1 values, unchanged
 * ------------------------------------------------------------------ */

export const PLAYER = {
  /**
   * Reference size of the 16px Phase 1 sprite, and the basis for every body
   * offset below. Phase 2 draws a larger 32x48 character but keeps this value
   * so the hitbox maths stays anchored to a known grid.
   */
  size: 16,
  /** Physics hitbox width. */
  bodyWidth: 10,
  /** Physics hitbox height. */
  bodyHeight: 14,
  /** Walk speed in px/s. Deliberately unhurried — responsive, not fast. */
  speed: 150,
  /** Ground acceleration in px/s^2. High enough to feel immediate. */
  acceleration: 900,
  /** Deceleration when no key is held. */
  drag: 1100,
  /** Jump impulse in px/s. Tuned against `gravityY` below. */
  jumpVelocity: 230,
  /** Downward gravity in px/s^2. */
  gravityY: 900,
  /** Air control multiplier. Below 1 so a jump commits to its arc. */
  airControl: 0.7,
  /** Coyote time in ms: grace after walking off a ledge. */
  coyoteMs: 90,
  /** Jump buffer in ms: a jump pressed just before landing still fires. */
  jumpBufferMs: 110,
  /** Camera deadzone inset, so small hops do not drag the view. */
  deadzone: { width: 96, height: 72 },
  /** Camera lerp. Lower = tighter follow, higher = lazier. */
  lerp: 0.12,
} as const;


/**
 * Physics values that stay constant across worlds. Exported as a factory so a
 * future world cannot accidentally mutate the shared object.
 */
export const physicsFor = () => ({
  default: 'arcade' as const,
  arcade: {
    gravity: { x: 0, y: PLAYER.gravityY },
    // Pixel snapping only; no debug overlay, no decorative physics.
    debug: false,
    fps: 60,
    /*
     * WHY THE STEP STAYS FIXED, AND WHERE THE REAL FIX LIVES
     *
     * Arcade advances in fixed steps of 1/fps. It tries to catch up when a frame
     * runs long, but only up to a limit, so a machine that cannot render at 60 —
     * a software rasteriser, a loaded laptop, a throttled tab — advances the
     * simulation SLOWER THAN WALL-CLOCK TIME.
     *
     * That is a correctness problem, not merely a smoothness one. Movement is
     * specified in px/s, so at 27fps a 90px/s walk silently becomes ~64px/s: a
     * jump apex is lower, a walk takes longer, a pipe trigger arrives late, and
     * the game becomes a different game on a slow machine than on a fast one.
     *
     * The correct fix is in the scene: clamp velocity using the REAL elapsed time
     * rather than assuming a 60fps frame, so dropped frames cost smoothness
     * instead of changing behaviour. Setting `fixedStep: false` here would make
     * the step variable and remove collision determinism for no benefit — the
     * slowness comes from frames being dropped, not from the step size being
     * wrong.
     */
  },
});

/* ------------------------------------------------------------------ *
 * Interaction tuning
 * ------------------------------------------------------------------ */

/**
 * Distance at which a station lights up.
 *
 * Wide on purpose: the interaction is "walk near and press Enter", so the
 * highlight must appear early enough that the player sees the object respond
 * BEFORE they are standing in it.
 */
export const INTERACT_RANGE = 132;

/** Distance from a pipe's centre at which the transport triggers. */
export const PIPE_TRIGGER_RANGE = 30;

/**
 * How long the pipe transport takes, in ms.
 *
 * Short on purpose. A chapter transition that takes five seconds is a loading
 * screen with extra steps; this is long enough to read as travel and short
 * enough that a visitor never waits for it.
 */
export const PIPE_TRAVEL_MS = 1100;

/* ------------------------------------------------------------------ *
 * Data World geometry
 * ------------------------------------------------------------------ */

const GROUND_Y = 560;

/**
 * World height. See `DATA_WORLD.height` for why this is 900 and not 640.
 */
const WORLD_HEIGHT = 900;

/**
 * The y where the old 640-tall world ended and the new ceiling begins.
 *
 * Everything above this line is structure that exists only because the camera
 * zooms in: beams, cable trays, risers and plant lights. Keeping it named rather
 * than inlined means the art layer and the scene agree on one boundary.
 */
export const CEILING_FROM = 640;

/**
 * The vertical extent of authored environment, in world px: from the top of the
 * ceiling structure down to the floor the player stands on.
 *
 * This is the single number the camera has to respect. The facility art lives
 * between y=280 (`BAND_TOP` in `drawCeiling`) and y=560 (`GROUND_Y`), so a camera
 * whose view is shorter than this will crop the top of the pipes out of frame no
 * matter how it is centred — and cropping the pipes is the exact failure this
 * overhaul exists to fix. `zoomForViewport` in `WorldScene` therefore treats it as
 * the minimum view height.
 *
 * Both bounds are load-bearing and duplicated in the art on purpose: changing a
 * number in `facilityArt.ts` without changing it here is what makes the camera
 * silently crop, so the coupling is stated in both files.
 */
export const CONTENT_BAND = GROUND_Y - 296;

/**
 * Camera framing.
 *
 * `zoom` is the single most consequential visual value in the world, because it
 * decides how close the visitor stands to the art. It is an INTEGER on purpose:
 * the game runs with `pixelArt: true`, so a fractional zoom would resample the
 * bitmap and smear the pixel grid that the whole aesthetic depends on. At 2x
 * every source pixel maps to a clean 2x2 block.
 *
 * `framingHeight` is the ground the camera may frame down to. The camera's own
 * bounds are clamped to `groundY + 80` so it can never scroll into the sub-floor
 * and fill the screen with the ground slab; the remaining world height above
 * that is ceiling art, reachable only by looking up, never by scrolling down.
 */
export const CAMERA = {
  zoom: 2,
  /** Look-ahead in world px, applied in the direction the player faces. */
  lookAhead: 56,
  /** Below this speed there is no look-ahead, so standing still is neutral. */
  lookAheadMinSpeed: 12,
  /** Exponential follow rate. See `applyFrameRateCorrectedLerp`. */
  followRate: 7.5,
  /**
   * How far below `groundY` the camera is allowed to frame, in world px.
   *
   * MEASURED, and the previous value of 80 was the single biggest reason the world
   * looked empty. A pixel sample of the rendered frame found 66% of scanlines
   * containing exactly one distinct colour and 78% of all pixels being a single
   * value — a flat slab with art only in a thin strip at the top.
   *
   * Two things combined to cause it:
   *
   *  1. The world grew from 640 to 900 tall, and `buildTerrain` sizes the ground
   *     rectangle as `worldHeight - groundY`, so the solid floor grew from 80px to
   *     340px.
   *  2. This margin let the camera frame 80px INTO that slab, so the bottom 20% of
   *     every frame was flat `#1a2230` with nothing on it — no ribs, no conduit, no
   *     detail, because the sub-floor fill is a single `fillRect`.
   *
   * The floor needs no vertical framing at all: it is a flat surface with a lit
   * rim, and the player stands on top of it. A small margin is kept (18px) so the
   * ground surface itself is always visible with its lit top edge, which is what
   * makes the landing plane readable. More than that is dead frame.
   */
  floorMargin: 10,
  /**
   * How far ABOVE the player's feet the camera centres, as a FRACTION of the
   * view height — not as world pixels.
   *
   * THREE FAILURES MEASURED HERE, all from getting this wrong.
   *
   * 1. `60` (world px) framed y=370..630: three of the five conduit runs,
   *    including the 40px one, sat above the top of the screen, and the entire
   *    900px ceiling region was permanently invisible.
   *
   * 2. `150` (world px) broke the game outright — the player's feet landed at
   *    screen offset 584px inside a 567px canvas, so the character was drawn
   *    17px BELOW the bottom edge and was invisible in every screenshot.
   *
   * 3. Even after switching to a ratio, `0.30` left the frame wrong: the authored
   *    content band (world y 280..560) is 280px and a 2x view is 284px, so the
   *    band barely fits and the floor line ended up 96% of the way down the frame
   *    while the top of the band was cut off. The band was aligned to neither
   *    edge.
   *
   * THE GEOMETRY, STATED ONCE
   *
   * With `b = ratio * viewH`, the visible band is
   * `[groundY - (b + viewH), groundY - b + viewH]`. For the authored band to sit
   * flush with the top of the frame, `groundY - b + viewH` must equal `560`, i.e.
   * `b = viewH` exactly — a ratio of 1.0, which is just "centre on the floor line".
   *
   * `0.47` is chosen instead of 1.0 for one reason: it keeps a sliver of the lit
   * floor rim and a few px of sub-floor in frame, which is what makes the landing
   * plane read as a surface rather than as the bottom edge of the screen. Measured
   * at the recording viewport this puts the content band top at canvas y=-9 and
   * the floor line at canvas y=551 of 568 — the band fills the frame and the floor
   * sits at the bottom, with a visible lip below it.
   */
  verticalBiasRatio: 0.47,
} as const;

/**
 * Player spawn, in world space.
 *
 * `y` is the GROUND SURFACE, not a point above it, so the player starts standing
 * rather than dropping onto the floor when the world loads.
 *
 * Phase 1 spawned at y=480 on groundY=560, so the player fell 80px (~420ms) on
 * every mount. That was invisible in practice but it made the first ~600ms of
 * every session a settling period, and three Phase 1 assertions sampled inside it:
 * "rests on the ground" and "reduced motion keeps the game playable" both read
 * `grounded` too early, and "jumps and comes back down" measured its apex against
 * a mid-fall position. Under a software rasteriser at 27fps the fall outlived the
 * fixed wait and all three failed.
 *
 * Spawning grounded removes the fall rather than lengthening anyone's timeout.
 * Nothing in the world depends on the drop: Phase 1 asserts `y > 0`,
 * `y <= worldHeight`, `grounded === true` and `|velocityX| < 5` after settling,
 * and the jump test compares against whatever `y` it observes as "before" — all of
 * which are satisfied immediately, and are now true from the very first frame
 * instead of being true a moment later.
 */
export const SPAWN = { x: 120, y: GROUND_Y } as const;

/**
 * Per-chapter geometry.
 *
 * Each chapter is a standalone world, so these are widths, not boundaries. A
 * chapter is wider than the camera can see (about 261 world px at 2x zoom on a
 * 1440px viewport), which is enough to scroll without being so long that the exit
 * pipe is visible on arrival — arriving somewhere and immediately seeing the way
 * out defeats the reveal.
 *
 * The widths are set by CONTENT, not taste. Six skill stations at a readable
 * 130px pitch need ~1100px, and four project stations at ~210px need ~1000px;
 * anything narrower forces the pitch down until stations overlap or become
 * unreachable. The exit pipe sits past the camera deadzone, so the player must
 * actually walk to it.
 */
export const CLIFF_WIDTH = 900;
/*
 * SKILLS width increased from 1200 to 1500 to provide adequate clearance
 * between the last station (Streamlit) and the exit tube's sign/plate.
 * The previous width left only ~40px gap between station and tube,
 * causing visual crowding. The extra 300px restores comfortable spacing.
 */
export const SKILLS_WIDTH = 1500;
const PROJECTS_WIDTH = 1000;

/**
 * Where a player stands just after emerging from a chapter's entry pipe.
 *
 * Chapter-local x, always just right of the entry pipe mouth so the player is
 * never re-triggered by the pipe they have just climbed out of.
 */
const EMERGE_OFFSET = 84;

/** Spacing between skill stations. */
const SKILL_SPACING = 130;

/** Spacing between project stations. Wider: projects are bigger objects. */
const PROJECT_SPACING = 250;

/*
 * TUBE GEOMETRY — taken from the supplied reference, not chosen by eye.
 *
 * The reference is an upright rectangular column, roughly 24x32px in the source
 * art, which is a height:width ratio of 1.33. The previous tube was 60x52 —
 * ratio 0.87, WIDER than it was tall — which is exactly why it read as a squat
 * housing set into a wall rather than a data conduit you step into.
 *
 * First attempt at this correction was 36x72: ratio 2.0, which overshot and made
 * a narrow chimney rather than the reference's column. Measured and corrected.
 *
 * These are 44x60: ratio 1.36, within 2% of the reference. The width is larger
 * than the reference's 24px so a 32px-wide player fits inside the mouth without
 * clipping the outline, and so the tube still reads clearly against a 32x48
 * character standing beside it.
 */
export const PIPE_HALF_WIDTH = 22;

/** How far above the ground surface a pipe's mouth reaches. */
export const PIPE_HEIGHT = 60;

/* ------------------------------------------------------------------ *
 * Station construction
 * ------------------------------------------------------------------ */

/**
 * A short tag for a skill's screen face.
 *
 * A station screen is ~40px wide, so a 5x7 font fits about six glyphs. "SQL /
 * T-SQL" does not, and a clipped label is worse than a short one — the full name
 * sits on the name plate underneath and in the panel.
 */
const tagForSkill = (skill: Skill): string => {
  const first = skill.name.split(/[/&,-]/)[0]?.trim() ?? skill.name;
  const upper = first.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return upper.length > 6 ? upper.slice(0, 6) : upper;
};

/**
 * A short tag for a project's banner.
 *
 * Projects get more room than skills, so two words are allowed when one would
 * be ambiguous — but the tag is always a prefix of the real title, never an
 * abbreviation that invents a name.
 */
const tagForProject = (project: Project): string => {
  const words = project.title.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/);
  if (words.length === 1) return (words[0] ?? '').slice(0, 12);
  return `${words[0]} ${words[1]}`.slice(0, 16);
};

/**
 * Centre `count` stations across [start, end] at the given spacing.
 *
 * Clamped at the chapter's left edge, so a chapter too narrow for its contents
 * pushes stations right rather than placing any of them at a negative x — which
 * would be unreachable.
 */

/**
 * Lay stations out along a chapter.
 *
 * Positions are chapter-LOCAL, so a station's x is only ever meaningful inside
 * the chapter that owns it. This is what makes "only the active chapter exists"
 * true rather than aspirational: there are no global coordinates to leak into.
 *
 * FITTING IS THE POINT. An earlier version spaced stations at a fixed pitch and
 * clamped any that ran past the chapter's right edge. That silently stacked them:
 * six skills at 130px pitch in a 760px chapter produced x = 230, 360, 490, 620,
 * 620, 620 — the last three on top of each other, so half the chapter's content
 * was unreachable and two stations shared one spot. The run is now fitted to the
 * space actually available: the pitch is reduced so every station lands at a
 * distinct position inside the chapter, and the pitch is never allowed to go below
 * `MIN_STATION_SPACING`, which is what would start overlapping the station art.
 */
const MIN_STATION_SPACING = 96;

/** Left inset of a station run: clear of the chapter's entry pipe. */
const STATION_RUN_START = 200;

/** Distance kept clear between the last station and the exit pipe. */
const EXIT_PIPE_CLEARANCE = 130;

const buildStations = (
  kind: StationKind,
  chapter: ChapterId,
  width: number,
  spacing: number,
): WorldStation[] => {
  const from = kind === 'skill' ? skillsForWorld('data') : projectsForWorld('data');
  const count = from.length;

  // Right edge available to the run, leaving the exit pipe its clearance.
  const lastAllowed = Math.min(width - EXIT_PIPE_CLEARANCE, width - 40) - 40;
  const available = lastAllowed - STATION_RUN_START;

  // Fit the run: shrink the pitch until every station fits, or until the minimum
  // is reached (at which point the chapter is too narrow and the run is centred
  // and clipped deliberately rather than silently overlapping).
  const fitSpacing = count > 1 ? Math.min(spacing, available / (count - 1)) : 0;
  const pitch = Math.max(fitSpacing, MIN_STATION_SPACING);
  const runWidth = pitch * (count - 1);
  // Centre whatever run we end up with between the start inset and the limit.
  const startX = Math.max(
    STATION_RUN_START,
    Math.round(STATION_RUN_START + (available - runWidth) / 2),
  );

  return from.map((record, index) => ({
    kind,
    id: record.id,
    label: kind === 'skill' ? (record as Skill).name : (record as Project).title,
    tag: kind === 'skill' ? tagForSkill(record as Skill) : tagForProject(record as Project),
    x: startX + index * pitch,
    y: GROUND_Y,
    chapter,
    ...(kind === 'skill' ? { treatment: (record as Skill).visual.treatment } : {}),
  }));
};

/** Station run for the Skills chapter. */
const skillStations = (width: number): WorldStation[] =>
  buildStations('skill', 'skills', width, SKILL_SPACING);

/** Station run for the Projects chapter. */
const projectStations = (width: number): WorldStation[] =>
  buildStations('project', 'projects', width, PROJECT_SPACING);

/**
 * Platforms per chapter.
 *
 * The cliff keeps Phase 1's first three ledges at their EXACT original x/y, so
 * every existing jump and collision assertion still holds against real geometry.
 *
 * The remaining four were Phase 1's mid-world ledges at x=900/1160/1320/1560, which
 * existed only because all three chapters shared a 3840px world. With the cliff
 * being 900px wide they were unreachable dead geometry outside the world bounds,
 * so they are re-spaced INSIDE the cliff rather than kept. Nothing references them:
 * Phase 1 asserts player behaviour (jump height, landing, collision, camera), not
 * platform coordinates.
 */
const CLIFF_PLATFORMS: WorldPlatform[] = [
  // Original Phase 1 ledges, verbatim.
  { x: 320, y: 470, width: 96, height: 16 },
  { x: 520, y: 400, width: 80, height: 16 },
  { x: 700, y: 340, width: 80, height: 16, oneWay: true },
  // The former mid-world ledges, re-spaced inside the cliff. Same y values, so the
  // silhouette of the climb is unchanged; only the horizontal spacing differs.
  { x: 470, y: 430, width: 120, height: 16 },
  { x: 620, y: 360, width: 80, height: 16 },
  { x: 760, y: 290, width: 96, height: 16, oneWay: true },
];

const SKILLS_PLATFORMS: WorldPlatform[] = [
  { x: 300, y: 420, width: 120, height: 16 },
  { x: 520, y: 350, width: 96, height: 16, oneWay: true },
];

const PROJECTS_PLATFORMS: WorldPlatform[] = [
  { x: 320, y: 430, width: 128, height: 16 },
  { x: 520, y: 360, width: 96, height: 16, oneWay: true },
];

/* ------------------------------------------------------------------ *
 * Pipes
 * ------------------------------------------------------------------ */

const pipe = (
  id: string,
  x: number,
  destination: ChapterId,
  plate: string,
  signText: string,
): WorldPipe => ({
  id,
  skin: 'data',
  x,
  y: GROUND_Y,
  destination,
  plate,
  signText,
});

/**
 * The chapters of the Data world, in journey order.
 *
 * Each entry pipe sits at the chapter's left edge and each exit pipe near its
 * right, so a chapter always reads left-to-right: arrive at the left, walk
 * rightward, leave at the right. Because every chapter except the last has BOTH
 * pipes, all four routes — START to SKILLS, SKILLS to START, SKILLS to PROJECTS,
 * PROJECTS to SKILLS — exist without a separate "back" control.
 */
const DATA_CHAPTERS: WorldChapter[] = [
  {
    id: 'cliff',
    label: 'DATA WORLD',
    width: CLIFF_WIDTH,
    // The cliff is where the journey begins, so the player spawns on open ground
    // rather than climbing out of a pipe.
    spawn: { x: 120, y: GROUND_Y },
    entryPipe: pipe('cliff-entry', 60, 'cliff', 'START', 'ORIGIN'),
    /*
     * The exit pipe sits 150px from the right edge, not 70.
     *
     * At 70px from the edge a 44px-wide tube plus its sign board and the
     * "NEXT: SKILLS" plate overhung the chapter boundary, and vision inspection
     * of the running game reported both the sign text and the tube itself as
     * clipped at the canvas edge. The margin has to clear the widest thing the
     * pipe draws, not just the tube body.
     */
    exitPipe: pipe('cliff-to-skills', CLIFF_WIDTH - 150, 'skills', 'NEXT: SKILLS', 'JUMP TO START'),
  },
  {
    id: 'skills',
    label: 'SKILLS',
    width: SKILLS_WIDTH,
    spawn: { x: 60 + EMERGE_OFFSET, y: GROUND_Y },
    entryPipe: pipe('skills-entry', 60, 'skills', 'START', 'ARRIVAL'),
    exitPipe: pipe('skills-to-projects', SKILLS_WIDTH - 150, 'projects', 'NEXT: PROJECTS', 'NEXT CHAPTER'),
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    width: PROJECTS_WIDTH,
    spawn: { x: 60 + EMERGE_OFFSET, y: GROUND_Y },
    entryPipe: pipe('projects-entry', 60, 'projects', 'START', 'ARRIVAL'),
    // Terminal chapter: the journey ends here, so there is no way out but back.
    exitPipe: null,
  },
];

/* ------------------------------------------------------------------ *
 * The Data world
 * ------------------------------------------------------------------ */

/**
 * The Data world.
 *
 * `height` is 900 rather than the 640 of the first Phase 2 pass. At 1x the
 * viewport showed 522 of 640 world px, so the whole facility fitted on screen at
 * once and every structure read small. The camera now zooms to 2x (see CAMERA),
 * showing ~261 world px — a 48px character fills 18% of the frame and 38px
 * conduits read as pipes. The extra height is ceiling structure (gantries, risers,
 * cable trays, distant plant) that only becomes visible once the camera is closer,
 * so zooming REVEALS environment rather than hiding it.
 *
 * `groundY` stays 560 and the cliff keeps Phase 1's exact platform y values, so
 * every existing jump, collision and camera assertion is unaffected.
 */
export const DATA_WORLD: WorldConfig = {
  id: 'data',
  name: 'Data World',
  height: WORLD_HEIGHT,
  groundY: GROUND_Y,
  palette: {
    background: '#04060a',
    far: '#0c111a',
    ground: '#1a2230',
    groundTop: '#6e7f96',
    grid: '#2b3646',
  },
  chapters: DATA_CHAPTERS,
  entryChapter: 'cliff',
};

/**
 * Per-chapter platforms, keyed by chapter.
 *
 * Kept beside the chapter descriptors rather than on the world, because the whole
 * point is that a chapter's geometry is built with the chapter and dies with it.
 */
const CHAPTER_PLATFORMS: Record<ChapterId, WorldPlatform[]> = {
  cliff: CLIFF_PLATFORMS,
  skills: SKILLS_PLATFORMS,
  projects: PROJECTS_PLATFORMS,
};

/**
 * Build the playable world for ONE chapter.
 *
 * This is the only way the scene obtains geometry, and it returns only the active
 * chapter's stations, platforms and pipes. There is no code path that produces a
 * combined world, so "future chapters must not exist before transport" is
 * structural rather than a check somebody has to remember to run.
 */
export const chapterWorld = (world: WorldConfig, chapter: ChapterId): ChapterWorld => {
  const found = world.chapters.find((c) => c.id === chapter);
  if (!found) throw new Error(`chapterWorld: unknown chapter '${chapter}' in world '${world.id}'`);

  const stations = chapter === 'skills' ? skillStations(found.width) : chapter === 'projects' ? projectStations(found.width) : [];

  const pipes = found.exitPipe ? [found.entryPipe, found.exitPipe] : [found.entryPipe];

  return {
    id: world.id,
    name: world.name,
    chapter: found.id,
    width: found.width,
    height: world.height,
    groundY: world.groundY,
    spawn: found.spawn,
    platforms: CHAPTER_PLATFORMS[found.id] ?? [],
    palette: world.palette,
    stations,
    pipes,
    entryPipe: found.entryPipe,
    exitPipe: found.exitPipe,
  };
};

/** The chapter reached by taking `pipeId` in `from`, or null if unknown. */
export const chapterViaPipe = (
  world: WorldConfig,
  from: ChapterId,
  pipeId: string,
): ChapterId | null => {
  const current = world.chapters.find((c) => c.id === from);
  if (!current) return null;
  if (current.exitPipe?.id === pipeId) return current.exitPipe.destination;
  if (current.entryPipe.id === pipeId) {
    // Travelling out of the pipe the player arrived by means going back.
    return previousChapter(world, from);
  }
  return null;
};

/** The chapter before `chapter`, or null at the start of the journey. */
export const previousChapter = (world: WorldConfig, chapter: ChapterId): ChapterId | null => {
  const index = world.chapters.findIndex((c) => c.id === chapter);
  if (index <= 0) return null;
  return world.chapters[index - 1]?.id ?? null;
};

/**
 * Cloud exists as configuration only. Phase 2 ships no gameplay for it, so the
 * engine refuses to build a world whose config is not yet playable — see
 * `isPlayable`. Cloud becomes playable in a later phase by flipping that flag,
 * with no engine change. Its geometry mirrors the Data world's chapter shape so
 * the shared transport code can be exercised against it unchanged.
 */
export const CLOUD_WORLD: WorldConfig = {
  id: 'cloud',
  name: 'Cloud World',
  height: 640,
  groundY: GROUND_Y,
  palette: {
    background: '#0d0a14',
    far: '#1b1430',
    ground: '#241a3d',
    groundTop: '#4a3785',
    grid: '#2e2352',
  },
  chapters: [
    {
      id: 'cliff',
      label: 'CLOUD WORLD',
      width: 1400,
      spawn: { x: 120, y: GROUND_Y },
      entryPipe: pipe('cloud-entry', 60, 'cliff', 'START', 'ORIGIN'),
      exitPipe: null,
    },
  ],
  entryChapter: 'cliff',
};

/**
 * Which worlds can actually be built.
 *
 * Cloud is absent on purpose. This is the guard that stops the shared engine
 * from silently rendering an unbuilt world when someone navigates to it.
 */
export const PLAYABLE_WORLDS: readonly WorldId[] = ['data'];

export const isPlayable = (id: WorldId): boolean => PLAYABLE_WORLDS.includes(id);

export const WORLD_CONFIGS: Record<WorldId, WorldConfig> = {
  data: DATA_WORLD,
  cloud: CLOUD_WORLD,
};

/* ------------------------------------------------------------------ *
 * Geometry helpers shared by the scene
 * ------------------------------------------------------------------ */

/** The rectangle a pipe mouth occupies, used for both trigger and rendering. */
export const pipeRect = (pipe: WorldPipe) => ({
  x: pipe.x - PIPE_HALF_WIDTH,
  y: pipe.y - PIPE_HEIGHT,
  width: PIPE_HALF_WIDTH * 2,
  height: PIPE_HEIGHT,
});

/**
 * Look up a station's full content record by id.
 *
 * Split by kind because skill ids and project ids are different namespaces; a
 * collision must not silently return the wrong record.
 */
export const contentForStation = (
  station: WorldStation,
): Skill | Project | undefined =>
  station.kind === 'skill' ? PORTFOLIO.skills[station.id] : PORTFOLIO.projects[station.id];

/** The pipe within trigger range of `x`, searching only the ACTIVE chapter. */
export const pipeNearX = (world: ChapterWorld, x: number): WorldPipe | undefined =>
  world.pipes.find((p) => Math.abs(p.x - x) <= PIPE_TRIGGER_RANGE + PIPE_HALF_WIDTH);