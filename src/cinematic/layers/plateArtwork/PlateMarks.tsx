/**
 * Plate interior artwork components.
 *
 * One small reusable component per mark kind, plus the frame that hosts them.
 * Every mark draws inside a 100x100 viewBox and is sized in percentages by the
 * host, so the interior stays proportional to the plate at every breakpoint
 * without hardcoding pixel geometry.
 *
 * These are `aria-hidden` decoration. The world's meaning is carried by the
 * plate's live text and its button label, so nothing here duplicates it for
 * screen readers (D2: live text for accessibility).
 */

import type { ReactElement } from 'react';
import type { PlateMark } from '../../data/plateInteriors';

/** Rising bar chart. Reference DATA plate, upper-left. */
function Bars({ data }: { data: { h: number }[] }) {
  const n = data.length;
  const gap = 6;
  const w = (100 - gap * (n - 1)) / n;
  return (
    <g className="mark mark--bars">
      {data.map((b, i) => {
        const x = i * (w + gap);
        const h = b.h * 84;
        return <rect key={i} x={x} y={94 - h} width={w} height={h} />;
      })}
      <line className="mark__axis" x1={0} y1={94} x2={100} y2={94} />
    </g>
  );
}

/** Processing ring / gear. Reference DATA plate, upper-centre. */
function Ring({ teeth }: { teeth: number }) {
  const r = 34;
  const inner = 21;
  const step = (Math.PI * 2) / teeth;
  const pts = Array.from({ length: teeth }, (_, i) => {
    const a = i * step - Math.PI / 2;
    const a2 = a + step * 0.34;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r} ${50 + Math.cos(a2) * r},${50 + Math.sin(a2) * r}`;
  }).join(' ');
  return (
    <g className="mark mark--ring">
      <polygon points={pts} />
      <circle cx={50} cy={50} r={inner} className="mark__ring-inner" />
      <circle cx={50} cy={50} r={8} className="mark__ring-hub" />
    </g>
  );
}

/** Dotted distribution map. Reference DATA plate, upper-right. */
function Net({ points }: { points: [number, number][] }) {
  // Link each point to its nearest neighbour so the map reads as a network
  // rather than scattered dots. Pairs are stored as tuples, not a flat array,
  // so each link is read back correctly.
  const links: Array<[number, number]> = [];
  points.forEach((p, i) => {
    let best = -1;
    let bestD = Infinity;
    points.forEach((q, j) => {
      if (i === j) return;
      const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    if (best > i) links.push([i, best]);
  });
  return (
    <g className="mark mark--net">
      {links.map(([i, j], k) => {
        const a = points[i];
        const b = points[j];
        return (
          <line
            key={`l${k}`}
            x1={a[0] * 100}
            y1={a[1] * 100}
            x2={b[0] * 100}
            y2={b[1] * 100}
          />
        );
      })}
      {points.map((p, i) => (
        <circle key={`p${i}`} cx={p[0] * 100} cy={p[1] * 100} r={2.6} />
      ))}
    </g>
  );
}

/** Command pipeline: labelled boxes joined by an arrowed path. */
function Flow({ data }: { data: { nodes: (string | null)[] } }) {
  const nodes = data.nodes;
  const n = nodes.length;
  const gap = 8;
  const w = (100 - gap * (n - 1)) / n;
  return (
    <g className="mark mark--flow">
      {nodes.map((label, i) => {
        const x = i * (w + gap);
        return (
          <g key={i}>
            <rect x={x} y={34} width={w} height={30} />
            {label ? (
              <text x={x + w / 2} y={53} className="mark__label">
                {label}
              </text>
            ) : null}
            {i < n - 1 ? (
              <path
                className="mark__arrow"
                d={`M${x + w + 1} 49 L${x + w + gap - 1} 49`}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** Orbit: two lobes, each holding a body. Reference CLOUD plate, upper-centre. */
function Orbit() {
  return (
    <g className="mark mark--orbit">
      <path
        d="M28 50 a22 22 0 1 1 22 22 a22 22 0 1 1 -22 -22 M28 50 a22 22 0 1 0 22 -22 a22 22 0 1 0 -22 22"
        transform="rotate(-18 50 50)"
      />
      <circle cx={34} cy={40} r={6} />
      <circle cx={66} cy={60} r={6} />
    </g>
  );
}

/** Stacked cloud outlines. Reference CLOUD plate, upper-right. */
function Clouds({ count }: { count: number }) {
  const path =
    'M14 60 a20 20 0 0 1 4 -39 a26 26 0 0 1 50 5 a18 18 0 0 1 -4 34 z';
  return (
    <g className="mark mark--clouds">
      {Array.from({ length: count }, (_, i) => (
        <path
          key={i}
          d={path}
          transform={`translate(${i * 4}, ${i * 13}) scale(${1 - i * 0.08})`}
        />
      ))}
    </g>
  );
}

const MARKS: Record<PlateMark['kind'], (m: PlateMark) => ReactElement> = {
  bars: (m) => <Bars data={(m as { data: { h: number }[] }).data} />,
  ring: (m) => <Ring teeth={(m as { teeth: number }).teeth} />,
  net: (m) => <Net points={(m as { points: [number, number][] }).points} />,
  flow: (m) => <Flow data={(m as { data: { nodes: (string | null)[] } }).data} />,
  orbit: () => <Orbit />,
  clouds: (m) => <Clouds count={(m as { count: number }).count} />,
  cog: (m) => <Ring teeth={(m as { teeth: number }).teeth} />,
};

/** Render one mark. Kept separate so each kind is independently reusable. */
export function PlateMarkArt({ mark }: { mark: PlateMark }) {
  return <>{MARKS[mark.kind](mark)}</>;
}