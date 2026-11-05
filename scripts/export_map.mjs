// Export worldMap.ts -> public/assets/iso/map.json (single source of truth).
import { buildMap } from '../src/cloud-world-iso/worldMap.ts';
import { writeFileSync } from 'node:fs';
const data = buildMap();
writeFileSync(new URL('../public/assets/iso/map.json', import.meta.url), JSON.stringify(data));
console.log('map.json written:', data.w + 'x' + data.h, '| hotspots:', data.hotspots.length, '| placements:', data.placements.length, '| docks:', data.docks.map(d => d.id).join(','));
