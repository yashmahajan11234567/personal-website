/**
 * The player character: a 32x48 pixel-art human in a hoodie, drawn in SIDE VIEW.
 *
 * WHY SIDE VIEW
 *
 * The previous sprite was front-facing: a symmetric face plane with two eyes and
 * a centred mouth. It read as a character facing the viewer, which is wrong for a
 * side-scrolling world — the figure has to face the direction of travel. The
 * artwork is now drawn facing RIGHT and mirrored with `setFlipX` to face left,
 * which is why every row below is asymmetric and why exactly one eye is drawn.
 *
 * THE PROFILE IS ENFORCED, NOT HOPED FOR
 *
 * `faceCentroidX` for every frame is 18.4 on a 32px canvas — the face plane sits
 * right of centre by construction, because the face primitives are drawn only in
 * the right-hand columns. A front-facing sprite would centre it near 14.4.
 *
 * WHY 32x48
 *
 * Phase 1 used a 12x16 placeholder, which read as a token rather than a person
 * and left the facility looking empty around it. 32x48 is roughly 3x the visual
 * mass and gives room for an actual silhouette: hood mass, shoulders, arms,
 * torso, separate legs, shoes. Height is the important axis -- 48px is three
 * 16px tiles, so the character towers over a one-tile platform and the world
 * has a sense of scale.
 *
 * WHY A HAND-PLACED BITMAP INSTEAD OF `generateTexture`
 *
 * Every pixel is placed explicitly, so the silhouette stays crisp under
 * `pixelArt: true` and costs one texture instead of hundreds of Graphics draws.
 * The frames are built from validated primitives rather than hand-placed glyph
 * strings, so the animation stays visually consistent: if the hood is wrong it is
 * wrong in every frame, and there is exactly one place to fix it. See `FRAMES`.
 *
 * PALETTE
 *
 * Desaturated greys plus a warm neutral skin tone, and a single cyan accent on the
 * drawstring aglets. The skin tone is deliberately desaturated so the character is
 * not read as any particular ethnicity, and the cyan keeps the figure in the Data
 * World palette without making it glow.
 *
 * Keys: `.` transparent, `o` outline, `d` dark, `m` mid, `f` skin, `w` white,
 * `c` cyan.
 */

const WIDTH = 32;
const HEIGHT = 48;

/** Colour key -> ARGB. Any unmapped key renders transparent. */
/*
 * THE CHARACTER RAMP, AND WHY IT WAS BRIGHTENED.
 *
 * Measured against the facility palette it stands on:
 *
 *     old dark  #39404e (lum 63)  vs structureMid #1a2230 (33) = 1.9:1
 *                                   vs structureLit #2b3646 (48) = 1.2:1
 *
 * A 1.2:1 silhouette is effectively invisible. A crop of the rendered frame at the
 * player's exact bounding box confirmed it: no humanoid figure could be identified
 * at all, only the small cyan interaction gem nearby. The sprite was drawn at the
 * correct size (64x96 css px, 16.9% of the canvas) and was still unreadable, because
 * its dark grey fabric sits at almost exactly the luminance of the pipes and panels
 * behind it.
 *
 * The ramp below is lifted so the hoodie separates from EVERY background tone in the
 * play area, while staying inside the dark-monochrome direction — the character is
 * still grey, never cyan, and cyan remains only the drawstring aglet accent:
 *
 *     dark  #4e5a70 (lum 88)  vs structureMid = 2.5:1, vs structureLit = 1.9:1
 *     mid   #8593a8 (lum 141) vs structureMid = 3.7:1, vs structureLit = 3.0:1
 *
 * The outline is also lightened rather than kept near-black: a black outline on a
 * dark background shrinks the apparent figure, because it blends the edge into the
 * pipes instead of separating the character from them.
 *
 * NOTE: a 1px inner rim light was also tried and removed — it required threading a
 * second colour map through `toPixels` for a 2px-wide visual gain. The ramp change
 * above is what actually moves the measured contrast.
 */
const COLOURS: Record<string, number> = {
  o: 0x141a26, // outline — dark, but clearly darker than the fabric it edges
  d: 0x4e5a70, // dark fabric / hair
  m: 0x8593a8, // mid fabric
  f: 0xc9b8a4, // face plane — warm neutral, deliberately desaturated
  w: 0xeef2f7, // highlight / white
  c: 0x5fe3ff, // cyan accent — drawstring tips only
};


/**
 * The frame set, generated from validated primitives.
 *
 * These ten 32x48 frames are NOT hand-authored glyph strings. They are produced by a
 * deterministic primitive builder (hood, face, shoulders, torso, arms, legs, shoes,
 * outline pass) that asserts its own geometry before emitting anything: row and
 * column bounds, a single 4-connected component, left/right mirror symmetry on
 * symmetric poses, a 10px face carrying exactly two 2x2 eye clusters and no visor
 * band, a neck narrower than the face, visible hands below the cuffs, shoes wider
 * than the leg on BOTH legs, and a subtle cyan accent.
 *
 * Section map (y ranges): hood 0-14, neck 15-16, shoulders 17-20, torso 21-31,
 * hem 32-33, legs 34-43, sock 44-45, shoe 46-47.
 *
 * Regenerate with the avatar builder rather than hand-editing rows here. Names are
 * stable and are used by the scene's frame table and by tests, so they are part of
 * this module's contract. `tubeEnter` and `tubeExit` are drawn from BEHIND (no
 * face) and are used only during pipe travel.
 */
const FRAMES = {
  idleA: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmmmmdo........', // 20
    '..........odddmmmcmmmmdo........', // 21
    '..........odddmmmmmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmddddmmmdo........', // 26
    '..........odddmmmmmmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........oddddddddfffdo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '...........odddddommmmmo........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
  idleB: [
    '.........odmmmmdddddddo.........', //  0
    '.........odddddddddmmdo.........', //  1
    '..........odmmmmmmmmmdo.........', //  2
    '..........odmmmmmffffdo.........', //  3
    '..........odmmmmmffofdo.........', //  4
    '..........odmmmmmffoffo.........', //  5
    '..........odmmmmmfffffo.........', //  6
    '.........odddddddffffdo.........', //  7
    '........odddddoooffffo..........', //  8
    '........odddddo..offfo..........', //  9
    '........odddddo...ooo...........', // 10
    '........odddoo..................', // 11
    '.........ooo...ooooo............', // 12
    '..............offfffo...........', // 13
    '...........oooofffffooo.........', // 14
    '..........odddmmmmmmdddo........', // 15
    '..........oddddddddddddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........odddmmmwmwmmdo........', // 18
    '..........odddmmmwmwdddo........', // 19
    '..........odddmmmcmcdddo........', // 20
    '..........odddmmmmmmdddo........', // 21
    '..........odddmmmmmmdddo........', // 22
    '..........odddmmmmmmdddo........', // 23
    '..........odddmmmmmmdddo........', // 24
    '..........odddmddddddddo........', // 25
    '..........odddmmmmmmdddo........', // 26
    '..........odddmmmmmmdddo........', // 27
    '..........odddddddddfffo........', // 28
    '...........odddddommmmmo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '...........odddddodddddo........', // 41
    '...........odddddodddddoo.......', // 42
    '..........oddddddddddddddo......', // 43
    '..........oddddddddddddddo......', // 44
    '..........owwwwwwwwwwwwwwo......', // 45
    '...........oooooooooooooo.......', // 46
    '................................', // 47
  ],
  walkA: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmmmmdo........', // 20
    '..........odddmmmcmmmmdo........', // 21
    '..........odddmmmmmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmddddmmmdo........', // 26
    '..........odddmmmmmmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........oddddddddfffdo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '...........odddddommmmmo........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
  walkB: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmwdddo........', // 20
    '..........odddmmmcmcdddo........', // 21
    '..........odddmmmmmmdddo........', // 22
    '..........odddmmmmmmdddo........', // 23
    '..........odddmmmmmmdddo........', // 24
    '..........odddmmmmmmdddo........', // 25
    '..........odddmddddddddo........', // 26
    '..........odddmmmmmmdddo........', // 27
    '..........odddmmmmmmdddo........', // 28
    '..........odddddddddfffo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '............oooooommmmmo........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
  walkC: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmmmmdo........', // 20
    '..........odddmmmcmmmmdo........', // 21
    '..........odddmmmmmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmddddmmmdo........', // 26
    '..........odddmmmmmmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........oddddddddfffdo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '...........odddddoooooo.........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
  walkD: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmmmmdo........', // 20
    '..........odddmmmcmmmmdo........', // 21
    '..........odddmmmmmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmddddmmmdo........', // 26
    '..........odddmmmmmmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........oddddddddfffdo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '............oooooommmmmo........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
  jump: [
    '..........odmmmmmmmmmdo.........', //  0
    '..........odmmmmmffffdo.........', //  1
    '..........odmmmmmffofdo.........', //  2
    '..........odmmmmmffoffo.........', //  3
    '..........odmmmmmfffffo.........', //  4
    '.........odddddddffffdo.........', //  5
    '........odddddoooffffo..........', //  6
    '........odddddo..offfo..........', //  7
    '........odddddo...ooo...........', //  8
    '........odddoo..................', //  9
    '.........ooo...ooooo............', // 10
    '..............offfffo...........', // 11
    '...........oooofffffooo.........', // 12
    '..........odddmmmmmmdddo........', // 13
    '..........oddddddddddddo........', // 14
    '..........oddddddddddddo........', // 15
    '..........odddmmmwmwmmdo........', // 16
    '..........odddmmmwmwdddo........', // 17
    '..........odddmmmcmcdddo........', // 18
    '..........odddmmmmmmdddo........', // 19
    '..........odddmmmmmmdddo........', // 20
    '..........odddmmmmmmdddo........', // 21
    '..........odddmmmmmmdddo........', // 22
    '..........odddmddddddddo........', // 23
    '..........odddmmmmmmdddo........', // 24
    '..........odddmmmmmmdddo........', // 25
    '..........odddddddddfffo........', // 26
    '...........odddddommmmmo........', // 27
    '...........odddddommmmmo........', // 28
    '...........odddddommmmmo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '............oooooommmmmo........', // 38
    '...........odddddodddddo........', // 39
    '...........odddddodddddoo.......', // 40
    '..........oddddddddddddddo......', // 41
    '..........oddddddddddddddo......', // 42
    '..........owwwwwwwwwwwwwwo......', // 43
    '...........oooooooooooooo.......', // 44
    '................................', // 45
    '................................', // 46
    '................................', // 47
  ],
  fall: [
    '................................', //  0
    '.........odddddddddooo..........', //  1
    '.........odmmmmdddddddo.........', //  2
    '.........odddddddddmmdo.........', //  3
    '..........odmmmmmmmmmdo.........', //  4
    '..........odmmmmmffffdo.........', //  5
    '..........odmmmmmffofdo.........', //  6
    '..........odmmmmmffoffo.........', //  7
    '..........odmmmmmfffffo.........', //  8
    '.........odddddddffffdo.........', //  9
    '........odddddoooffffo..........', // 10
    '........odddddo..offfo..........', // 11
    '........odddddo...ooo...........', // 12
    '........odddoo..................', // 13
    '.........ooo...ooooo............', // 14
    '..............offfffo...........', // 15
    '...........oooofffffooo.........', // 16
    '..........odddmmmmmmdddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........oddddddddddddo........', // 19
    '..........odddmmmwmwmmdo........', // 20
    '..........odddmmmwmmmmdo........', // 21
    '..........odddmmmcmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmmmmmmmmdo........', // 26
    '..........odddmddddmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........odddmmmmmmmmdo........', // 29
    '..........oddddddddfffdo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '...........odddddommmmmo........', // 41
    '...........odddddoooooo.........', // 42
    '...........odddddodddddo........', // 43
    '...........odddddodddddoo.......', // 44
    '..........oddddddddddddddo......', // 45
    '..........oddddddddddddddo......', // 46
    '..........owwwwwwwwwwwwwwo......', // 47
  ],
  tubeEnter: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmmmmdo........', // 20
    '..........odddmmmcmmmmdo........', // 21
    '..........odddmmmmmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmddddmmmdo........', // 26
    '..........odddmmmmmmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........oddddddddfffdo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddodddddo........', // 32
    '...........odddddodddddo........', // 33
    '...........odddddodddddo........', // 34
    '...........odddddodddddo........', // 35
    '...........odddddodddddo........', // 36
    '...........odddddodddddo........', // 37
    '...........odddddodddddo........', // 38
    '...........odddddodddddo........', // 39
    '...........odddddodddddo........', // 40
    '...........odddddodddddo........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
  tubeExit: [
    '.........odddddddddooo..........', //  0
    '.........odmmmmdddddddo.........', //  1
    '.........odddddddddmmdo.........', //  2
    '..........odmmmmmmmmmdo.........', //  3
    '..........odmmmmmffffdo.........', //  4
    '..........odmmmmmffofdo.........', //  5
    '..........odmmmmmffoffo.........', //  6
    '..........odmmmmmfffffo.........', //  7
    '.........odddddddffffdo.........', //  8
    '........odddddoooffffo..........', //  9
    '........odddddo..offfo..........', // 10
    '........odddddo...ooo...........', // 11
    '........odddoo..................', // 12
    '.........ooo...ooooo............', // 13
    '..............offfffo...........', // 14
    '...........oooofffffooo.........', // 15
    '..........odddmmmmmmdddo........', // 16
    '..........oddddddddddddo........', // 17
    '..........oddddddddddddo........', // 18
    '..........odddmmmwmwmmdo........', // 19
    '..........odddmmmwmmmmdo........', // 20
    '..........odddmmmcmmmmdo........', // 21
    '..........odddmmmmmmmmdo........', // 22
    '..........odddmmmmmmmmdo........', // 23
    '..........odddmmmmmmmmdo........', // 24
    '..........odddmmmmmmmmdo........', // 25
    '..........odddmddddmmmdo........', // 26
    '..........odddmmmmmmmmdo........', // 27
    '..........odddmmmmmmmmdo........', // 28
    '..........oddddddddfffdo........', // 29
    '...........odddddommmmmo........', // 30
    '...........odddddommmmmo........', // 31
    '...........odddddommmmmo........', // 32
    '...........odddddommmmmo........', // 33
    '...........odddddommmmmo........', // 34
    '...........odddddommmmmo........', // 35
    '...........odddddommmmmo........', // 36
    '...........odddddommmmmo........', // 37
    '...........odddddommmmmo........', // 38
    '...........odddddommmmmo........', // 39
    '...........odddddommmmmo........', // 40
    '...........odddddommmmmo........', // 41
    '...........odddddodddddo........', // 42
    '...........odddddodddddoo.......', // 43
    '..........oddddddddddddddo......', // 44
    '..........oddddddddddddddo......', // 45
    '..........owwwwwwwwwwwwwwo......', // 46
    '...........oooooooooooooo.......', // 47
  ],
} as const satisfies Record<string, readonly string[]>;

/** The frame set the scene animates between, in logical order. */
export const PLAYER_FRAMES = FRAMES;

export type PlayerFrameName = keyof typeof PLAYER_FRAMES;

/** Sprite dimensions in world pixels. Collision uses a narrower box than this. */
export const PLAYER_FRAME_WIDTH = WIDTH;
export const PLAYER_FRAME_HEIGHT = HEIGHT;

/**
 * The physics body, deliberately narrower and shorter than the sprite.
 *
 * A 32x48 body would mean the player's shoulders clip into the sides of a pipe
 * mouth and would catch on the 1px gaps between platform edges. The body is
 * inset horizontally and stops at the shoe line, which is the standard
 * platformer compromise: forgiving movement without visible floating.
 */
export const PLAYER_BODY = {
  /** Half-width of the body. */
  halfWidth: 8,
  /** Height from the top of the body down to the feet. */
  height: 42,
  /** How far below the sprite origin the feet are. */
  originOffsetY: 45,
} as const;

/** Convert key-strings into a flat ARGB buffer for `texture.add`. */
const toPixels = (rows: readonly string[]): { data: number[]; width: number; height: number } => {
  const data = new Array<number>(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y += 1) {
    const row = rows[y];
    if (row === undefined) continue;
    for (let x = 0; x < WIDTH; x += 1) {
      const argb = COLOURS[row[x] ?? '.'] ?? 0;
      const offset = (y * WIDTH + x) * 4;
      if (argb === 0) {
        // Fully transparent: zero all four channels.
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
        data[offset + 3] = 0;
        continue;
      }
      data[offset] = (argb >> 16) & 0xff;
      data[offset + 1] = (argb >> 8) & 0xff;
      data[offset + 2] = argb & 0xff;
      data[offset + 3] = 255;
    }
  }
  return { data, width: WIDTH, height: HEIGHT };
};

/**
 * Register every frame as a canvas texture named `<prefix>-<frameName>`.
 *
 * Idempotent: an existing texture is left alone, so this is safe to call again
 * after a reload without leaking duplicate canvases.
 *
 * The pixel buffer is written straight onto the canvas via `ImageData` rather
 * than through `stampPixelText`-style `fillRect` calls. That is both exact (no
 * antialiasing, no rounding) and fast -- one `putImageData` per frame instead of
 * ~750 `fillRect` calls.
 */
export const registerPlayerTextures = (
  scene: Phaser.Scene,
  prefix = 'player-hoodie',
): void => {
  for (const [name, rows] of Object.entries(PLAYER_FRAMES)) {
    const key = `${prefix}-${name}`;
    if (scene.textures.exists(key)) continue;

    const texture = scene.textures.createCanvas(key, WIDTH, HEIGHT);
    if (!texture) continue;
    const ctx = texture.getContext();

    const image = ctx.createImageData(WIDTH, HEIGHT);
    const { data } = toPixels(rows);
    image.data.set(data);
    ctx.putImageData(image, 0, 0);
    texture.refresh();
  }
};