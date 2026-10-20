
const { readFileSync } = require('fs');
const src = readFileSync('src/content/projects.cloud.ts', 'utf8');
const idx = src.indexOf("id: 'rxverify'");
const seg = src.slice(idx, idx + 3500);
const t0 = seg.indexOf('technologies:');
const t1 = seg.indexOf(']', t0);
console.log("rxverify technologies:", seg.slice(t0, t1 + 1).replace(/\s+/g, ' '));
// any mention of kubernetes in rxverify workflow?
const wf = seg.slice(seg.indexOf('workflow:'));
console.log("mentions kubernetes:", /kubernetes/i.test(wf));
