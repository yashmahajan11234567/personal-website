/**
 * Data Nexus — avatar placement data.
 *
 * The avatar is NOT a procedural placeholder any more: it is extracted from the
 * supplied Starting Hub reference by scripts/nexus/extract_avatar.py, which also
 * writes public/assets/nexus/avatar/avatar_report.json.
 *
 * Hand-maintained (not auto-generated) so regenerating objects.gen.ts cannot
 * clobber it.
 */

export const AVATAR_KEY = 'avatar';

/** Native size of the extracted RGBA cutout. */
export const AVATAR_TEXTURE_W = 112;
export const AVATAR_TEXTURE_H = 172;

/**
 * Where the avatar's FEET sit in the reference frame (bottom-centre of the
 * extracted bbox 688,560,800,732). The sprite uses a bottom-centre origin, so
 * this is also its spawn position.
 */
export const AVATAR_SPAWN_X = 744;
export const AVATAR_SPAWN_Y = 732;

/**
 * Physical footprint used for collision: the legs/lower body only.
 * A top-down figure occludes the floor above its feet, so the body must not
 * cover the whole 172px sprite height.
 */
export const AVATAR_FOOTPRINT_W = 46;
export const AVATAR_FOOTPRINT_H = 26;
