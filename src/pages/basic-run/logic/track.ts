import * as THREE from "three";
import { createGridFloorTexture, createSkyTexture } from "./textures";
import { PLAYER_MOVE_CLAMP_X } from "./player";

export type TrackResources = {
  skyTex: THREE.CanvasTexture;
  skyGeo: THREE.PlaneGeometry;
  skyMat: THREE.MeshBasicMaterial;
  sky: THREE.Mesh;
  floorTex: THREE.CanvasTexture;
  floorGeo: THREE.PlaneGeometry;
  floorMat: THREE.MeshStandardMaterial;
  floorSegments: THREE.Mesh[];
  segmentLen: number;
  floorCount: number;
};

const PARALLAX_SKY = 0.045;
const FLOOR_TEX_SCROLL = 0.35;
const FLOOR_TEX_SCROLL_X = 0.02;
const FLOOR_WIDTH = PLAYER_MOVE_CLAMP_X * 2;

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

  const floorTex = createGridFloorTexture();
  const segmentLen = 14;
  const floorGeo = new THREE.PlaneGeometry(FLOOR_WIDTH, segmentLen);
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

  for (const seg of tr.floorSegments) {
    seg.position.z += scrollSpeed * dt;
    if (seg.position.z > tr.segmentLen + 2) {
      seg.position.z -= tr.segmentLen * tr.floorCount;
    }
  }

  tr.floorTex.offset.y += FLOOR_TEX_SCROLL * speedMul * dt;
  tr.floorTex.offset.x += FLOOR_TEX_SCROLL_X * speedMul * dt;
}
