/**
 * Plate interior: the printed/embedded artwork inside a world plate.
 *
 * Reference measurement (video frame 96): the plate interior is ~56% mid-tone
 * (luma 60-150), ~21% light, ~23% dark -- NOT a flat black field. This
 * component reproduces that structure:
 *
 *   - a mid-tone base rather than black
 *   - a fine diagonal hatch, the reference's printed texture
 *   - a faint structural grid
 *   - a row of technical marks across the top band
 *   - a darker recessed band behind the world type
 *   - a telemetry strip along the lower-left
 *
 * Everything is monochrome. World identity comes from the hover glow (D4), so
 * this must never carry colour of its own.
 *
 * The interior lives INSIDE the plate element, so it rises with the plate and
 * is spatially attached to it by construction -- it cannot drift or pop in
 * separately, because there is no separate transform on it.
 *
 * All artwork is `aria-hidden`. The plate's live text and button label carry
 * the meaning; duplicating it here would double up in a screen reader.
 */

import type { Path } from '../../../store/gameStore';
import { PLATE_INTERIORS } from '../../data/plateInteriors';
import { PlateMarkArt } from './PlateMarks';
import './PlateInterior.css';

export function PlateInterior({ path }: { path: Path }) {
  const art = PLATE_INTERIORS[path];
  return (
    <div
      className="plate-interior"
      data-interior={path}
      style={
        {
          '--plate-base': art.base,
          '--plate-hatch': art.hatch,
          '--plate-grid': art.grid,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {/* Printed hatch + structural grid, behind everything else. */}
      <div className="plate-interior__texture" />

      {/* Recessed band that the world type sits in. Keeps the dominant type
          legible against the mid-tone base, as in the reference. */}
      <div className="plate-interior__recess" />

      {/* Technical mark row across the top band. */}
      <div className="plate-interior__marks">
        {art.marks.map((mark, i) => (
          <div className="plate-interior__mark" key={i}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" focusable="false">
              <PlateMarkArt mark={mark} />
            </svg>
            <span className="plate-interior__caption">{art.captions[i] ?? ''}</span>
          </div>
        ))}
      </div>

      {/* Telemetry strip, lower-left. */}
      <div className="plate-interior__telemetry">{art.telemetry}</div>

      {/* Corner cog cluster, bottom-right. */}
      <svg
        className="plate-interior__cog"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMinYMax meet"
        focusable="false"
      >
        <PlateMarkArt mark={{ kind: 'cog', teeth: 10 }} />
        <PlateMarkArt mark={{ kind: 'cog', teeth: 6 }} />
      </svg>
    </div>
  );
}