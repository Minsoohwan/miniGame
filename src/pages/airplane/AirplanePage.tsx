import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useStartCountdown } from "../../hooks/useStartCountdown";
import {
  collectItem,
  createAirBackground,
  disposeAirBackground,
  recycleBackground,
  sampleCanyonAtZ,
} from "./logic/background";
import { createPaperPlane } from "./logic/createPaperPlane";
import { getAirplaneHudLabel } from "./logic/hud";

export function AirplanePage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shieldCharges, setShieldCharges] = useState(0);
  const [speedBuffLeft, setSpeedBuffLeft] = useState(0);
  const [speedStacks, setSpeedStacks] = useState(0);
  const [speedUi, setSpeedUi] = useState(0);
  const [distanceUi, setDistanceUi] = useState(0);
  const [finalDistance, setFinalDistance] = useState(0);
  const { countdownLabel, isCountingDown } = useStartCountdown(sessionKey);

  useEffect(() => {
    pausedRef.current = (menuOpen || isCountingDown) && !gameOver;
  }, [menuOpen, isCountingDown, gameOver]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87b5d6);
    scene.fog = new THREE.Fog(0xbdd2df, 90, 480);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );
    camera.position.set(0, 2.5, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x87b5d6, 1);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffe2b2, 0.58);
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.25);
    sun.position.set(12, 16, 8);
    scene.add(ambient, sun);

    const plane = createPaperPlane();
    scene.add(plane.root);

    const bg = createAirBackground(scene);

    const clock = new THREE.Clock();
    const BASE_SPEED = 22;
    const SPEED_RAMP_PER_SEC = 0.18; // unbounded speed ramp over time
    const BOOST_SPEED_ADD = 9;
    const BOOST_DURATION = 3.6;
    const CAMERA_DISTANCE = 7.5;
    const CAMERA_HEIGHT = 2.3;
    const BASELINE_Y = -28;
    const MIN_ALTITUDE_FROM_BASE = 8.5;
    const MIN_FLIGHT_Y = BASELINE_Y + MIN_ALTITUDE_FROM_BASE;
    const MAX_FLIGHT_Y = BASELINE_Y + 58; // stay inside the canyon (wall top is at base + 62)
    const MAX_YAW = THREE.MathUtils.degToRad(110);
    const MAX_PITCH = THREE.MathUtils.degToRad(50);
    const TURN_RESPONSE = 0.32;
    const PLANE_COLLISION_RADIUS = 0.62;

    let yaw = 0;
    let pitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    const speedBoostTimers: number[] = [];
    let shieldCount = 0;
    let shieldCooldown = 0; // brief invuln after a shield tanks a hit
    let uiAcc = 0;
    let running = true;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetYaw = THREE.MathUtils.clamp(-nx * MAX_YAW, -MAX_YAW, MAX_YAW);
      targetPitch = THREE.MathUtils.clamp(
        -ny * MAX_PITCH,
        -MAX_PITCH,
        MAX_PITCH
      );
    };

    const onMouseLeave = () => {
      targetYaw = 0;
      targetPitch = 0;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);

    const forward = new THREE.Vector3();
    const planeForward = new THREE.Vector3();
    const camOffset = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const camWorldPos = new THREE.Vector3();
    const planePos = new THREE.Vector3(0, 0, 0);
    const shieldForwardAxis = new THREE.Vector3(0, 0, 1);
    const shieldBaseQuat = new THREE.Quaternion();
    const shieldSpinQuat = new THREE.Quaternion();

    const shieldVisuals = new THREE.Group();
    scene.add(shieldVisuals);

    const shieldBubbleGeo = new THREE.SphereGeometry(1.7, 28, 20);
    const shieldBubbleMat = new THREE.MeshStandardMaterial({
      color: 0x7fd8ff,
      emissive: 0x4ab8ff,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.23,
      roughness: 0.12,
      metalness: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shieldBubble = new THREE.Mesh(shieldBubbleGeo, shieldBubbleMat);
    shieldBubble.scale.set(1.02, 0.9, 1.14);
    shieldVisuals.add(shieldBubble);

    const shieldBandGeo = new THREE.TorusGeometry(1.72, 0.045, 10, 72);
    const shieldBandMat = new THREE.MeshStandardMaterial({
      color: 0x9beaff,
      emissive: 0x66d7ff,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.62,
      roughness: 0.2,
      metalness: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const yawBand = new THREE.Mesh(shieldBandGeo, shieldBandMat);
    yawBand.rotation.x = Math.PI / 2;
    shieldVisuals.add(yawBand);

    const pitchBand = new THREE.Mesh(shieldBandGeo, shieldBandMat);
    pitchBand.rotation.y = Math.PI / 2;
    shieldVisuals.add(pitchBand);

    const rollBand = new THREE.Mesh(shieldBandGeo, shieldBandMat);
    shieldVisuals.add(rollBand);

    shieldVisuals.visible = false;

    let rafId = 0;
    let elapsedTotal = 0;
    let traveledDistance = 0;
    let shieldSpin = 0;
    const tick = () => {
      if (!running) return;
      if (pausedRef.current) {
        clock.getDelta();
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsedTotal += dt;
      uiAcc += dt;

      yaw = THREE.MathUtils.lerp(yaw, targetYaw, TURN_RESPONSE);
      pitch = THREE.MathUtils.lerp(pitch, targetPitch, TURN_RESPONSE);

      forward.set(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );

      for (let i = speedBoostTimers.length - 1; i >= 0; i--) {
        speedBoostTimers[i] -= dt;
        if (speedBoostTimers[i] <= 0) speedBoostTimers.splice(i, 1);
      }
      const timeBonus = elapsedTotal * SPEED_RAMP_PER_SEC;
      const currentSpeed =
        BASE_SPEED + timeBonus + speedBoostTimers.length * BOOST_SPEED_ADD;

      plane.root.rotation.set(pitch, yaw + Math.PI, 0);
      planeForward
        .set(0, 0, 1)
        .applyQuaternion(plane.root.quaternion)
        .normalize();
      const stepDistance = currentSpeed * dt;
      traveledDistance += stepDistance;
      planePos.addScaledVector(planeForward, stepDistance);
      if (planePos.y < MIN_FLIGHT_Y) planePos.y = MIN_FLIGHT_Y;
      if (planePos.y > MAX_FLIGHT_Y) planePos.y = MAX_FLIGHT_Y;
      plane.root.position.copy(planePos);
      plane.root.position.y = THREE.MathUtils.clamp(
        plane.root.position.y + Math.sin(elapsedTotal * 2.5) * 0.07,
        MIN_FLIGHT_Y + 0.02,
        MAX_FLIGHT_Y - 0.02
      );

      // Camera is always mounted behind the plane's actual facing direction.
      camOffset
        .copy(planeForward)
        .multiplyScalar(-CAMERA_DISTANCE)
        .add(new THREE.Vector3(0, CAMERA_HEIGHT, 0));
      camera.position.copy(plane.root.position).add(camOffset);
      lookTarget.copy(plane.root.position).addScaledVector(planeForward, 18);
      camera.lookAt(lookTarget);

      // Speed pickups always face the camera (flat hex + upright chevron).
      camera.getWorldPosition(camWorldPos);
      for (const item of bg.items) {
        if (!item.active || item.kind !== "speed") continue;
        item.root.up.copy(camera.up);
        item.root.lookAt(camWorldPos);
      }

      recycleBackground(bg, plane.root.position, planeForward, dt);

      const gotItem = collectItem(bg, plane.root.position);
      if (gotItem === "speed") {
        speedBoostTimers.push(BOOST_DURATION);
      } else if (gotItem === "shield") {
        shieldCount = Math.min(shieldCount + 1, 3);
        setShieldCharges(shieldCount);
      }

      shieldCooldown = Math.max(0, shieldCooldown - dt);

      const sample = sampleCanyonAtZ(
        bg,
        plane.root.position.z,
        plane.root.position.y
      );
      const dx = plane.root.position.x - sample.centerX;
      const hitsLeft = -dx + PLANE_COLLISION_RADIUS > sample.leftHalf;
      const hitsRight = dx + PLANE_COLLISION_RADIUS > sample.rightHalf;
      if ((hitsLeft || hitsRight) && shieldCooldown <= 0) {
        if (shieldCount > 0) {
          shieldCount -= 1;
          setShieldCharges(shieldCount);
          shieldCooldown = 0.8;
          // Nudge the plane back inside the corridor so the shield isn't chain-drained.
          const safeX = hitsLeft
            ? sample.centerX - sample.leftHalf + PLANE_COLLISION_RADIUS + 0.5
            : sample.centerX + sample.rightHalf - PLANE_COLLISION_RADIUS - 0.5;
          plane.root.position.x = safeX;
          planePos.x = safeX;
        } else {
          running = false;
          setFinalDistance(traveledDistance);
          setGameOver(true);
          renderer.render(scene, camera);
          return;
        }
      }

      shieldVisuals.visible = shieldCount > 0;
      if (shieldVisuals.visible) {
        shieldVisuals.position.copy(plane.root.position);
        shieldBaseQuat.setFromUnitVectors(shieldForwardAxis, planeForward);
        shieldSpin += dt * 2.4;
        shieldSpinQuat.setFromAxisAngle(shieldForwardAxis, shieldSpin);
        shieldVisuals.quaternion.copy(shieldBaseQuat).multiply(shieldSpinQuat);

        // Extra shimmer motion to mimic a StarCraft-like defensive energy shell.
        const t = elapsedTotal;
        shieldBubble.scale.set(
          1.02 + Math.sin(t * 4.7) * 0.035,
          0.9 + Math.cos(t * 3.9) * 0.03,
          1.14 + Math.sin(t * 5.1 + 0.7) * 0.035
        );
        yawBand.rotation.z += dt * 2.9;
        pitchBand.rotation.z -= dt * 2.2;
        rollBand.rotation.z += dt * 3.4;
      }

      // Blink the plane while invulnerable after absorbing a hit so the player
      // gets clear visual feedback.
      if (shieldCooldown > 0) {
        plane.root.visible = Math.floor(shieldCooldown * 12) % 2 === 0;
      } else {
        plane.root.visible = true;
      }

      if (uiAcc > 0.08) {
        uiAcc = 0;
        const remaining = speedBoostTimers.length
          ? Math.max(...speedBoostTimers)
          : 0;
        setSpeedBuffLeft(remaining);
        setSpeedStacks(speedBoostTimers.length);
        setSpeedUi(currentSpeed);
        setDistanceUi(traveledDistance);
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      disposeAirBackground(bg);
      shieldBubbleGeo.dispose();
      shieldBubbleMat.dispose();
      shieldBandGeo.dispose();
      shieldBandMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [sessionKey]);

  const handleRestart = () => {
    setMenuOpen(false);
    setGameOver(false);
    setShieldCharges(0);
    setSpeedBuffLeft(0);
    setSpeedStacks(0);
    setSpeedUi(0);
    setDistanceUi(0);
    setFinalDistance(0);
    setSessionKey((k) => k + 1);
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <div ref={containerRef} className="game-canvas">
      <div className="game-hud-time" aria-live="polite">
        {getAirplaneHudLabel({
          shieldCharges,
          speedBuffLeft,
          speed: speedUi,
          distance: distanceUi,
        })}
      </div>
      <div className="airplane-effects-hud" aria-live="polite">
        <div>효과</div>
        <div>속도 증가 x{speedStacks}</div>
        <div>보호막 x{shieldCharges}</div>
        <div>현재 속도 {speedUi.toFixed(1)}</div>
      </div>
      {!gameOver && !isCountingDown && (
        <button
          type="button"
          className="game-menu-button"
          aria-label="게임 메뉴 열기"
          onClick={() => setMenuOpen(true)}
        >
          ⚙
        </button>
      )}
      {countdownLabel && !gameOver && !menuOpen && (
        <div className="game-countdown-overlay" aria-live="assertive">
          <div className="game-countdown-label">{countdownLabel}</div>
        </div>
      )}
      {menuOpen && !gameOver && (
        <div className="game-over-overlay" role="dialog" aria-modal="true">
          <div className="game-over-modal">
            <h2 className="game-over-title">게임 메뉴</h2>
            <p className="game-over-stat">게임이 일시 정지되었습니다.</p>
            <button
              type="button"
              className="game-over-restart"
              onClick={handleRestart}
            >
              다시 하기
            </button>
            <button
              type="button"
              className="game-over-restart game-over-secondary"
              onClick={handleHome}
            >
              홈으로
            </button>
            <button
              type="button"
              className="game-menu-close"
              onClick={() => setMenuOpen(false)}
            >
              계속하기
            </button>
          </div>
        </div>
      )}
      {gameOver && (
        <div className="game-over-overlay" role="dialog" aria-modal="true">
          <div className="game-over-modal">
            <h2 className="game-over-title">게임 오버</h2>
            <p className="game-over-stat">협곡 벽에 충돌했습니다.</p>
            <p className="game-over-stat">
              이동 거리: <strong>{finalDistance.toFixed(1)} m</strong>
            </p>
            <button
              type="button"
              className="game-over-restart"
              onClick={handleRestart}
            >
              다시 하기
            </button>
            <button
              type="button"
              className="game-over-restart game-over-secondary"
              onClick={handleHome}
            >
              홈으로
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
