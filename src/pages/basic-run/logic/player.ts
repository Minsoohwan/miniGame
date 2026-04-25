import * as THREE from "three";

const SKIN = 0xe8b89a;
const SHIRT = 0x4a9eff;
const PANTS = 0x3d4f7a;
const SHOE = 0x2c3038;
const HAIR = 0x3d2817;

export type HumanPlayer = {
  root: THREE.Group;
  thighL: THREE.Group;
  thighR: THREE.Group;
  calfL: THREE.Group;
  calfR: THREE.Group;
  upperArmL: THREE.Group;
  upperArmR: THREE.Group;
  torso: THREE.Mesh;
  geos: THREE.BufferGeometry[];
  mats: THREE.Material[];
};

export function createHumanPlayer(): HumanPlayer {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const mat = (p: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(p);
    mats.push(m);
    return m;
  };
  const geo = (g: THREE.BufferGeometry) => {
    geos.push(g);
    return g;
  };

  const root = new THREE.Group();

  const torso = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.34, 0.38, 0.2)),
    mat({ color: SHIRT, roughness: 0.62 }),
  );
  torso.position.y = 0.72;
  root.add(torso);

  const torsoHalf = 0.19;
  const neckLen = 0.03;
  const neckHalf = neckLen / 2;
  const headR = 0.15;

  const neck = new THREE.Mesh(
    geo(new THREE.CylinderGeometry(0.072, 0.095, neckLen, 14)),
    mat({ color: SKIN, roughness: 0.52, metalness: 0.04 }),
  );
  neck.position.y = torsoHalf + neckHalf;
  torso.add(neck);

  const head = new THREE.Mesh(
    geo(new THREE.SphereGeometry(headR, 22, 18)),
    mat({ color: SKIN, roughness: 0.55, metalness: 0.05 }),
  );
  head.position.y = torsoHalf + neckLen + headR;
  torso.add(head);

  const hair = new THREE.Mesh(
    geo(
      new THREE.SphereGeometry(0.152, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52),
    ),
    mat({ color: HAIR, roughness: 0.88 }),
  );
  hair.position.set(0, 0.05, -0.015);
  hair.rotation.x = Math.PI * 0.08;
  head.add(hair);

  const pelvis = new THREE.Mesh(
    geo(new THREE.BoxGeometry(0.32, 0.11, 0.2)),
    mat({ color: PANTS, roughness: 0.72 }),
  );
  pelvis.position.y = 0.51;
  root.add(pelvis);

  function buildLeg(side: 1 | -1): {
    thigh: THREE.Group;
    calf: THREE.Group;
  } {
    const hipX = 0.11 * side;
    const thigh = new THREE.Group();
    thigh.position.set(hipX, 0.535, 0);
    const thighMesh = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.14, 0.28, 0.14)),
      mat({ color: PANTS, roughness: 0.72 }),
    );
    thighMesh.position.y = -0.14;
    thigh.add(thighMesh);

    const calf = new THREE.Group();
    calf.position.set(0, -0.28, 0);
    thigh.add(calf);
    const calfMesh = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.12, 0.24, 0.12)),
      mat({ color: PANTS, roughness: 0.72 }),
    );
    calfMesh.position.y = -0.12;
    calf.add(calfMesh);

    const foot = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.13, 0.07, 0.22)),
      mat({ color: SHOE, roughness: 0.55, metalness: 0.1 }),
    );
    foot.position.set(0, -0.24, 0.06);
    calf.add(foot);

    root.add(thigh);
    return { thigh, calf };
  }

  const legL = buildLeg(-1);
  const legR = buildLeg(1);

  function buildArm(side: 1 | -1): THREE.Group {
    const shoulderX = 0.22 * side;
    const upper = new THREE.Group();
    upper.position.set(shoulderX, 0.15, 0);
    const upperMesh = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.1, 0.26, 0.1)),
      mat({ color: SHIRT, roughness: 0.62 }),
    );
    upperMesh.position.y = -0.13;
    upper.add(upperMesh);
    const fore = new THREE.Mesh(
      geo(new THREE.BoxGeometry(0.085, 0.22, 0.085)),
      mat({ color: SKIN, roughness: 0.55 }),
    );
    fore.position.y = -0.35;
    upper.add(fore);
    const hand = new THREE.Mesh(
      geo(new THREE.SphereGeometry(0.055, 12, 10)),
      mat({ color: SKIN, roughness: 0.5 }),
    );
    hand.position.y = -0.48;
    upper.add(hand);
    torso.add(upper);
    return upper;
  }

  const upperArmL = buildArm(-1);
  const upperArmR = buildArm(1);

  return {
    root,
    thighL: legL.thigh,
    thighR: legR.thigh,
    calfL: legL.calf,
    calfR: legR.calf,
    upperArmL,
    upperArmR,
    torso,
    geos,
    mats,
  };
}

export function disposeHuman(p: HumanPlayer) {
  for (const g of p.geos) g.dispose();
  for (const m of p.mats) m.dispose();
}

const MOVE_SPEED_BASE = 9;
const CLAMP_X = 2.6;
const CLAMP_Z_MIN = 0.45;
const CLAMP_Z_MAX = 2.35;

export function applyPlayerKeyboard(
  human: HumanPlayer,
  keys: Set<string>,
  dt: number,
  speedMul: number,
) {
  const moveSpeed = MOVE_SPEED_BASE * speedMul;
  let ix = 0;
  let iz = 0;
  if (keys.has("ArrowLeft")) ix -= 1;
  if (keys.has("ArrowRight")) ix += 1;
  if (keys.has("ArrowUp")) iz -= 1;
  if (keys.has("ArrowDown")) iz += 1;
  const len = Math.hypot(ix, iz);
  if (len > 0) {
    human.root.position.x += (ix / len) * moveSpeed * dt;
    human.root.position.z += (iz / len) * moveSpeed * dt;
  }
  human.root.position.x = THREE.MathUtils.clamp(
    human.root.position.x,
    -CLAMP_X,
    CLAMP_X,
  );
  human.root.position.z = THREE.MathUtils.clamp(
    human.root.position.z,
    CLAMP_Z_MIN,
    CLAMP_Z_MAX,
  );
}

export function stepPlayerRunAnimation(
  human: HumanPlayer,
  elapsed: number,
  speedMul: number,
) {
  const runPhase = elapsed * 11 * speedMul;
  const s = Math.sin(runPhase);
  const c = Math.cos(runPhase);
  human.root.position.y = Math.abs(s) * 0.045;
  human.root.rotation.z = s * 0.04;
  human.thighL.rotation.x = s * 0.55;
  human.thighR.rotation.x = -s * 0.55;
  human.calfL.rotation.x = Math.max(0, -s) * 0.55;
  human.calfR.rotation.x = Math.max(0, s) * 0.55;
  human.upperArmL.rotation.x = -s * 0.45;
  human.upperArmR.rotation.x = s * 0.45;
  human.torso.rotation.y = c * 0.06;
}
