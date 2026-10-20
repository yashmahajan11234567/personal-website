
const { readFileSync } = require('fs');
const skills = readFileSync('src/content/skills.cloud.ts', 'utf8') + readFileSync('src/content/skills.data.ts', 'utf8');
const projects = readFileSync('src/content/projects.cloud.ts', 'utf8');
// any remaining experienceType: 'TRAINING' in cloud skills?
const trainingIds = [...skills.matchAll(/id: '([\w-]+)',[\s\S]{0,400}?experienceType: '(TRAINING)'/g)].map(m => m[1]);
console.log('TRAINING skills now:', trainingIds);
// does any TRAINING name leak into projects?
const leaks = trainingIds.filter(id => {
  const name = skills.match(new RegExp("id: '" + id + "',[\\s\\S]{0,200}?name: '([^']+)'"));
  return name && new RegExp(name[1].split(' / ')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(projects.replace(/k8s\/[\w-]*/g,''));
});
console.log('leaks:', leaks);
