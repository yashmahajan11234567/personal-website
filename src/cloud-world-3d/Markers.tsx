import { useState } from 'react';
import { CloudSign } from './Signs';
import { pathCenterX } from './world';

export interface SkillStop {
  id: string;
  name: string;
  x: number;
  z: number;
  side: 'left' | 'right';
}

// Approach-facing yaw for a sign beside the path. The player walks the path
// toward +z with the camera behind looking +z, so a sign on the LEFT of the
// path (negative x side) should present its face slightly right-of-center-back
// toward the trail; a sign on the RIGHT presents left-of-center. Base yaw π
// (face toward -z, i.e. toward the approaching player) is blended with the
// local path tangent so a sign on a curving stretch angles naturally toward
// the direction the player is actually coming from.
function approachYaw(z: number, side: 'left' | 'right'): number {
  // Local path tangent direction (dx/dz), used to tilt the board.
  const eps = 1.5;
  const tangent = Math.atan2(pathCenterX(z + eps) - pathCenterX(z - eps), 2 * eps);
  // Blend: face back along the path toward the player, tilted by the tangent
  // and by which side of the trail the sign stands on.
  const sideTilt = side === 'left' ? -0.42 : 0.42; // ~24°
  return Math.PI + tangent * 0.6 + sideTilt;
}

export function SkillMarker({
  stop,
  onClick,
  scale = 3.0,
}: {
  stop: SkillStop;
  onClick?: (id: string) => void;
  /** Board scale; category boards pass a smaller value (proportionate posts). */
  scale?: number;
}) {
  const [, setHovered] = useState(false);
  const handleClick = () => onClick?.(stop.id);

  return (
    <CloudSign
      title={stop.name}
      position={[stop.x, stop.z]}
      yaw={approachYaw(stop.z, stop.side)}
      scale={scale}
      onClick={handleClick}
      onHover={setHovered}
    />
  );
}
