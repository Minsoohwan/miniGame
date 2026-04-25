import * as THREE from "three";

export type ItemKind = "speed" | "shield";

export type CanyonItem = {
  kind: ItemKind;
  root: THREE.Group;
  active: boolean;
  respawnTimer: number;
};

export type CanyonChunk = {
  startZ: number;
  leftMesh: THREE.Mesh;
  rightMesh: THREE.Mesh;
  leftGeo: THREE.BufferGeometry;
  rightGeo: THREE.BufferGeometry;
  leftTopMesh: THREE.Mesh;
  rightTopMesh: THREE.Mesh;
  leftTopGeo: THREE.BufferGeometry;
  rightTopGeo: THREE.BufferGeometry;
};

export type AirBackground = {
  world: THREE.Group;
  baseGround: THREE.Mesh;
  baseGroundGeo: THREE.PlaneGeometry;
  baseGroundMat: THREE.MeshStandardMaterial;
  canyonChunks: CanyonChunk[];
  canyonWallMat: THREE.MeshStandardMaterial;
  canyonTopMat: THREE.MeshStandardMaterial;
  chunkLength: number;
  rockMeshes: THREE.Mesh[];
  rockGeo: THREE.DodecahedronGeometry;
  rockMat: THREE.MeshStandardMaterial;
  items: CanyonItem[];
  itemHexGeo: THREE.CylinderGeometry;
  itemSpeedMat: THREE.MeshStandardMaterial;
  itemChevronMat: THREE.MeshStandardMaterial;
  itemShieldMat: THREE.MeshStandardMaterial;
  itemShieldRingGeo: THREE.TorusGeometry;
};

const GROUND_BASE_Y = -28;
const WALL_BASE_Y = GROUND_BASE_Y + 0.2;
const WALL_TOP_Y_BASE = GROUND_BASE_Y + 60;
const WALL_TOP_Y_MAX = GROUND_BASE_Y + 90; // safe ceiling for flight clamp + fog/cam far
const OUTER_WIDTH = 18;
const Y_LAYERS = 10; // vertical subdivisions per wall for stratified coloring

const CHUNK_COUNT = 6;
const CHUNK_LENGTH = 220;
const Z_STEP = 2;
const ROCK_COUNT = 70;
const ITEM_POOL_SIZE = 20;

const CENTER_OFFSET =
  Math.sin(1.2) * 6.5 + Math.sin(2.3) * 3.2; // makes centerX(0) = 0 so the plane spawns in the middle

// Difficulty ramps with distance travelled (|z|).  Both the rendered canyon and
// the collision test read from the same function, so geometry and physics stay
// in sync as the game gets harder.
const DIFFICULTY_RAMP_DISTANCE = 3000;

export function getDifficulty(z: number): number {
  const d = -z / DIFFICULTY_RAMP_DISTANCE;
  return d < 0 ? 0 : d > 1 ? 1 : d;
}

export function getCanyonProfile(z: number): { centerX: number; halfWidth: number } {
  const d = getDifficulty(z);
  const curveScale = 1 + 0.75 * d; // path curves more aggressively later on
  const widthScale = 1 - 0.4 * d; // corridor squeezes shut over time
  const minHalfWidth = 3.8;

  const centerX =
    (Math.sin(z * 0.022) * 14 +
      Math.sin(z * 0.047 + 1.2) * 6.5 +
      Math.sin(z * 0.011 + 2.3) * 3.2) *
      curveScale -
    CENTER_OFFSET * curveScale;

  const halfWidth =
    (8.5 +
      Math.sin(z * 0.018) * 3.0 +
      Math.sin(z * 0.055 + 0.7) * 1.8 +
      Math.sin(z * 0.009 + 2.1) * 0.9) *
    widthScale;

  return { centerX, halfWidth: Math.max(minHalfWidth, halfWidth) };
}

/**
 * Per-(z, y) bump applied to each wall so the rock face is not a perfectly
 * vertical plane.  side = -1 for the left wall, +1 for the right wall.  The
 * same function drives the rendered wall vertices and the collision test so
 * they match exactly.
 */
function wallBump(z: number, y: number, side: -1 | 1): number {
  const phase = side < 0 ? 0 : 2.7;
  return (
    Math.sin(z * 0.22 + y * 0.15 + phase) * 0.7 +
    Math.sin(z * 0.57 + y * 0.29 + phase * 1.3) * 0.4 +
    Math.sin(y * 0.11 + z * 0.05 + phase * 0.5) * 0.5 +
    Math.sin(z * 1.3 + y * 0.7 + phase) * 0.18
  );
}

/**
 * Inset-from-center distance of the actual rendered wall surface on a given side.
 * `halfWidth` already encodes corridor width, and `wallBump` adds the rugged surface.
 */
function wallInsetAt(z: number, y: number, side: -1 | 1): number {
  const { halfWidth } = getCanyonProfile(z);
  return halfWidth + wallBump(z, y, side);
}

export type CanyonSample = {
  centerX: number;
  halfWidth: number;
  leftHalf: number;
  rightHalf: number;
};

export function sampleCanyonAtZ(
  _bg: AirBackground,
  z: number,
  y = WALL_BASE_Y + 10,
): CanyonSample {
  const { centerX, halfWidth } = getCanyonProfile(z);
  return {
    centerX,
    halfWidth,
    leftHalf: halfWidth + wallBump(z, y, -1),
    rightHalf: halfWidth + wallBump(z, y, 1),
  };
}

function getWallTopY(z: number, side: -1 | 1): number {
  const sidePhase = side < 0 ? 0 : 3.3;
  return (
    WALL_TOP_Y_BASE +
    Math.sin(z * 0.015 + sidePhase) * 10 +
    Math.sin(z * 0.041 + 1.1 + sidePhase * 0.3) * 5 +
    Math.sin(z * 0.083 + 2.4 + sidePhase * 0.7) * 2.5 +
    Math.sin(z * 0.21 + sidePhase * 0.9) * 1.2
  );
}

function stratumColor(t: number, out: [number, number, number]) {
  // Horizontal stratification reminiscent of sedimentary canyon walls.
  // t = 0 at the canyon base, 1 at the wall top.
  if (t < 0.08) {
    out[0] = 0.3; out[1] = 0.18; out[2] = 0.12;
  } else if (t < 0.22) {
    out[0] = 0.55; out[1] = 0.29; out[2] = 0.18;
  } else if (t < 0.38) {
    out[0] = 0.74; out[1] = 0.43; out[2] = 0.22;
  } else if (t < 0.55) {
    out[0] = 0.84; out[1] = 0.58; out[2] = 0.33;
  } else if (t < 0.72) {
    out[0] = 0.68; out[1] = 0.44; out[2] = 0.25;
  } else if (t < 0.88) {
    out[0] = 0.86; out[1] = 0.68; out[2] = 0.45;
  } else {
    out[0] = 0.94; out[1] = 0.83; out[2] = 0.64;
  }
}

function clearGroup(group: THREE.Group) {
  while (group.children.length) group.remove(group.children[0]);
}

function assembleSpeedItem(
  root: THREE.Group,
  chevronMat: THREE.MeshStandardMaterial,
) {
  // Two yellow chevrons only (no red hex body), billboarded to camera by AirplanePage.
  const chevronBarGeo = new THREE.BoxGeometry(0.9, 0.24, 0.18);

  const makeChevron = (offsetY: number, scale = 1) => {
    const g = new THREE.Group();
    g.position.set(0, offsetY, -0.34);

    const left = new THREE.Mesh(chevronBarGeo, chevronMat);
    const right = new THREE.Mesh(chevronBarGeo, chevronMat);
    left.rotation.z = THREE.MathUtils.degToRad(35);
    right.rotation.z = THREE.MathUtils.degToRad(-35);
    left.position.set(-0.26 * scale, 0.12 * scale, 0);
    right.position.set(0.26 * scale, 0.12 * scale, 0);
    left.scale.setScalar(scale);
    right.scale.setScalar(scale);

    g.add(left, right);
    return g;
  };

  root.add(makeChevron(0.22, 1));
  root.add(makeChevron(-0.2, 0.9));
}

function assembleShieldItem(
  root: THREE.Group,
  ringGeo: THREE.TorusGeometry,
  ringMat: THREE.MeshStandardMaterial,
) {
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = THREE.MathUtils.degToRad(90);
    ring.rotation.y = (Math.PI * 2 * i) / 3;
    ring.userData.spinSpeed = 0.9 + i * 0.4;
    ring.userData.phase = (Math.PI * 2 * i) / 3;
    root.add(ring);
  }
}

function setItemKind(bg: AirBackground, item: CanyonItem, kind: ItemKind) {
  if (kind === item.kind && item.root.children.length > 0) return;
  clearGroup(item.root);
  if (kind === "speed") {
    assembleSpeedItem(item.root, bg.itemChevronMat);
  } else {
    assembleShieldItem(item.root, bg.itemShieldRingGeo, bg.itemShieldMat);
  }
  item.kind = kind;
}

function pickItemKindForZ(z: number): ItemKind {
  const d = getDifficulty(z);
  // d=0: 50% speed / 50% shield.  d=1: 90% speed / 10% shield.
  const speedProb = 0.5 + 0.4 * d;
  return Math.random() < speedProb ? "speed" : "shield";
}

function placeItem(bg: AirBackground, item: CanyonItem, z: number) {
  setItemKind(bg, item, pickItemKindForZ(z));

  // Spawn on two altitude bands so pickups appear both inside and above canyon flow.
  // Keep heights within player's reachable flight range.
  const isUpperLane = Math.random() < 0.42;
  const spawnY = isUpperLane
    ? WALL_BASE_Y + 18 + Math.random() * 11
    : WALL_BASE_Y + 7 + Math.random() * 4;

  const sample = sampleCanyonAtZ(bg, z, spawnY);
  const safeLeft = Math.max(1.2, sample.leftHalf - 2.6);
  const safeRight = Math.max(1.2, sample.rightHalf - 2.6);
  const minX = sample.centerX - safeLeft;
  const maxX = sample.centerX + safeRight;
  const laneX = minX + Math.random() * Math.max(0.2, maxX - minX);

  item.root.position.set(laneX, spawnY, z);
  if (item.kind === "shield") {
    item.root.rotation.y = Math.random() * Math.PI * 2;
  } else {
    item.root.rotation.set(0, 0, 0);
  }
  item.active = true;
  item.root.visible = true;
}

/**
 * Build a wall ribbon geometry.
 * For each z sample, creates two vertices (inner-bottom, inner-top) forming the canyon inside wall,
 * plus two vertices (outer-bottom, outer-top) forming the outside face of the cliff.
 * Result: a vertical quad strip that stands between the corridor and the outer desert.
 */
function makeWallGeometry(): THREE.BufferGeometry {
  const zSteps = Math.floor(CHUNK_LENGTH / Z_STEP) + 1;
  const vertsPerSlice = Y_LAYERS + 1;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(zSteps * vertsPerSlice * 3);
  const colors = new Float32Array(zSteps * vertsPerSlice * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const indices: number[] = [];
  for (let iz = 0; iz < zSteps - 1; iz++) {
    for (let iy = 0; iy < Y_LAYERS; iy++) {
      const a = iz * vertsPerSlice + iy;
      const b = iz * vertsPerSlice + iy + 1;
      const c = (iz + 1) * vertsPerSlice + iy;
      const d = (iz + 1) * vertsPerSlice + iy + 1;
      indices.push(a, c, d, a, d, b);
    }
  }
  geo.setIndex(indices);
  return geo;
}

function updateWallGeometry(
  geo: THREE.BufferGeometry,
  startZ: number,
  side: -1 | 1,
) {
  const zSteps = Math.floor(CHUNK_LENGTH / Z_STEP) + 1;
  const vertsPerSlice = Y_LAYERS + 1;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  const rgb: [number, number, number] = [0, 0, 0];
  for (let iz = 0; iz < zSteps; iz++) {
    const z = startZ - iz * Z_STEP;
    const { centerX } = getCanyonProfile(z);
    const topY = getWallTopY(z, side);
    for (let iy = 0; iy <= Y_LAYERS; iy++) {
      const t = iy / Y_LAYERS;
      const y = WALL_BASE_Y + (topY - WALL_BASE_Y) * t;
      const innerX = centerX + side * wallInsetAt(z, y, side);
      const idx = iz * vertsPerSlice + iy;
      pos.setXYZ(idx, innerX, y, z);
      // Bands tied to absolute altitude so strata stay horizontal regardless of
      // the jagged wall top.
      const altT = THREE.MathUtils.clamp(
        (y - WALL_BASE_Y) / (WALL_TOP_Y_MAX - WALL_BASE_Y),
        0,
        1,
      );
      stratumColor(altT, rgb);
      col.setXYZ(idx, rgb[0], rgb[1], rgb[2]);
    }
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

/**
 * Build the flat top cap that extends from the canyon inner edge out to the desert ground.
 * This gives the canyon actual visual thickness when viewed from above.
 */
function makeTopGeometry(): THREE.BufferGeometry {
  const zSteps = Math.floor(CHUNK_LENGTH / Z_STEP) + 1;
  const vertsPerSlice = 2; // inner-top, outer-top
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(zSteps * vertsPerSlice * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const indices: number[] = [];
  for (let iz = 0; iz < zSteps - 1; iz++) {
    const a = iz * vertsPerSlice; // inner current
    const b = iz * vertsPerSlice + 1; // outer current
    const c = (iz + 1) * vertsPerSlice; // inner next
    const d = (iz + 1) * vertsPerSlice + 1; // outer next
    indices.push(a, b, d, a, d, c);
  }
  geo.setIndex(indices);
  return geo;
}

function updateTopGeometry(
  geo: THREE.BufferGeometry,
  startZ: number,
  side: -1 | 1,
) {
  const zSteps = Math.floor(CHUNK_LENGTH / Z_STEP) + 1;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let iz = 0; iz < zSteps; iz++) {
    const z = startZ - iz * Z_STEP;
    const { centerX } = getCanyonProfile(z);
    const topY = getWallTopY(z, side);
    const innerX = centerX + side * wallInsetAt(z, topY, side);
    const outerX = innerX + side * OUTER_WIDTH;
    const idxInner = iz * 2;
    const idxOuter = iz * 2 + 1;
    pos.setXYZ(idxInner, innerX, topY, z);
    pos.setXYZ(idxOuter, outerX, topY - 2, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
}

function updateChunk(chunk: CanyonChunk) {
  updateWallGeometry(chunk.leftGeo, chunk.startZ, -1);
  updateWallGeometry(chunk.rightGeo, chunk.startZ, 1);
  updateTopGeometry(chunk.leftTopGeo, chunk.startZ, -1);
  updateTopGeometry(chunk.rightTopGeo, chunk.startZ, 1);
}

export function createAirBackground(scene: THREE.Scene): AirBackground {
  const world = new THREE.Group();
  scene.add(world);

  const baseGroundGeo = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  const baseGroundMat = new THREE.MeshStandardMaterial({
    color: 0xd7ad67,
    roughness: 1,
    metalness: 0,
  });
  const baseGround = new THREE.Mesh(baseGroundGeo, baseGroundMat);
  baseGround.rotation.x = -Math.PI / 2;
  baseGround.position.set(0, GROUND_BASE_Y, 0);
  world.add(baseGround);

  const canyonWallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const canyonTopMat = new THREE.MeshStandardMaterial({
    color: 0xc48a47,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const canyonChunks: CanyonChunk[] = [];
  for (let i = 0; i < CHUNK_COUNT; i++) {
    const leftGeo = makeWallGeometry();
    const rightGeo = makeWallGeometry();
    const leftTopGeo = makeTopGeometry();
    const rightTopGeo = makeTopGeometry();

    const leftMesh = new THREE.Mesh(leftGeo, canyonWallMat);
    const rightMesh = new THREE.Mesh(rightGeo, canyonWallMat);
    const leftTopMesh = new THREE.Mesh(leftTopGeo, canyonTopMat);
    const rightTopMesh = new THREE.Mesh(rightTopGeo, canyonTopMat);

    const startZ = -i * CHUNK_LENGTH;
    const chunk: CanyonChunk = {
      startZ,
      leftMesh,
      rightMesh,
      leftGeo,
      rightGeo,
      leftTopMesh,
      rightTopMesh,
      leftTopGeo,
      rightTopGeo,
    };
    updateChunk(chunk);
    canyonChunks.push(chunk);
    world.add(leftMesh, rightMesh, leftTopMesh, rightTopMesh);
  }

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x9e6f3f,
    roughness: 1,
    metalness: 0,
  });
  const rockMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < ROCK_COUNT; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(
      (Math.random() - 0.5) * 220,
      GROUND_BASE_Y + 0.2 + Math.random() * 2,
      -40 - Math.random() * 900,
    );
    const s = 0.8 + Math.random() * 3.2;
    rock.scale.set(
      s * (0.7 + Math.random() * 0.5),
      s * (0.5 + Math.random() * 0.7),
      s * (0.7 + Math.random() * 0.6),
    );
    rock.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI,
    );
    rockMeshes.push(rock);
    world.add(rock);
  }

  const itemHexGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.45, 6);
  const itemSpeedMat = new THREE.MeshStandardMaterial({
    color: 0xd11a1a,
    roughness: 0.6,
    metalness: 0.05,
  });
  const itemChevronMat = new THREE.MeshStandardMaterial({
    color: 0xf4d319,
    emissive: 0x7a6400,
    emissiveIntensity: 0.85,
    roughness: 0.28,
    metalness: 0.18,
  });
  const itemShieldRingGeo = new THREE.TorusGeometry(0.95, 0.08, 10, 28);
  const itemShieldMat = new THREE.MeshStandardMaterial({
    color: 0x8fe6ff,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
  });

  const bg: AirBackground = {
    world,
    baseGround,
    baseGroundGeo,
    baseGroundMat,
    canyonChunks,
    canyonWallMat,
    canyonTopMat,
    chunkLength: CHUNK_LENGTH,
    rockMeshes,
    rockGeo,
    rockMat,
    items: [],
    itemHexGeo,
    itemSpeedMat,
    itemChevronMat,
    itemShieldMat,
    itemShieldRingGeo,
  };

  const items: CanyonItem[] = [];
  for (let i = 0; i < ITEM_POOL_SIZE; i++) {
    // Empty root; setItemKind inside placeItem fills it based on difficulty.
    const root = new THREE.Group();
    const item: CanyonItem = { kind: "speed", root, active: true, respawnTimer: 0 };
    world.add(root);
    items.push(item);
  }
  bg.items = items;
  for (let i = 0; i < items.length; i++) {
    placeItem(bg, items[i], -120 - i * 90);
  }

  return bg;
}

export function recycleBackground(
  bg: AirBackground,
  anchor: THREE.Vector3,
  forward: THREE.Vector3,
  dt = 0,
) {
  bg.baseGround.position.x = anchor.x;
  bg.baseGround.position.z = anchor.z;

  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
  const delta = new THREE.Vector3();

  // Recycle canyon chunks: when a chunk is fully behind the plane, move it to the front.
  for (const chunk of bg.canyonChunks) {
    const chunkFarEnd = chunk.startZ - bg.chunkLength;
    if (chunkFarEnd > anchor.z + 80) {
      let farthest = bg.canyonChunks[0];
      for (const c of bg.canyonChunks) {
        if (c.startZ < farthest.startZ) farthest = c;
      }
      chunk.startZ = farthest.startZ - bg.chunkLength;
      updateChunk(chunk);
    }
  }

  for (const rock of bg.rockMeshes) {
    delta.subVectors(rock.position, anchor);
    const forwardDist = delta.dot(forward);
    if (forwardDist < -70) {
      rock.position
        .copy(anchor)
        .addScaledVector(forward, 240 + Math.random() * 700)
        .addScaledVector(right, (Math.random() - 0.5) * 220);
      rock.position.y = GROUND_BASE_Y + 0.2 + Math.random() * 2;
      rock.rotation.y += Math.PI * (0.2 + Math.random() * 0.7);
    }
  }

  for (const item of bg.items) {
    if (item.active && item.kind === "shield") {
      for (const ring of item.root.children) {
        ring.rotation.z += 0.01 * ((ring.userData.spinSpeed as number) ?? 1);
      }
    }

    delta.subVectors(item.root.position, anchor);
    const forwardDist = delta.dot(forward);
    if (!item.active) {
      item.respawnTimer = Math.max(0, item.respawnTimer - dt);
      if (item.respawnTimer > 0) continue;
      placeItem(bg, item, anchor.z - (260 + Math.random() * 900));
      continue;
    }
    if (forwardDist < -50) {
      const ahead = 260 + Math.random() * 900;
      placeItem(bg, item, anchor.z - ahead);
    }
  }
}

export function collectItem(
  bg: AirBackground,
  planePosition: THREE.Vector3,
): ItemKind | null {
  for (const item of bg.items) {
    if (!item.active) continue;
    const d = item.root.position.distanceTo(planePosition);
    const hitRadius = item.kind === "speed" ? 1.35 : 1.55;
    if (d < hitRadius) {
      item.active = false;
      item.root.visible = false;
      item.respawnTimer = 5 + Math.random() * 4;
      return item.kind;
    }
  }
  return null;
}

export function disposeAirBackground(bg: AirBackground) {
  bg.baseGroundGeo.dispose();
  bg.baseGroundMat.dispose();
  bg.canyonWallMat.dispose();
  bg.canyonTopMat.dispose();
  for (const chunk of bg.canyonChunks) {
    chunk.leftGeo.dispose();
    chunk.rightGeo.dispose();
    chunk.leftTopGeo.dispose();
    chunk.rightTopGeo.dispose();
  }
  bg.rockGeo.dispose();
  bg.rockMat.dispose();
  bg.itemHexGeo.dispose();
  bg.itemShieldRingGeo.dispose();
  bg.itemSpeedMat.dispose();
  bg.itemChevronMat.dispose();
  bg.itemShieldMat.dispose();
}
