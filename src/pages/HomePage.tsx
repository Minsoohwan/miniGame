import { useState } from "react";
import { useNavigate } from "react-router-dom";
import airplaneScreenshot from "../assets/airplane.PNG";
import runScreenshot from "../assets/run.PNG";
import { useAllScoreboards } from "../hooks/useHighScore";
import { formatElapsed as formatBasicRunElapsed } from "./basic-run/logic/formatElapsed";
import type { GameId, HighScoreRecord } from "../types/electron";

const DAY_MS = 24 * 60 * 60 * 1000;
const instructionHiddenKey = (gameId: GameId) =>
  `mini-game-instructions-hidden-until:${gameId}`;

const games = [
  {
    id: "basic-run",
    path: "/basic-run",
    title: "장애물 달리기",
    description: "좌우로 장애물을 피하며 오래 살아남는 러닝 게임",
    imageSrc: runScreenshot,
    imageAlt: "장애물 달리기 게임 화면",
    instructions: [
      "방향키 캐릭터를 이동합니다.",
      "장애물의 모양을 보고 빈 공간으로 피하세요.",
      "오래 버틸수록 로컬 기록에 더 높은 점수로 저장됩니다.",
    ],
    formatScore: formatBasicRunElapsed,
  },
  {
    id: "airplane",
    path: "/airplane",
    title: "종이비행기 협곡",
    description:
      "마우스로 비행기를 조종하고 아이템을 모으며 협곡에서 멀리 날아갑니다.",
    imageSrc: airplaneScreenshot,
    imageAlt: "종이비행기 협곡 게임 화면",
    instructions: [
      "마우스를 움직여 종이비행기를 조종합니다.",
      "협곡 벽에 부딪히지 않게 중앙을 유지하세요.",
      "속도 아이템과 보호막 아이템을 획득하면 더 멀리 날 수 있습니다.",
    ],
    formatScore: (score: number) => `${score.toFixed(1)} m`,
  },
] satisfies Array<{
  id: GameId;
  path: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  instructions: string[];
  formatScore: (score: number) => string;
}>;

type GameInfo = (typeof games)[number];

function shouldShowInstructions(gameId: GameId) {
  try {
    const hiddenUntil = Number(
      localStorage.getItem(instructionHiddenKey(gameId))
    );
    return !Number.isFinite(hiddenUntil) || hiddenUntil <= Date.now();
  } catch {
    return true;
  }
}

function hideInstructionsForOneDay(gameId: GameId) {
  try {
    localStorage.setItem(
      instructionHiddenKey(gameId),
      String(Date.now() + DAY_MS)
    );
  } catch {
    // If localStorage is unavailable, the modal simply appears next time.
  }
}

function LocalRecordList({
  records,
  formatScore,
}: {
  records: HighScoreRecord[];
  formatScore: (score: number) => string;
}) {
  if (records.length === 0) {
    return <p className="home-record-empty">아직 기록이 없습니다.</p>;
  }

  return (
    <ol className="home-record-list">
      {records.map((record, index) => (
        <li key={record.id} className="home-record-row">
          <span>{index + 1}위</span>
          <strong>{formatScore(record.score)}</strong>
        </li>
      ))}
    </ol>
  );
}

export function HomePage() {
  const scoreboards = useAllScoreboards();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);

  const openGame = (game: GameInfo) => {
    if (shouldShowInstructions(game.id)) {
      setSelectedGame(game);
      return;
    }

    navigate(game.path);
  };

  const startSelectedGame = () => {
    if (!selectedGame) return;
    navigate(selectedGame.path);
  };

  const hideTodayAndStart = () => {
    if (!selectedGame) return;
    hideInstructionsForOneDay(selectedGame.id);
    navigate(selectedGame.path);
  };

  return (
    <main className="home-page">
      <section className="home-hero">
        <p className="home-kicker">3D Mini Games</p>
        <h1 className="home-title">플레이할 미니게임을 선택하세요</h1>
        <p className="home-description">
          원하는 게임 박스를 누르면 조작법을 확인한 뒤 미니게임을 시작합니다.
        </p>
      </section>

      <section className="game-grid" aria-label="미니게임 목록">
        {games.map((game) => (
          <button
            key={game.path}
            type="button"
            className="game-card"
            onClick={() => openGame(game)}
          >
            <span className="game-card-badge">Play</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
          </button>
        ))}
      </section>

      <section className="home-records" aria-label="로컬 기록">
        <div className="home-records-header">
          <p className="home-kicker">Local Records</p>
          <h2>로컬 기록</h2>
        </div>
        <div className="home-record-grid">
          {games.map((game) => (
            <article key={game.id} className="home-record-card">
              <h3>{game.title}</h3>
              <LocalRecordList
                records={scoreboards[game.id]}
                formatScore={game.formatScore}
              />
            </article>
          ))}
        </div>
      </section>

      {selectedGame && (
        <div className="instruction-overlay" role="presentation">
          <section
            className="instruction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instruction-title"
          >
            <img
              className="instruction-screenshot"
              src={selectedGame.imageSrc}
              alt={selectedGame.imageAlt}
            />
            <p className="home-kicker">How to Play</p>
            <h2 id="instruction-title">{selectedGame.title} 조작법</h2>
            <ul className="instruction-list">
              {selectedGame.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
            <div className="instruction-actions">
              <button
                type="button"
                className="game-over-restart"
                onClick={startSelectedGame}
              >
                게임 시작
              </button>
              <button
                type="button"
                className="game-over-restart game-over-secondary"
                onClick={hideTodayAndStart}
              >
                하루 동안 보지 않기
              </button>
            </div>
            <button
              type="button"
              className="game-menu-close"
              onClick={() => setSelectedGame(null)}
            >
              닫기
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
