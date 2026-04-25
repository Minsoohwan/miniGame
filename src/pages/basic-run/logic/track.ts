import * as THREE from "three";
import { createGridFloorTexture, createSkyTexture } from "./textures";

export type TrackResources = {
  skyTex: THREE.CanvasTexture;
  skyGeo: THREE.PlaneGeometry;
  skyMat: THREE.MeshBasicMaterial;
  sky: THREE.Mesh;
  horizonGeo: THREE.PlaneGeometry;
  horizonMat: THREE.MeshBasicMaterial;
  horizon: THREE.Mesh;
  floorTex: THREE.CanvasTexture;
  floorGeo: THREE.PlaneGeometry;
  floorMat: THREE.MeshStandardMaterial;
  floorSegments: THREE.Mesh[];
  segmentLen: number;
  floorCount: number;
};

const PARALLAX_SKY = 0.045;
const PARALLAX_HORIZON = 0.12;
const FLOOR_TEX_SCROLL = 0.35;
const FLOOR_TEX_SCROLL_X = 0.02;

export function createTrack(scene: THREE.Scene): TrackResources {
  const skyTex = createSkyTexture();
  const skyGeo = new THREE.PlaneGeometry(90, 36);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    fog: true,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.set(0, 10, -32);
  scene.add(sky);

  const horizonGeo = new THREE.PlaneGeometry(120, 8);
  const horizonMat = new THREE.MeshBasicMaterial({
    color: 0x1e2a44,
    transparent: true,
    opacity: 0.85,
    fog: true,
  });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  horizon.position.set(0, 1.2, -28);
  scene.add(horizon);

  const floorTex = createGridFloorTexture();
  const segmentLen = 14;
  const floorGeo = new THREE.PlaneGeometry(14, segmentLen);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const floorCount = 4;
  const floorSegments: THREE.Mesh[] = [];
  for (let i = 0; i < floorCount; i++) {
    const seg = new THREE.Mesh(floorGeo, floorMat);
    seg.rotation.x = -Math.PI / 2;
    seg.position.set(0, -0.01, -i * segmentLen - 4);
    floorSegments.push(seg);
    scene.add(seg);
  }

  return {
    skyTex,
    skyGeo,
    skyMat,
    sky,
    horizonGeo,
    horizonMat,
    horizon,
    floorTex,
    floorGeo,
    floorMat,
    floorSegments,
    segmentLen,
    floorCount,
  };
}

export function disposeTrack(tr: TrackResources) {
  tr.skyGeo.dispose();
  tr.skyMat.dispose();
  tr.skyTex.dispose();
  tr.horizonGeo.dispose();
  tr.horizonMat.dispose();
  tr.floorGeo.dispose();
  tr.floorMat.dispose();
  tr.floorTex.dispose();
}

type TrackScrollParams = {
  tr: TrackResources;
  dt: number;
  scrollSpeed: number;
  speedMul: number;
};

export function updateTrackScroll({
  tr,
  dt,
  scrollSpeed,
  speedMul,
}: TrackScrollParams) {
  tr.skyTex.offset.y += PARALLAX_SKY * speedMul * dt;
  tr.skyTex.offset.x += PARALLAX_SKY * 0.15 * speedMul * dt;

  tr.horizon.position.z += scrollSpeed * PARALLAX_HORIZON * dt;
  if (tr.horizon.position.z > -12) tr.horizon.position.z = -28;

  for (const seg of tr.floorSegments) {
    seg.position.z += scrollSpeed * dt;
    if (seg.position.z > tr.segmentLen + 2) {
      seg.position.z -= tr.segmentLen * tr.floorCount;
    }
  }

  tr.floorTex.offset.y += FLOOR_TEX_SCROLL * speedMul * dt;
  tr.floorTex.offset.x += FLOOR_TEX_SCROLL_X * speedMul * dt;
}
