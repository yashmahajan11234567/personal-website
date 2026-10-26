import * as THREE from 'three';
import { buildMountainSurface } from './src/cloud-world-3d/mountainSurface';
import { pathCenterX, terrainHeight } from './src/cloud-world-3d/world';

// replicate mountain params
const TUNNEL_Z0 = 100;
const TUNNEL_Z1 = 170;
const Z_START = TUNNEL_Z0 - 42;
const Z_END = TUNNEL_Z1 + 16;
const HALF_W = 88;
const PEAK_H = 52;

const skew = (z0, h, sl, sr) => (z) => h * (z <= z0 ? Math.exp(-((z-z0)**2)/(2*sl*sl)) : Math.exp(-((z-z0)**2)/(2*sr*sr)));
const pBrow = skew(97,9,8,8);
const pLeft = skew(120,38,10,13);
const pMain = skew(150,PEAK_H,10,13);
const pRight = skew(178,36,14,18);
const ridgeNoise = (z) => (3.5*Math.sin(z*0.23+1.7)+2.0*Math.sin(z*0.41+0.4))*Math.min(1,Math.max(0,(z-90)/14));
const crestLine = (z) => Math.max(0, Math.max(pBrow(z),pLeft(z),pMain(z),pRight(z))+ridgeNoise(z));
const halfWidthAt = (_z, crest) => { const t=Math.min(1,Math.max(0,crest/PEAK_H)); return HALF_W - (HALF_W-30)*t; };
const ROOF_CROWN=6.2, CORRIDOR_EDGE=6.5;
const crestHeight = (z,x) => {
  const cx = pathCenterX(z);
  const corridorDist = Math.abs(x-cx);
  const crest = crestLine(z);
  const hw = halfWidthAt(z,crest);
  const u = corridorDist/hw;
  if(u>=1) return 0;
  const fallAmt = 0.55 + 0.25 * Math.min(1,Math.max(0,(z-150)/50));
  const spur = 1 + 0.35*Math.sin(z*0.19+x*0.16)+0.2*Math.sin(z*0.37-x*0.31);
  const latFall = Math.min(1.15,(1-fallAmt*Math.pow(u,1.5))*spur);
  const inTunnel = z>=TUNNEL_Z0 && z<=TUNNEL_Z1;
  if(inTunnel && corridorDist < CORRIDOR_EDGE) {
    const t = 1 - corridorDist/CORRIDOR_EDGE;
    const roof = ROOF_CROWN*t*t;
    const edgeBlend = Math.min(1,Math.max(0,(corridorDist - (CORRIDOR_EDGE-2.2))/2.2));
    edgeBlend = edgeBlend*edgeBlend;
    // simplified
    const flankHere = crest*latFall;
    return roof + (flankHere-roof)*edgeBlend;
  }
  if(!inTunnel && corridorDist < CORRIDOR_EDGE) return 0;
  const lift = 1 - Math.pow((corridorDist - CORRIDOR_EDGE)/Math.max(1,CORRIDOR_EDGE*2.2), 2);
  const flank = crest*latFall*Math.min(1,Math.max(0,lift));
  const MOUTH_FLOOR=4.5, EXIT_FLOOR=4.5;
  const floorZ = MOUTH_FLOOR * Math.min(1,Math.max(0,(z-84)/8)) * (1 - Math.min(1,Math.max(0,(z-103)/11)));
  const floor = floorZ * Math.min(1,(corridorDist - CORRIDOR_EDGE)/2);
  const floorX = EXIT_FLOOR * Math.min(1,Math.max(0,(z-158)/8)) * (1 - Math.min(1,Math.max(0,(z-174)/10)));
  const floorExit = floorX * Math.min(1,(corridorDist - CORRIDOR_EDGE)/2);
  return Math.max(flank,floor,floorExit);
};

const geo = buildMountainSurface({zStart:Z_START,zEnd:Z_END,zStep:5,halfWidth:HALF_W,seed:501,crestHeight,edgeFloor:0.12,halfWidthAt}, pathCenterX, terrainHeight);
console.log('pos count:', geo.attributes.position.count);
console.log('has index:', !!geo.index);
console.log('has bottom faces:', 'unknown - need to inspect');
// check if there are faces connecting base points
const pos = geo.attributes.position;
const groups = Math.floor(pos.count/3);
console.log('triangles:', groups);
