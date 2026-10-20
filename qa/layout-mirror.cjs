// Offline mirror of the Signs.tsx layout for the three project titles.
const tw = 2048, th = 1024;
const TITLE_FONT = "Georgia, 'Times New Roman', serif";
function wrapTitle(measure, title, maxW, maxLines) {
  const words = title.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const cand = cur ? cur + ' ' + wd : wd;
    if (measure(cand, cur) <= maxW || !cur) cur = cand;
    else { lines.push(cur); cur = wd; if (lines.length === maxLines - 1) break; }
  }
  if (cur) lines.push(cur);
  if (lines.join(' ') !== title) {
    const rest = words.slice(lines.reduce((n, l) => n + l.split(/\s+/).length, 0)).join(' ');
    if (rest) lines[lines.length - 1] += ' ' + rest;
  }
  return lines;
}
const titles = [
  'RxVerify — Digital Prescription Verification',
  'MediGen — OCR Document Pipeline',
  'Go Microservices — Real-Time Balance Visibility',
];
for (const t of titles) {
  const measure = (s) => s.length * 0.52; // approx Georgia bold
  const maxW = tw * 0.74, maxH = th * 0.84, floor = 300;
  let size = 520;
  let result = null;
  for (const n of [1, 2, 3]) {
    let s = size;
    for (let i = 0; i < 60; i++) {
      const wrapped = n === 1 ? [t] : wrapTitle(measure, t, maxW, n);
      const widest = Math.max(...wrapped.map((l) => measure(l)));
      const totalH = s * 1.08 * wrapped.length;
      if (widest <= maxW && totalH <= maxH) { result = { n: wrapped.length, s, wrapped }; break; }
      if (s <= floor) { if (totalH <= maxH) { result = { n: wrapped.length, s, wrapped }; } break; }
      s -= 12;
    }
    if (result) break;
  }
  console.log('title: ' + t);
  console.log('  layout: ' + JSON.stringify(result));
}
