
const { readFileSync } = require('fs');
console.log(readFileSync('src/cloud-world-3d/categories.ts', 'utf8').split('CATEGORY_COVER_NOTES')[0].slice(-1600));
