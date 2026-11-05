/** Unit tests for the iso core — run: node src/cloud-world-iso/iso.test.ts */
import {
  worldToScreen, screenToWorld, depthKey, DIR8, normalizeIntent, directionIndex,
  WalkGrid, CELL_LAND, CELL_WATER, CELL_DOCK, CELL_BLOCKED,
} from './iso.ts';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; } else { failed++; console.error('FAIL:', name); }
}

// projection round-trip
const p = worldToScreen(12.5, -7.25, 3, 100, 50);
const w = screenToWorld(p.x, p.y, 100, 50, 3);
check('round-trip x', Math.abs(w.x - 12.5) < 1e-9);
check('round-trip y', Math.abs(w.y - (-7.25)) < 1e-9);
// z lifts by 32px per metre
check('z lift', worldToScreen(0, 0, 2).y === worldToScreen(0, 0, 0).y - 64);
// 2:1 dimetric: +x goes right-down, +y goes left-down
check('iso x axis', worldToScreen(1, 0).x > worldToScreen(0, 0).x && worldToScreen(1, 0).y > worldToScreen(0, 0).y);
check('iso y axis', worldToScreen(0, 1).x < worldToScreen(0, 0).x && worldToScreen(0, 1).y > worldToScreen(0, 0).y);

// depth key: front = larger x+y
check('depth order', depthKey(5, 5) > depthKey(5, 4) && depthKey(4, 5) === depthKey(5, 4));

// 8 dirs
const names = DIR8.map((d) => d.name).join(',');
check('dir8 names', names === 'S,SW,W,NW,N,NE,E,SE');
check('dir count', DIR8.length === 8);

// diagonal normalization
const n = normalizeIntent(1, 1);
check('diagonal normalized', Math.abs(Math.hypot(n.dx, n.dy) - 1) < 1e-9);
check('cardinal not scaled', normalizeIntent(1, 0).dx === 1);

// direction index
check('dir E', directionIndex(1, 0) === 6);
check('dir S', directionIndex(0, 1) === 0);
check('dir NE', directionIndex(1, -1) === 5);
check('dir NW', directionIndex(-1, -1) === 3);
check('dir SE', directionIndex(1, 1) === 7);
check('dir zero', directionIndex(0, 0) === 0);

// walk grid
const g = new WalkGrid(10, 10, CELL_LAND);
g.rect(3, 3, 2, 2, CELL_BLOCKED);
g.set(0, 0, CELL_WATER);
g.set(9, 9, CELL_DOCK);
check('grid get', g.get(4, 4) === CELL_BLOCKED && g.get(0, 0) === CELL_WATER && g.get(9, 9) === CELL_DOCK);
check('out of bounds = water', g.get(-1, 5) === CELL_WATER);
check('walkable land', g.walkableAt(2, 2) && !g.walkableAt(0.5, 0.5));
check('blocked', !g.walkableAt(3.5, 3.5));
check('dock walkable', g.walkableAt(9, 9));
check('water not walkable', !g.walkableAt(0, 0));
const gw = new WalkGrid(20, 20, CELL_WATER);
gw.rect(0, 0, 20, 6, CELL_LAND);
check('waterAt open water', gw.waterAt(10, 12, 2));
check('waterAt near land blocked', !gw.waterAt(10, 5.5, 2) && !g.waterAt(0, 0));

// slide: full move blocked, slides along x
const g2 = new WalkGrid(10, 10, CELL_LAND);
g2.rect(5, 0, 1, 10, CELL_BLOCKED); // wall at x=5
const m1 = g2.moveCircle(4, 5, 2, 0, 0.35, false);
check('slide blocked x', m1.x < 5 && m1.y === 5);
const m2 = g2.moveCircle(4, 5, 2, 2, 0.35, false);
check('slide diagonal', m2.x < 5 || m2.y !== 5);
const m3 = g2.moveCircle(2, 2, 1, 0, 0.35, false);
check('free move', m3.x === 3 && m3.y === 2);

console.log(`\nISO TESTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
