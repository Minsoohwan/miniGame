import * as THREE from "three";

export type PaperPlane = {
  root: THREE.Group;
};

export function createPaperPlane(): PaperPlane {
  const root = new THREE.Group();

  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf6f8fd,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const foldMat = new THREE.MeshStandardMaterial({
    color: 0xe4eaf5,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const makeTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    material: THREE.Material,
  ) => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([...a, ...b, ...c]);
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
  };

  // Long center body (folded top)
  const centerBody = makeTri(
    [0, 0.14, 1.75],
    [0, 0.22, -0.85],
    [0, 0.02, -0.85],
    foldMat,
  );
  root.add(centerBody);

  // Main wings
  const leftWing = makeTri(
    [0.02, 0.05, 1.65],
    [-1.45, -0.01, -0.9],
    [0.02, 0.05, -0.45],
    paperMat,
  );
  const rightWing = makeTri(
    [-0.02, 0.05, 1.65],
    [1.45, -0.01, -0.9],
    [-0.02, 0.05, -0.45],
    paperMat,
  );
  root.add(leftWing, rightWing);

  // Inner folded flaps (classic dart plane look)
  const leftInnerFold = makeTri(
    [0.02, 0.12, 1.45],
    [-0.55, 0.02, 0.22],
    [0.02, 0.14, 0.12],
    foldMat,
  );
  const rightInnerFold = makeTri(
    [-0.02, 0.12, 1.45],
    [0.55, 0.02, 0.22],
    [-0.02, 0.14, 0.12],
    foldMat,
  );
  root.add(leftInnerFold, rightInnerFold);

  // Small rear stabilizers
  const leftRear = makeTri(
    [-0.18, 0.08, -0.45],
    [-0.78, 0.03, -1.02],
    [-0.12, 0.12, -0.94],
    foldMat,
  );
  const rightRear = makeTri(
    [0.18, 0.08, -0.45],
    [0.78, 0.03, -1.02],
    [0.12, 0.12, -0.94],
    foldMat,
  );
  root.add(leftRear, rightRear);

  // Vertical tail fin
  const tailFin = makeTri(
    [0, 0.2, -0.75],
    [0, 0.62, -0.95],
    [0, 0.08, -1.05],
    foldMat,
  );
  root.add(tailFin);

  root.scale.setScalar(0.72);
  root.rotation.y = Math.PI;
  return { root };
}
