// Temporarily revert Stage 2 flower/pine hunks in Vegetation.tsx to the
// pre-change geometry, so the BEFORE half of the A/B pair can be shot from
// the old world. Prints replacement counts; fails loudly on any miss.
import fs from 'fs';

const FILE = 'src/cloud-world-3d/Vegetation.tsx';
let src = fs.readFileSync(FILE, 'utf8');
let applied = 0;

function rev(name, before, after) {
  if (!src.includes(before)) { console.error('MISS: ' + name); process.exit(1); }
  src = src.replace(before, after);
  applied++;
}

// 1. TreeSpec framing flag
rev('treespec-flag',
`  kind: 'pine' | 'broadleaf';
  framing?: boolean; // framing pines: tiers widened ~15% (plan Stage 3)
};`,
`  kind: 'pine' | 'broadleaf';
};`);

// 2. framing: true in getTreeSpecs
rev('framing-true',
`      kind: 'pine',
      framing: true,
    });
  }
  treeSpecsSingleton = specs;`,
`      kind: 'pine',
    });
  }
  treeSpecsSingleton = specs;`);

// 3. pine tier widening
rev('tier-widen',
`      const dys = [1.0, 2.3, 3.4];
      // Framing pines: widen tiers ~15% (x/z only, height untouched) so they
      // read as mature flankers instead of tall thin spikes (plan Stage 3).
      const tierW = spec.framing ? 1.15 : 1.0;
      dys.forEach((dy, t) => {
        p.set(spec.x, baseY + dy * spec.scale, spec.z);
        s.set(spec.scale * tierW, spec.scale, spec.scale * tierW);
        m4.compose(p, q, s);`,
`      const dys = [1.0, 2.3, 3.4];
      dys.forEach((dy, t) => {
        p.set(spec.x, baseY + dy * spec.scale, spec.z);
        m4.compose(p, q, s);`);

// 4. flower construction
rev('flower-geo',
`    // Flowers: stem (thin cylinder) + squashed-sphere petal head, warm palette
    // (bare cones read as spikes — replaced per plan Stage 3). Same 40
    // deterministic placements (the rnd stream above is untouched). Two
    // instanced meshes share one placement matrix each: green stems, and
    // palette-tinted heads (instanceColor tints only the petals).
    const stemGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.34, 5);
    stemGeo.translate(0, 0.17, 0); // pivot at the base
    const headGeo = new THREE.SphereGeometry(0.11, 8, 6);
    headGeo.scale(1, 0.62, 1); // squashed dome = petal head, not a spike
    headGeo.translate(0, 0.38, 0);
    const stemMat = new THREE.MeshStandardMaterial({
      color: '#4A7A33',
      roughness: 0.9,
    });
    const flowerMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF', // multiplied by instanceColor (palette below)
      roughness: 0.7,
      emissive: '#3A2A10',
      emissiveIntensity: 0.25,
    });
    const stems = new THREE.InstancedMesh(stemGeo, stemMat, 40);
    const heads = new THREE.InstancedMesh(headGeo, flowerMat, 40);`,
`    // Flowers: tiny warm cones just off the path edges (wildflower read).
    const flowerGeo = new THREE.ConeGeometry(0.07, 0.18, 5);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.7,
      emissive: '#3A2A10',
      emissiveIntensity: 0.25,
    });
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 40);`);

// 5. placement loop + counts
rev('flower-loop',
`      e.set((rnd() - 0.5) * 0.2, rnd() * Math.PI, (rnd() - 0.5) * 0.2);
      q.setFromEuler(e);
      s.set(sc, sc, sc);
      // Geometry pivots at the stem base → sit exactly on the terrain.
      p.set(x, y, z);
      m4.compose(p, q, s);
      stems.setMatrixAt(fi, m4);
      heads.setMatrixAt(fi, m4);
      petal.set(palette[fi % palette.length]);
      heads.setColorAt(fi, petal);
      fi++;
    }
    stems.count = fi;
    heads.count = fi;
    stems.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;

    return { rocks, tufts, shrubs, stems, heads };`,
`      e.set((rnd() - 0.5) * 0.2, rnd() * Math.PI, (rnd() - 0.5) * 0.2);
      q.setFromEuler(e);
      s.set(sc, sc, sc);
      p.set(x, y + 0.09 * sc, z);
      m4.compose(p, q, s);
      flowers.setMatrixAt(fi, m4);
      petal.set(palette[fi % palette.length]);
      flowers.setColorAt(fi, petal);
      fi++;
    }
    flowers.count = fi;
    flowers.instanceMatrix.needsUpdate = true;
    if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;

    return { rocks, tufts, shrubs, flowers };`);

// 6. JSX render
rev('jsx',
`      <primitive object={parts.tufts} />
      <primitive object={parts.shrubs} />
      <primitive object={parts.stems} />
      <primitive object={parts.heads} />`,
`      <primitive object={parts.tufts} />
      <primitive object={parts.shrubs} />
      <primitive object={parts.flowers} />`);

fs.writeFileSync(FILE, src);
console.log('Reverted ' + applied + ' hunks. BEFORE-state Vegetation.tsx written.');
