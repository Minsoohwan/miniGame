import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { useStartCountdown } from "../../hooks/useStartCountdown";
import { formatElapsed } from "./logic/formatElapsed";
import {
  checkPlayerObstacleCollision,
  createObstaclePool,
  disposeObstacleGraph,
  trySpawnObstacle,
  stepObstacles,
} from "./logic/obstacles";
import {
  applyPlayerKeyboard,
  createHumanPlayer,
  disposeHuman,
  stepPlayerRunAnimation,
} from "./logic/player";
import { createTrack, disposeTrack, updateTrackScroll } from "./logic/track";

export function BasicRunPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [gameOver, setGameOver] = useState(false);
  const [survivalSeconds, setSurvivalSeconds] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [elapsedUi, setElapsedUi] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { countdownLabel, isCountingDown } = useStartCountdown(sessionKey);

  useEffect(() => {
    pausedRef.current = (menuOpen || isCountingDown) && !gameOver;
  }, [menuOpen, isCountingDown, gameOver]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x151620, 12, 42);

    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      120
    );
    camera.position.set(0, 2.2, 6.2);
    camera.lookAt(0, 0.4, -6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x151620, 1);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x8899cc, 0.45);
    const dir = new THREE.DirectionalLight(0xffffff, 0.95);
    dir.position.set(4, 10, 6);
    scene.add(ambient, dir);
    const rim = new THREE.DirectionalLight(0x6688ff, 0.35);
    rim.position.set(-6, 4, -4);
    scene.add(rim);

    const track = createTrack(scene);

    const human = createHumanPlayer();
    human.root.position.set(0, 0, 1.2);
    human.root.rotation.y = Math.PI;
    scene.add(human.root);

    const poolSize = 16;
    const obstacles = createObstaclePool(scene, poolSize);

    const clock = new THREE.Clock();
    const scrollSpeedBase = 14;
    const scrollSpeedPerSecond = 0.14;
    const getScrollSpeed = (elapsedSec: number) =>
      scrollSpeedBase + scrollSpeedPerSecond * elapsedSec;

    let spawnAcc = 0;
    const spawnIntervalStart = 0.78;
    const spawnTightenPerSecond = 0.028;
    const getSpawnInterval = (elapsedSec: number) =>
      Math.max(
        1e-6,
        spawnIntervalStart / (1 + spawnTightenPerSecond * elapsedSec)
      );

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown":
          e.preventDefault();
          keys.add(e.code);
          break;
        default:
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let running = true;
    let animationId = 0;
    let lastHudDeci = -1;
    let elapsedTotal = 0;
    const tick = () => {
      if (!running) return;
      if (pausedRef.current) {
        clock.getDelta();
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsedTotal += dt;
      const elapsed = elapsedTotal;
      const scrollSpeed = getScrollSpeed(elapsed);
      const speedMul = scrollSpeed / scrollSpeedBase;

      updateTrackScroll({ tr: track, dt, scrollSpeed, speedMul });

      spawnAcc += dt;
      const interval = getSpawnInterval(elapsed);
      let spawnBursts = 0;
      while (spawnAcc >= interval && spawnBursts < 48) {
        spawnAcc -= interval;
        trySpawnObstacle(obstacles);
        spawnBursts++;
      }

      stepObstacles(obstacles, dt, scrollSpeed, speedMul);

      applyPlayerKeyboard(human, keys, dt, speedMul);
      stepPlayerRunAnimation(human, elapsed, speedMul);

      const deci = Math.floor(elapsed * 10);
      if (deci !== lastHudDeci) {
        lastHudDeci = deci;
        setElapsedUi(elapsed);
      }

      if (checkPlayerObstacleCollision(human, obstacles)) {
        running = false;
        setSurvivalSeconds(elapsed);
        setElapsedUi(elapsed);
        setGameOver(true);
        renderer.render(scene, camera);
        return;
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(tick);
    };
    animationId = requestAnimationFrame(tick);

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
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      disposeTrack(track);
      disposeHuman(human);
      for (const ob of obstacles) disposeObstacleGraph(ob);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [sessionKey]);

  const handleRestart = () => {
    setMenuOpen(false);
    setGameOver(false);
    setSurvivalSeconds(0);
    setElapsedUi(0);
    setSessionKey((k) => k + 1);
  };

  const handleHome = () => {
    navigate("/");
  };

  const survivalLabel = formatElapsed(survivalSeconds);

  return (
    <div ref={containerRef} className="game-canvas">
      {!gameOver && (
        <div className="game-hud-time" aria-live="polite">
          경과 시간{" "}
          <span className="game-hud-time-value">
            {formatElapsed(elapsedUi)}
          </span>
        </div>
      )}
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
            <p className="game-over-stat">
              생존 시간: <strong>{survivalLabel}</strong>
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
