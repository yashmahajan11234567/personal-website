/**
 * Harbour — Stylized procedural buildings (Garden Warfare aesthetic).
 * Welcome Tavern, Lighthouse, Warehouse, Dock, Props — all cohesive art direction.
 */
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD } from '../world';

/**
 * Build a stylized tapered roof geometry (curved, overhanging)
 */
function createRoofGeometry(baseW: number, baseD: number, height: number, segments = 8) {
  const geo = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  // Center top
  vertices.push(0, height, 0);
  uvs.push(0.5, 0.5);
  normals.push(0, 1, 0);

  // Base ring vertices
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const rW = baseW * 0.55;
    const rD = baseD * 0.55;
    const x = Math.cos(a) * rW;
    const z = Math.sin(a) * rD;
    vertices.push(x, 0, z);
    uvs.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
    // Normal pointing outward and up
    normals.push(Math.cos(a) * 0.7, 0.7, Math.sin(a) * 0.7);
  }

  // Triangulate roof (fan from center)
  for (let i = 1; i <= segments; i++) {
    const next = i === segments ? 1 : i + 1;
    indices.push(0, i, next);
  }

  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Stylized Welcome Tavern — curved roof, colorful, welcoming
 */
export function WelcomeBuilding() {
  const group = useMemo(() => new THREE.Group(), []);

  useMemo(() => {
    // Main building body
    const bodyGeo = new THREE.BoxGeometry(10, 5.5, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd45a4a,      // warm terracotta red
      roughness: 0.85,
      metalness: 0.0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.75;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Curved roof
    const roofGeo = createRoofGeometry(11, 9, 3.5, 12);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x8b3a2a,      // dark terracotta roof tiles
      roughness: 0.9,
      metalness: 0.0,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 5.5;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Chimney
    const chimneyGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
    const chimneyMat = new THREE.MeshStandardMaterial({
      color: 0x7a3a2a,
      roughness: 0.9,
    });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(3.5, 7.5, 2.5);
    chimney.castShadow = true;
    group.add(chimney);

    // Door
    const doorGeo = new THREE.PlaneGeometry(1.8, 2.8);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x4a2a1a,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.4, 4.01);
    group.add(door);

    // Windows (4)
    const winGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfff8d8,
      roughness: 0.1,
      metalness: 0.1,
      emissive: new THREE.Color(0xfff0c0),
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const winPositions = [
      [-3, 3.5, 4.01], [3, 3.5, 4.01],  // front
      [-3, 3.5, -4.01], [3, 3.5, -4.01], // back
    ];
    winPositions.forEach((pos, _i) => {
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(pos[0], pos[1], pos[2]);
      if (pos[2] < 0) win.rotation.y = Math.PI;
      group.add(win);
    });

    // Welcome sign above door
    const signGeo = new THREE.BoxGeometry(4, 0.8, 0.15);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xf0d860,
      roughness: 0.7,
      emissive: new THREE.Color(0xfff0a0),
      emissiveIntensity: 0.2,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 5.0, 4.2);
    group.add(sign);

    // Lanterns by door
    const lanternGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const lanternMat = new THREE.MeshBasicMaterial({
      color: 0xffca5f,
      transparent: true,
      opacity: 0.9,
    });
    [-1.2, 1.2].forEach(x => {
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(x, 2.8, 4.2);
      group.add(lantern);
      // Point light
      const light = new THREE.PointLight(0xffca5f, 2, 8);
      light.position.set(x, 2.8, 4.2);
      group.add(light);
    });
  }, []);

  const pos = { x: 12, z: -8 };
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={group} />
    </group>
  );
}

/**
 * Stylized Lighthouse — tall, distinctive, with rotating light beam
 */
export function Lighthouse() {
  const group = useMemo(() => new THREE.Group(), []);
  const lightRef = useMemo(() => ({ current: null as THREE.SpotLight | null }), []);

  useMemo(() => {
    // Tower base
    const baseGeo = new THREE.CylinderGeometry(2.2, 2.8, 4, 12);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Red stripes
    const stripeGeo = new THREE.CylinderGeometry(2.25, 2.85, 0.5, 12, 1, true);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xc03030,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 1.5 + i * 1.3;
      group.add(stripe);
    }

    // Tower mid
    const midGeo = new THREE.CylinderGeometry(1.5, 2.0, 10, 12);
    const midMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const mid = new THREE.Mesh(midGeo, midMat);
    mid.position.y = 8;
    mid.castShadow = true;
    mid.receiveShadow = true;
    group.add(mid);

    // More stripes
    for (let i = 0; i < 4; i++) {
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = 5.5 + i * 1.3;
      group.add(stripe);
    }

    // Lantern room
    const lanternGeo = new THREE.CylinderGeometry(1.8, 1.8, 2.5, 12);
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.y = 15.5;
    lantern.castShadow = true;
    group.add(lantern);

    // Lantern glass (emissive)
    const glassGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.8, 12);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xfff5c0,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 15.5;
    group.add(glass);

    // Roof cone
    const roofGeo = new THREE.ConeGeometry(2.0, 2.5, 12);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xc03030, roughness: 0.9 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 18.25;
    roof.castShadow = true;
    group.add(roof);

    // Top ornament
    const orbGeo = new THREE.SphereGeometry(0.35, 12, 8);
    const orbMat = new THREE.MeshStandardMaterial({ color: 0xf0d860, roughness: 0.2, metalness: 0.8 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 19.5;
    group.add(orb);

    // Spot light for rotating beam
    const spot = new THREE.SpotLight(0xfff5c0, 30, 80, Math.PI / 8, 0.3, 1);
    spot.position.set(0, 16.5, 0);
    spot.target.position.set(0, 0, -30);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    group.add(spot);
    group.add(spot.target);
    lightRef.current = spot;

    // Window accents
    const winGeo = new THREE.PlaneGeometry(0.5, 0.7);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfff5c0,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0xfff0a0),
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.1,
    });
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(Math.cos(a) * 1.85, 6 + ring * 3.5, Math.sin(a) * 1.85);
        win.lookAt(0, win.position.y, 0);
        group.add(win);
      }
    }
  }, []);

  // Animate rotating beam
  useFrame(() => {
    if (lightRef.current) {
      const t = performance.now() * 0.0005;
      lightRef.current.target.position.set(Math.sin(t) * 30, 0, -Math.cos(t) * 30);
      lightRef.current.target.updateMatrixWorld();
    }
  });

  const pos = { x: -22, z: 24 };
  return (
    <group position={[pos.x, 0, pos.z]}>
      <primitive object={group} />
    </group>
  );
}

/**
 * Stylized Warehouse — for "Projects Harbour" sign
 */
export function Warehouse() {
  const group = useMemo(() => new THREE.Group(), []);

  useMemo(() => {
    // Main body
    const bodyGeo = new THREE.BoxGeometry(14, 6, 10);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8ca87a,      // muted sage green
      roughness: 0.9,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Gabled roof
    const roofGeo = createRoofGeometry(15, 11, 3, 8);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x5a6a4a,
      roughness: 0.95,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 6;
    roof.castShadow = true;
    group.add(roof);

    // Large cargo doors (front)
    const doorGeo = new THREE.PlaneGeometry(3.5, 4.5);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x5a5048,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    [-3.5, 3.5].forEach(x => {
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(x, 2.5, 5.01);
      group.add(door);
    });

    // Windows
    const winGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xa8c898,
      roughness: 0.2,
      emissive: new THREE.Color(0x90c080),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide,
    });
    for (let x = -5; x <= 5; x += 3.5) {
      for (let y = 1.5; y <= 4.5; y += 3) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(x, y, 5.01);
        group.add(win);
        const win2 = new THREE.Mesh(winGeo, winMat);
        win2.position.set(x, y, -5.01);
        win2.rotation.y = Math.PI;
        group.add(win2);
      }
    }

    // Sign board
    const signGeo = new THREE.BoxGeometry(5, 1.2, 0.15);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xf0d860,
      roughness: 0.6,
      emissive: new THREE.Color(0xfff0a0),
      emissiveIntensity: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 7.5, 5.5);
    group.add(sign);

    // Lanterns
    const lanternGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const lanternMat = new THREE.MeshBasicMaterial({
      color: 0xffca5f,
      transparent: true,
      opacity: 0.9,
    });
    [-6, 6].forEach(x => {
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(x, 4, 5.2);
      group.add(lantern);
      const light = new THREE.PointLight(0xffca5f, 1.5, 6);
      light.position.set(x, 4, 5.2);
      group.add(light);
    });
  }, []);

  const pos = { x: 28, z: -18 };
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, Math.PI / 4, 0]}>
      <primitive object={group} />
    </group>
  );
}

/**
 * Stylized Dock — wooden pier with posts
 */
export function Dock() {
  const plankGeo = new THREE.BoxGeometry(12, 0.2, 6);
  const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.5, 8);
  const plankMat = new THREE.MeshStandardMaterial({
    color: 0x7a5a3a,
    roughness: 0.95,
  });
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x4a3220,
    roughness: 0.95,
  });

  const posts: { x: number; z: number }[] = [];
  for (let x = WORLD.DOCK.x0; x <= WORLD.DOCK.x1; x += 3) {
    posts.push({ x, z: WORLD.DOCK.z0 - 0.4 });
    posts.push({ x, z: WORLD.DOCK.z1 + 0.4 });
  }

  return (
    <group>
      {/* Deck planks — slightly weathered */}
      <mesh
        geometry={plankGeo}
        material={plankMat}
        position={[(WORLD.DOCK.x0 + WORLD.DOCK.x1) / 2, WORLD.DOCK.y, 0]}
        receiveShadow
      />
      {/* Posts */}
      {posts.map((p, i) => (
        <mesh
          key={i}
          geometry={postGeo}
          material={postMat}
          position={[p.x, WORLD.DOCK.y + 0.75, p.z]}
          castShadow
          receiveShadow
        />
      ))}
      {/* Railing posts */}
      {posts.map((p, i) => (
        <mesh
          key={`rail-${i}`}
          geometry={new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6)}
          material={postMat}
          position={[p.x, WORLD.DOCK.y + 1.25, p.z]}
          castShadow
        />
      ))}
      {/* Top rail */}
      <mesh
        geometry={new THREE.BoxGeometry(WORLD.DOCK.x1 - WORLD.DOCK.x0 + 6, 0.12, 0.12)}
        material={plankMat}
        position={[(WORLD.DOCK.x0 + WORLD.DOCK.x1) / 2, WORLD.DOCK.y + 1.5, WORLD.DOCK.z0 - 0.8]}
        castShadow
      />
      <mesh
        geometry={new THREE.BoxGeometry(WORLD.DOCK.x1 - WORLD.DOCK.x0 + 6, 0.12, 0.12)}
        material={plankMat}
        position={[(WORLD.DOCK.x0 + WORLD.DOCK.x1) / 2, WORLD.DOCK.y + 1.5, WORLD.DOCK.z1 + 0.8]}
        castShadow
      />
    </group>
  );
}

/**
 * Dock Props — crates, barrels, lanterns (procedural)
 */
export function DockProps() {
  // Crate
  const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });

  // Barrel
  const barrelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.7, 12);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.85 });

  // Lantern
  const lanternGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const lanternMat = new THREE.MeshBasicMaterial({
    color: 0xffca5f,
    transparent: true,
    opacity: 0.9,
  });

  const props = [
    { type: 'crate', x: 25.5, z: -1.8, rot: 0.3 },
    { type: 'crate', x: 26.8, z: -2.2, rot: -0.2 },
    { type: 'crate', x: 28.0, z: 1.5, rot: 0.5 },
    { type: 'barrel', x: 29.5, z: -1.5, rot: 0 },
    { type: 'barrel', x: 31.0, z: 2.0, rot: 0 },
    { type: 'lamp', x: 25, z: 2.8, rot: 0 },
    { type: 'lamp', x: 34, z: -2.8, rot: 0 },
  ];

  return (
    <group>
      {props.map((prop, idx) => {
        if (prop.type === 'crate') {
          return (
            <mesh
              key={`crate-${idx}`}
              geometry={crateGeo}
              material={crateMat}
              position={[prop.x, WORLD.DOCK.y + 0.4, prop.z]}
              rotation={[0, prop.rot, 0]}
              castShadow
              receiveShadow
            />
          );
        }
        if (prop.type === 'barrel') {
          return (
            <mesh
              key={`barrel-${idx}`}
              geometry={barrelGeo}
              material={barrelMat}
              position={[prop.x, WORLD.DOCK.y + 0.35, prop.z]}
              rotation={[0, prop.rot, 0]}
              castShadow
              receiveShadow
            />
          );
        }
        if (prop.type === 'lamp') {
          return (
            <group key={`lamp-${idx}`} position={[prop.x, WORLD.DOCK.y, prop.z]}>
              <mesh
                geometry={new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8)}
                material={new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })}
                castShadow
              />
              <mesh
                geometry={lanternGeo}
                material={lanternMat}
                position={[0, 3.2, 0]}
              />
              <pointLight
                color="#ffca5f"
                intensity={3}
                distance={12}
                position={[0, 3.5, 0]}
              />
            </group>
          );
        }
        return null;
      })}
    </group>
  );
}

/**
 * Main harbour group
 */
export function Harbour() {
  return (
    <group>
      <Dock />
      <DockProps />
      <WelcomeBuilding />
      <Lighthouse />
      <Warehouse />
    </group>
  );
}