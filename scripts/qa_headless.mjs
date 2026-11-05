// Headless QA for the Cloud World (River Expedition) — no browser required.
import { readFileSync, statSync } from 'node:fs';
const base = 'public/assets/iso';
const atlases = {};
for (const a of ['shared','welcome','skills','projects','character','boat']) {
  atlases[a] = JSON.parse(readFileSync(`${base}/${a}.json`, 'utf8')).frames;
}
const map = JSON.parse(readFileSync(`${base}/map.json`, 'utf8'));
let fails = 0, passes = 0;
function t(name, cond) { if (cond) passes++; else { fails++; console.error('FAIL:', name); } }

// --- atlas/frame consistency ---
for (const h of map.hotspots) {
  const fr = atlases[h.atlas][h.frame];
  t(`hotspot ${h.id} frame ${h.frame} in ${h.atlas}`, !!fr);
  if (fr && (fr.frame.w < 4 || fr.frame.h < 4)) t(`hotspot ${h.id} frame not degenerate`, false);
}
for (const p of map.placements) {
  t(`placement frame ${p.frame} in ${p.atlas}`, !!atlases[p.atlas][p.frame]);
}
// content ids resolve to atlases
const knownContent = new Set();
for (const h of map.hotspots) knownContent.add(h.contentId);

// --- atlas budgets ---
const sizes = {};
for (const a of Object.keys(atlases)) sizes[a] = (statSync(`${base}/${a}.png`).size / 1024);
t('shared atlas <= 400 KB', sizes.shared <= 400);
t('welcome atlas <= 400 KB', sizes.welcome <= 400);
t('skills atlas <= 400 KB', sizes.skills <= 400);
t('projects atlas <= 400 KB', sizes.projects <= 400);
t('character sheet <= 200 KB', sizes.character <= 200);
t('boat sheet <= 150 KB', sizes.boat <= 150);
console.log('atlas sizes (KB):', sizes);

// --- content mapping: 10 cloud skills across 5 stations, no python/sql in cloud world ---
const stationSkills = new Set();
for (const h of map.hotspots) if (h.skills) h.skills.forEach((id) => stationSkills.add(id));
const expected = new Set(['git','docker','health-checks','compose','ci-cd','terraform','ansible','container-hardening','observability','kubernetes']);
t('10/10 cloud skills represented', stationSkills.size === 10 && [...stationSkills].every((id) => expected.has(id)) && [...expected].every((id) => stationSkills.has(id)));
t('no python/sql in cloud-world stations', !stationSkills.has('python') && !stationSkills.has('sql'));
// skill records exist in content model (need TS import via tsx? use grep instead)
const skillsSrc = readFileSync('src/content/skills.cloud.ts','utf8');
for (const id of [...expected]) t(`skill record ${id} in content model`, skillsSrc.includes(`id: '${id}'`));
const projectsSrc = readFileSync('src/content/projects.cloud.ts','utf8');
for (const id of ['rxverify','devops-masterclass','go-microservices']) t(`project record ${id} in content model`, projectsSrc.includes(`id: '${id}'`));

// --- world consistency ---
const WATER=0, LAND=1, DOCK=2, BLOCKED=3;
const cells = map.cells;
const idx = (x,y) => y*map.w + x;
for (const d of map.docks) {
  const inside = cells[idx(Math.round(d.pierX), Math.round(d.pierY))] === DOCK || cells[idx(Math.round(d.pierX), Math.round(d.pierY))] === LAND;
  t(`dock ${d.id} pier on land/dock cell`, inside);
}
const spawnCell = cells[idx(Math.round(map.spawn.x), Math.round(map.spawn.y))];
t('spawn on land/dock', spawnCell === LAND || spawnCell === DOCK);
const boatCell = cells[idx(Math.round(map.boatSpawn.x), Math.round(map.boatSpawn.y))];
t('boat spawn in water', boatCell === WATER);
t('3 docks defined', map.docks.length === 3);
t('12 hotspots', map.hotspots.length === 12);

// --- movement logic ---
import('../src/cloud-world-iso/iso.ts').then(m => {
  const { normalizeIntent, directionIndex, WalkGrid, CELL_LAND, CELL_WATER, CELL_DOCK, CELL_BLOCKED } = m;
  const g = new WalkGrid(12, 12, CELL_LAND);
  g.rect(5, 0, 1, 12, CELL_BLOCKED); // wall x=5
  // diagonal normalization
  const n = normalizeIntent(1, 1);
  t('diagonal normalized', Math.abs(Math.hypot(n.dx, n.dy) - 1) < 1e-9);
  // slide along wall
  let mv = g.moveCircle(4, 5, 2, 0, 0.35, false);
  t('slide blocked x', mv.x < 5 && mv.y === 5);
  // water-only boat movement
  const gw = new WalkGrid(12, 12, CELL_WATER);
  mv = gw.moveCircle(6, 6, 2, 0, 2, true);
  t('boat moves on water', mv.x === 8 && mv.y === 6);
  gw.rect(4, 4, 4, 4, CELL_LAND); // island in water
  mv = gw.moveCircle(6, 6, 2, 0, 2, true);
  t('boat blocked by island', mv.x !== 8 || mv.y !== 6);
  // direction index
  t('dir E', directionIndex(1,0) === 6);
  t('dir S', directionIndex(0,1) === 0);
  t('dir NE', directionIndex(1,-1) === 5);
  t('dir NW', directionIndex(-1,-1) === 3);
  console.log(`\nHEADLESS QA: ${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
});
