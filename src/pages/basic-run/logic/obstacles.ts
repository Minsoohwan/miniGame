import * as THREE from "three";
import type { HumanPlayer } from "./player";

export type ObstacleKind = "gear" | "car" | "crate" | "barrel" | "cone";

export type SpinDirs = { x: number; y: number; z: number };

export function randomSpinDirs(): SpinDirs {
  return {
    x: Math.random() < 0.5 ? -1 : 1,
    y: Math.random() < 0.5 ? -1 : 1,
    z: Math.random() < 0.5 ? -1 : 1,
  };
}

export function disposeObstacleGraph(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m.dispose();
    }
  });
}

function createObstacleGear(): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = "gear" satisfies ObstacleKind;
  const metal = new THREE.MeshStandardMaterial({
    color: 0x8a9099,
    roughness: 0.32,
    metalness: 0.78,
  });
  const rust = new THREE.MeshStandardMaterial({
    color: 0x7a6048,
    roughness: 0.55,
    metalness: 0.35,
  });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.1, 12, 36),
    metal,
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.48;
  g.add(ring);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.14, 14),
    rust,
  );
  hub.rotation.x = Math.PI / 2;
  hub.position.y = 0.48;
  g.add(hub);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.12),
      metal,
    );
    const r = 0.56;
    tooth.position.set(Math.cos(a) * r, 0.48, Math.sin(a) * r);
    tooth.rotation.y = -a + Math.PI / 2;
    g.add(tooth);
  }
  return g;
}

function createObstacleCar(): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = "car" satisfies ObstacleKind;

  const body = new THREE.MeshStandardMaterial({
    color: 0xc42c2c,
    roughness: 0.45,
    metalness: 0.35,
  });
  const bumper = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e,
    roughness: 0.55,
    metalness: 0.4,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1e3a52,
    roughness: 0.15,
    metalness: 0.65,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x141418,
    roughness: 0.92,
  });

  const lower = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 0.34, 0.66),
    body,
  );
  lower.position.y = 0.36;
  g.add(lower);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.3, 0.55),
    glass,
  );
  cabin.position.set(0, 0.62, -0.05);
  g.add(cabin);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 0.52),
    body,
  );
  roof.position.set(0, 0.78, -0.05);
  g.add(roof);

  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.16, 0.32),
    body,
  );
  hood.position.set(0, 0.38, 0.4);
  g.add(hood);

  const bumpF = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.12, 0.12),
    bumper,
  );
  bumpF.position.set(0, 0.22, 0.38);
  g.add(bumpF);

  const positions: [number, number, number][] = [
    [-0.52, 0.13, 0.3],
    [0.52, 0.13, 0.3],
    [-0.52, 0.13, -0.3],
    [0.52, 0.13, -0.3],
  ];
  for (const [x, y, z] of positions) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.1, 14),
      rubber,
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    w.userData.isWheel = true;
    g.add(w);
  }
  return g;
}

function createObstacleCrate(): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = "crate" satisfies ObstacleKind;
  const wood = new THREE.MeshStandardMaterial({
    color: 0x9a7b2c,
    roughness: 0.88,
  });
  const plank = new THREE.MeshStandardMaterial({
    color: 0x6b5220,
    roughness: 0.9,
  });

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.94, 0.94),
    wood,
  );
  box.position.y = 0.47;
  g.add(box);

  const strapT = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.08, 0.08),
    plank,
  );
  strapT.position.y = 0.47;
  g.add(strapT);

  const strapV = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.02, 0.08),
    plank,
  );
  strapV.position.y = 0.47;
  g.add(strapV);

  const strapH = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 1.02),
    plank,
  );
  strapH.position.y = 0.47;
  g.add(strapH);
  return g;
}

function createObstacleBarrel(): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = "barrel" satisfies ObstacleKind;
  const stave = new THREE.MeshStandardMaterial({
    color: 0x6b4428,
    roughness: 0.72,
  });
  const band = new THREE.MeshStandardMaterial({
    color: 0x4a3520,
    roughness: 0.5,
    metalness: 0.45,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.4, 1.02, 18),
    stave,
  );
  body.position.y = 0.51;
  g.add(body);

  for (const y of [0.28, 0.52, 0.78]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.035, 8, 28),
      band,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  return g;
}

function createObstacleCone(): THREE.Group {
  const g = new THREE.Group();
  g.userData.kind = "cone" satisfies ObstacleKind;
  const orange = new THREE.MeshStandardMaterial({
    color: 0xff5e2e,
    roughness: 0.62,
  });
  const white = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.75,
  });

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.7, 14),
    orange,
  );
  cone.position.y = 0.35 + 0.04;
  g.add(cone);

  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.32, 0.1, 14),
    white,
  );
  stripe.position.y = 0.38;
  g.add(stripe);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.4, 0.08, 16),
    orange,
  );
  base.position.y = 0.04;
  g.add(base);
  return g;
}

const OBSTACLE_BUILDERS = [
  createObstacleGear,
  createObstacleCar,
  createObstacleCrate,
  createObstacleBarrel,
  createObstacleCone,
] as const;

const MIN_SPAWN_CENTER_DIST_X = 1.42;
const MIN_SPAWN_CENTER_DIST_Z = 1.55;

function overlapsSpawn(obstacles: THREE.Group[], x: number, z: number) {
  for (const o of obstacles) {
    if (!o.visible) continue;
    const dx = Math.abs(x - o.position.x);
    const dz = Math.abs(z - o.position.z);
    if (dx < MIN_SPAWN_CENTER_DIST_X && dz < MIN_SPAWN_CENTER_DIST_Z) {
      return true;
    }
  }
  return false;
}

export function createObstaclePool(
  scene: THREE.Scene,
  poolSize: number,
): THREE.Group[] {
  const obstacles: THREE.Group[] = [];
  for (let i = 0; i < poolSize; i++) {
    const build =
      OBSTACLE_BUILDERS[
        Math.floor(Math.random() * OBSTACLE_BUILDERS.length)
      ];
    const grp = build();
    grp.visible = false;
    scene.add(grp);
    obstacles.push(grp);
  }
  return obstacles;
}

const SPAWN_ATTEMPTS = 24;

export function trySpawnObstacle(obstacles: THREE.Group[]): boolean {
  const free = obstacles.find((o) => !o.visible);
  if (!free) return false;
  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
    const lane = (Math.random() - 0.5) * 4.2;
    const spawnZ = -40 - Math.random() * 12;
    if (overlapsSpawn(obstacles, lane, spawnZ)) continue;
    free.position.set(lane, 0, spawnZ);
    free.rotation.set(
      (Math.random() - 0.5) * 0.12,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.1,
    );
    const k = free.userData.kind as ObstacleKind;
    if (k === "gear" || k === "crate") {
      free.userData.spin = randomSpinDirs();
    }
    free.visible = true;
    return true;
  }
  return false;
}

export function stepObstacles(
  obstacles: THREE.Group[],
  dt: number,
  scrollSpeed: number,
  speedMul: number,
) {
  for (const o of obstacles) {
    if (!o.visible) continue;
    o.position.z += scrollSpeed * 1.05 * dt;
    const kind = o.userData.kind as ObstacleKind;
    if (kind === "gear") {
      const sp = (o.userData.spin as SpinDirs | undefined) ?? {
        x: 1,
        y: 1,
        z: 1,
      };
      o.rotation.x += dt * 2.5 * speedMul * sp.x;
      o.rotation.y += dt * 0.45 * speedMul * sp.y;
      o.rotation.z += dt * 0.55 * speedMul * sp.z;
    } else if (kind === "car") {
      o.rotation.y += dt * 0.1 * speedMul;
      o.traverse((ch) => {
        if (ch.userData.isWheel && ch instanceof THREE.Mesh) {
          ch.rotation.x += dt * 16 * speedMul;
        }
      });
    } else if (kind === "barrel") {
      o.rotation.x += dt * 1.85 * speedMul;
      o.rotation.z += dt * 0.2 * speedMul;
    } else if (kind === "crate") {
      const sp = (o.userData.spin as SpinDirs | undefined) ?? {
        x: 1,
        y: 1,
        z: 1,
      };
      o.rotation.x += dt * 0.5 * speedMul * sp.x;
      o.rotation.y += dt * 0.55 * speedMul * sp.y;
      o.rotation.z += dt * 0.48 * speedMul * sp.z;
    } else if (kind === "cone") {
      o.rotation.y += dt * 0.35 * speedMul;
    }
    if (o.position.z > 5) o.visible = false;
  }
}

type HitSphere = {
  center: THREE.Vector3;
  radius: number;
};

const playerHitSpheres: HitSphere[] = [
  { center: new THREE.Vector3(), radius: 0.16 },
  { center: new THREE.Vector3(), radius: 0.2 },
  { center: new THREE.Vector3(), radius: 0.23 },
  { center: new THREE.Vector3(), radius: 0.15 },
];

const playerHitOffsets = [
  new THREE.Vector3(0, 0.22, 0.04),
  new THREE.Vector3(0, 0.52, 0),
  new THREE.Vector3(0, 0.78, 0),
  new THREE.Vector3(0, 1.05, -0.02),
];

const localCenter = new THREE.Vector3();
const closestPoint = new THREE.Vector3();

function updatePlayerHitSpheres(human: HumanPlayer) {
  human.root.updateMatrixWorld(true);
  for (let i = 0; i < playerHitSpheres.length; i++) {
    playerHitSpheres[i].center.copy(playerHitOffsets[i]);
    human.root.localToWorld(playerHitSpheres[i].center);
  }
}

function sphereIntersectsLocalBox(
  sphere: HitSphere,
  obstacle: THREE.Object3D,
  boxCenter: THREE.Vector3,
  halfSize: THREE.Vector3,
) {
  localCenter.copy(sphere.center);
  obstacle.worldToLocal(localCenter);
  closestPoint.set(
    THREE.MathUtils.clamp(localCenter.x, boxCenter.x - halfSize.x, boxCenter.x + halfSize.x),
    THREE.MathUtils.clamp(localCenter.y, boxCenter.y - halfSize.y, boxCenter.y + halfSize.y),
    THREE.MathUtils.clamp(localCenter.z, boxCenter.z - halfSize.z, boxCenter.z + halfSize.z),
  );
  return closestPoint.distanceToSquared(localCenter) <= sphere.radius * sphere.radius;
}

function sphereIntersectsLocalSphere(
  sphere: HitSphere,
  obstacle: THREE.Object3D,
  center: THREE.Vector3,
  radius: number,
) {
  localCenter.copy(sphere.center);
  obstacle.worldToLocal(localCenter);
  const combinedRadius = sphere.radius + radius;
  return localCenter.distanceToSquared(center) <= combinedRadius * combinedRadius;
}

function sphereIntersectsLocalVerticalCylinder(
  sphere: HitSphere,
  obstacle: THREE.Object3D,
  centerY: number,
  halfHeight: number,
  radius: number,
) {
  localCenter.copy(sphere.center);
  obstacle.worldToLocal(localCenter);
  const dy = Math.max(0, Math.abs(localCenter.y - centerY) - halfHeight);
  const radial = Math.hypot(localCenter.x, localCenter.z);
  const dr = Math.max(0, radial - radius);
  return dy * dy + dr * dr <= sphere.radius * sphere.radius;
}

function sphereIntersectsLocalXAxisCylinder(
  sphere: HitSphere,
  obstacle: THREE.Object3D,
  center: THREE.Vector3,
  halfLength: number,
  radius: number,
) {
  localCenter.copy(sphere.center);
  obstacle.worldToLocal(localCenter);
  const dx = Math.max(0, Math.abs(localCenter.x - center.x) - halfLength);
  const radial = Math.hypot(localCenter.y - center.y, localCenter.z - center.z);
  const dr = Math.max(0, radial - radius);
  return dx * dx + dr * dr <= sphere.radius * sphere.radius;
}

function sphereIntersectsLocalCone(sphere: HitSphere, obstacle: THREE.Object3D) {
  localCenter.copy(sphere.center);
  obstacle.worldToLocal(localCenter);

  const baseY = 0.04;
  const tipY = 0.74;
  const closestY = THREE.MathUtils.clamp(localCenter.y, baseY, tipY);
  const heightT = (closestY - baseY) / (tipY - baseY);
  const coneRadiusAtY = THREE.MathUtils.lerp(0.34, 0, heightT);
  const dy = Math.max(0, baseY - localCenter.y, localCenter.y - tipY);
  const radial = Math.hypot(localCenter.x, localCenter.z);
  const dr = Math.max(0, radial - coneRadiusAtY);

  if (dy * dy + dr * dr <= sphere.radius * sphere.radius) return true;
  return sphereIntersectsLocalVerticalCylinder(sphere, obstacle, 0.04, 0.04, 0.4);
}

const zero = new THREE.Vector3(0, 0, 0);
const gearCenter = new THREE.Vector3(0, 0.48, 0);
const carLowerCenter = new THREE.Vector3(0, 0.36, 0);
const carLowerHalf = new THREE.Vector3(0.64, 0.17, 0.33);
const carCabinCenter = new THREE.Vector3(0, 0.62, -0.05);
const carCabinHalf = new THREE.Vector3(0.34, 0.15, 0.275);
const carRoofCenter = new THREE.Vector3(0, 0.78, -0.05);
const carRoofHalf = new THREE.Vector3(0.31, 0.04, 0.26);
const carHoodCenter = new THREE.Vector3(0, 0.38, 0.4);
const carHoodHalf = new THREE.Vector3(0.55, 0.08, 0.16);
const carBumperCenter = new THREE.Vector3(0, 0.22, 0.38);
const carBumperHalf = new THREE.Vector3(0.66, 0.06, 0.06);
const crateCenter = new THREE.Vector3(0, 0.47, 0);
const crateHalf = new THREE.Vector3(0.51, 0.51, 0.51);
const carWheelCenters = [
  new THREE.Vector3(-0.52, 0.13, 0.3),
  new THREE.Vector3(0.52, 0.13, 0.3),
  new THREE.Vector3(-0.52, 0.13, -0.3),
  new THREE.Vector3(0.52, 0.13, -0.3),
];

function sphereIntersectsObstacle(sphere: HitSphere, obstacle: THREE.Group) {
  const kind = obstacle.userData.kind as ObstacleKind;

  if (kind === "gear") {
    return sphereIntersectsLocalSphere(sphere, obstacle, gearCenter, 0.64);
  }

  if (kind === "car") {
    if (sphereIntersectsLocalBox(sphere, obstacle, carLowerCenter, carLowerHalf)) return true;
    if (sphereIntersectsLocalBox(sphere, obstacle, carCabinCenter, carCabinHalf)) return true;
    if (sphereIntersectsLocalBox(sphere, obstacle, carRoofCenter, carRoofHalf)) return true;
    if (sphereIntersectsLocalBox(sphere, obstacle, carHoodCenter, carHoodHalf)) return true;
    if (sphereIntersectsLocalBox(sphere, obstacle, carBumperCenter, carBumperHalf)) return true;
    return carWheelCenters.some((center) =>
      sphereIntersectsLocalXAxisCylinder(sphere, obstacle, center, 0.05, 0.13),
    );
  }

  if (kind === "crate") {
    return sphereIntersectsLocalBox(sphere, obstacle, crateCenter, crateHalf);
  }

  if (kind === "barrel") {
    return sphereIntersectsLocalVerticalCylinder(sphere, obstacle, 0.51, 0.51, 0.4);
  }

  if (kind === "cone") {
    return sphereIntersectsLocalCone(sphere, obstacle);
  }

  return sphereIntersectsLocalSphere(sphere, obstacle, zero, 0.5);
}

export function checkPlayerObstacleCollision(
  human: HumanPlayer,
  obstacles: THREE.Group[],
): boolean {
  updatePlayerHitSpheres(human);
  for (const o of obstacles) {
    if (!o.visible) continue;
    const oz = o.position.z;
    if (oz < -3.2 || oz > 4.5) continue;
    o.updateMatrixWorld(true);
    for (const sphere of playerHitSpheres) {
      if (sphereIntersectsObstacle(sphere, o)) {
        return true;
      }
    }
  }
  return false;
}
