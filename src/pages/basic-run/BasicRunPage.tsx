import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import {
  playCrashSound,
  unlockBackgroundMusic,
  useBackgroundMusic,
} from "../../hooks/useBackgroundMusic";
import { useHighScore } from "../../hooks/useHighScore";
import { useSoundSetting } from "../../hooks/useSoundSetting";
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
  const soundEnabledRef = useRef(false);
  const [gameOver, setGameOver] = useState(false);
  const [survivalSeconds, setSurvivalSeconds] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [elapsedUi, setElapsedUi] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useSoundSetting();
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const submittedScoreRef = useRef(false);
  const scoreSubmitTokenRef = useRef(0);
  const { highScore, scoreboard, submitScore } = useHighScore("basic-run");
  const { countdownLabel, isCountingDown } = useStartCountdown(sessionKey);
  useBackgroundMusic("runner", soundEnabled && !gameOver, menuOpen);

  useEffect(() => {
    pausedRef.current = (menuOpen || isCountingDown) && !gameOver;
  }, [menuOpen, isCountingDown, gameOver]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

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
        if (soundEnabledRef.current) {
          playCrashSound();
        }
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

  useEffect(() => {
    if (!gameOver || survivalSeconds <= 0) return;
    if (submittedScoreRef.current) return;
    submittedScoreRef.current = true;
    const submitToken = scoreSubmitTokenRef.current + 1;
    scoreSubmitTokenRef.current = submitToken;

    submitScore(survivalSeconds).then((result) => {
      if (scoreSubmitTokenRef.current !== submitToken) return;
      setCurrentRecordId(result.currentRecordId);
    });
  }, [gameOver, submitScore, survivalSeconds]);

  const handleRestart = () => {
    setMenuOpen(false);
    setCurrentRecordId(null);
    submittedScoreRef.current = false;
    scoreSubmitTokenRef.current += 1;
    setGameOver(false);
    setSurvivalSeconds(0);
    setElapsedUi(0);
    setSessionKey((k) => k + 1);
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleToggleSound = () => {
    if (!soundEnabled) {
      unlockBackgroundMusic();
    }
    setSoundEnabled((enabled) => !enabled);
  };

  const survivalLabel = formatElapsed(survivalSeconds);
  const highScoreLabel = highScore ? formatElapsed(highScore.score) : "기록 없음";

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
      {!gameOver && (
        <div className="game-top-actions">
          <button
            type="button"
            className="game-action-button"
            aria-label={soundEnabled ? "배경 음악 끄기" : "배경 음악 켜기"}
            aria-pressed={soundEnabled}
            onClick={handleToggleSound}
          >
            <svg className="game-icon game-icon-sound" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.5v5h4l5 4.5V5L8 9.5H4Z" />
              {soundEnabled ? (
                <>
                  <path d="M16 8.2a5 5 0 0 1 0 7.6" />
                  <path d="M18.5 5.7a8.5 8.5 0 0 1 0 12.6" />
                </>
              ) : (
                <>
                  <path d="M16.2 9.2 21 14" />
                  <path d="M21 9.2 16.2 14" />
                </>
              )}
            </svg>
          </button>
          <button
            type="button"
            className="game-action-button"
            aria-label="게임 일시정지"
            onClick={() => setMenuOpen(true)}
          >
            <span className="game-icon game-icon-pause" aria-hidden="true" />
          </button>
        </div>
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
            <p className="game-over-stat">
              최고 기록: <strong>{highScoreLabel}</strong>
            </p>
            <div className="scoreboard-panel">
              <p className="scoreboard-title">로컬 기록 TOP 5</p>
              {scoreboard.length > 0 ? (
                <ol className="scoreboard-list">
                  {scoreboard.map((record, index) => (
                    <li
                      key={record.id}
                      className={
                        record.id === currentRecordId
                          ? "scoreboard-row scoreboard-row-current"
                          : "scoreboard-row"
                      }
                    >
                      <span>{index + 1}위</span>
                      <strong>{formatElapsed(record.score)}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="scoreboard-empty">아직 기록이 없습니다.</p>
              )}
            </div>
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
