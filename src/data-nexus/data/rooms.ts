/**
 * Data Nexus — room definitions.
 *
 * The whole world is DATA: one RoomScene class renders any room from a
 * RoomDef below. The Starting Hub keeps its reference-derived plate artwork
 * (plate.png + NEXUS_OBJECTS); every other room is composed procedurally
 * from the locked palette plus reused segmented object sprites, so no new
 * artwork had to be generated.
 *
 * Coordinates are world pixels, origin top-left, walls WALL_THICK thick.
 * A door `offset` is the centre of the opening measured along its wall.
 */

export const WALL_THICK = 48;

export interface RoomObjectSpec {
  /** Texture key under /assets/nexus/objects/ */
  key: string;
  /** Centre position in world pixels */
  x: number;
  y: number;
  /** Visual dimensions (used for circle body fallback) */
  w?: number;
  h?: number;
  scale?: number;
  depth: number;
  /** Collision: rect body {w,h,dy} (dy = offset of body centre below sprite centre), 'circle', or none */
  body?: { w: number; h: number; dy?: number } | 'circle' | 'none';
}

export type DoorSide = 'north' | 'south' | 'east' | 'west';

export interface RoomDoor {
  id: string;
  side: DoorSide;
  /** Centre of the opening along the wall, in world px */
  offset: number;
  /** Opening size in px */
  size: number;
  target: string;
  /** Door id in the target room the player should arrive at */
  entry: string;
  label: string;
}

export interface PanelRef {
  kind: 'skill' | 'project' | 'info';
  id: string;
}

export interface RoomInteractable {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  panel: PanelRef;
}

export interface RoomDef {
  key: string;
  title: string;
  width: number;
  height: number;
  /** true → render the reference plate + segmented object layer (Starting Hub) */
  plate?: boolean;
  floor: 'metal' | 'wood';
  objects?: RoomObjectSpec[];
  doors: RoomDoor[];
  interactables?: RoomInteractable[];
  spawn: { x: number; y: number };
  /** spawn override keyed by door id when entering through that door */
  entrySpawns?: Record<string, { x: number; y: number }>;
}

const SKILL_STATION_KEYS = [
  'nx_163_cyan',
  'nx_052_cyan',
  'nx_056_cyan',
  'nx_019_cyan',
  'nx_166_cyan',
  'nx_030_cyan',
];

const SKILL_IDS = ['sql', 'python', 'excel', 'power-bi', 'tableau', 'streamlit'] as const;

const PROJECT_IDS = [
  'nifty100-financial-analysis',
  'sql-data-warehouse',
  'primetradeai',
  'data-analytics-dashboards',
] as const;

const PROJECT_SHORT = [
  'NIFTY-100 ANALYSIS',
  'SQL WAREHOUSE',
  'PRIMETRADE AI',
  'DASHBOARDS',
] as const;

function skillsTunnel(): RoomDef {
  const W = 1400;
  const H = 780;
  const stationXs = [200, 400, 600, 800, 1000, 1200];
  const objects: RoomObjectSpec[] = [];
  const interactables: RoomInteractable[] = [];
  stationXs.forEach((x, i) => {
    objects.push({
      key: SKILL_STATION_KEYS[i],
      x,
      y: 128,
      depth: 20,
      body: { w: 110, h: 60, dy: 20 },
    });
    interactables.push({
      id: `station-${SKILL_IDS[i]}`,
      x,
      y: 216,
      w: 130,
      h: 70,
      label: `Inspect ${SKILL_IDS[i].toUpperCase()} station`,
      panel: { kind: 'skill', id: SKILL_IDS[i] },
    });
  });
  // decorative machinery along the south wall
  objects.push({ key: 'nx_149_blue_metal', x: 120, y: H - 110, depth: 30, body: { w: 57, h: 42 } });
  objects.push({ key: 'nx_149_blue_metal', x: W - 120, y: H - 110, depth: 30, body: { w: 57, h: 42 } });
  return {
    key: 'skills-tunnel',
    title: 'Skills Tunnel',
    width: W,
    height: H,
    floor: 'metal',
    objects,
    doors: [
      { id: 'south', side: 'south', offset: W / 2, size: 180, target: 'starting-hub', entry: 'north', label: 'STARTING HUB' },
      { id: 'north', side: 'north', offset: W / 2, size: 180, target: 'projects-hub', entry: 'south', label: 'PROJECTS HUB' },
    ],
    interactables,
    spawn: { x: W / 2, y: H - WALL_THICK - 70 },
    entrySpawns: {
      south: { x: W / 2, y: H - WALL_THICK - 70 },
      north: { x: W / 2, y: WALL_THICK + 70 },
    },
  };
}

function projectsHub(): RoomDef {
  const W = 1500;
  const H = 900;
  const kiosks = [
    { x: 450, y: 300 },
    { x: 1050, y: 300 },
    { x: 450, y: 640 },
    { x: 1050, y: 640 },
  ];
  const objects: RoomObjectSpec[] = [];
  const interactables: RoomInteractable[] = [];
  kiosks.forEach((k, i) => {
    objects.push({
      key: 'nx_052_cyan',
      x: k.x,
      y: k.y,
      scale: 1.1,
      depth: 20,
      body: { w: 130, h: 70, dy: 60 },
    });
    objects.push({ key: 'nx_051_yellow', x: k.x + 110, y: k.y - 90, depth: 15, body: 'none' });
    interactables.push({
      id: `kiosk-${PROJECT_IDS[i]}`,
      x: k.x,
      y: k.y + 170,
      w: 220,
      h: 80,
      label: `Open ${PROJECT_SHORT[i]}`,
      panel: { kind: 'project', id: PROJECT_IDS[i] },
    });
  });
  return {
    key: 'projects-hub',
    title: 'Projects Hub',
    width: W,
    height: H,
    floor: 'wood',
    objects,
    doors: [
      { id: 'south', side: 'south', offset: W / 2, size: 180, target: 'skills-tunnel', entry: 'north', label: 'SKILLS TUNNEL' },
      { id: 'west-1', side: 'west', offset: 300, size: 140, target: 'room-nifty100', entry: 'east', label: 'NIFTY-100' },
      { id: 'west-2', side: 'west', offset: 600, size: 140, target: 'room-sql-dw', entry: 'east', label: 'SQL WAREHOUSE' },
      { id: 'east-1', side: 'east', offset: 300, size: 140, target: 'room-primetradeai', entry: 'west', label: 'PRIMETRADE AI' },
      { id: 'east-2', side: 'east', offset: 600, size: 140, target: 'room-dashboards', entry: 'west', label: 'DASHBOARDS' },
    ],
    interactables,
    spawn: { x: W / 2, y: H - WALL_THICK - 70 },
    entrySpawns: {
      south: { x: W / 2, y: H - WALL_THICK - 70 },
      'west-1': { x: WALL_THICK + 70, y: 300 },
      'west-2': { x: WALL_THICK + 70, y: 600 },
      'east-1': { x: W - WALL_THICK - 70, y: 300 },
      'east-2': { x: W - WALL_THICK - 70, y: 600 },
    },
  };
}

function projectRoom(key: string, title: string, projectId: string, short: string): RoomDef {
  const W = 1200;
  const H = 800;
  return {
    key,
    title,
    width: W,
    height: H,
    floor: 'metal',
    objects: [
      { key: 'nx_052_cyan', x: W / 2, y: 240, scale: 1.6, depth: 20, body: { w: 200, h: 90, dy: 90 } },
      { key: 'nx_149_blue_metal', x: 200, y: 620, depth: 30, body: { w: 57, h: 42 } },
      { key: 'nx_191_other', x: W - 200, y: 620, depth: 30, body: { w: 34, h: 41 } },
    ],
    doors: [
      { id: 'south', side: 'south', offset: W / 2, size: 180, target: 'projects-hub', entry: key === 'room-nifty100' ? 'west-1' : key === 'room-sql-dw' ? 'west-2' : key === 'room-primetradeai' ? 'east-1' : 'east-2', label: 'PROJECTS HUB' },
    ],
    interactables: [
      {
        id: `display-${projectId}`,
        x: W / 2,
        y: 380,
        w: 280,
        h: 110,
        label: `Open ${short}`,
        panel: { kind: 'project', id: projectId },
      },
    ],
    spawn: { x: W / 2, y: H - WALL_THICK - 70 },
    entrySpawns: { south: { x: W / 2, y: H - WALL_THICK - 70 } },
  };
}

export const ROOMS: readonly RoomDef[] = [
  {
    key: 'starting-hub',
    title: 'Starting Hub',
    width: 1672,
    height: 941,
    plate: true,
    floor: 'metal',
    doors: [
      { id: 'north', side: 'north', offset: 836, size: 180, target: 'skills-tunnel', entry: 'south', label: 'SKILLS TUNNEL' },
    ],
    interactables: [
      {
        id: 'data-core',
        x: 748,
        y: 497,
        w: 170,
        h: 140,
        label: 'Access the Data Core',
        panel: { kind: 'info', id: 'hub-core' },
      },
    ],
    spawn: { x: 744, y: 732 },
    entrySpawns: { north: { x: 836, y: WALL_THICK + 70 } },
  },
  skillsTunnel(),
  projectsHub(),
  projectRoom('room-nifty100', 'NIFTY-100 Financial Analysis', 'nifty100-financial-analysis', 'NIFTY-100 PROJECT'),
  projectRoom('room-sql-dw', 'SQL Data Warehouse', 'sql-data-warehouse', 'SQL WAREHOUSE PROJECT'),
  projectRoom('room-primetradeai', 'PRIMETradeAI', 'primetradeai', 'PRIMETRADE AI PROJECT'),
  projectRoom('room-dashboards', 'Data Analytics Dashboards', 'data-analytics-dashboards', 'DASHBOARDS PROJECT'),
];

export const ROOM_BY_KEY: Readonly<Record<string, RoomDef>> = Object.fromEntries(
  ROOMS.map((r) => [r.key, r]),
);
