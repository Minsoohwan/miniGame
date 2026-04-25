import { Link } from "react-router-dom";
import { useAllScoreboards } from "../hooks/useHighScore";
import { formatElapsed as formatBasicRunElapsed } from "./basic-run/logic/formatElapsed";
import type { GameId, HighScoreRecord } from "../types/electron";

const games = [
  {
    id: "basic-run",
    path: "/basic-run",
    title: "장애물 달리기",
    description: "좌우로 장애물을 피하며 오래 살아남는 러닝 게임",
    formatScore: formatBasicRunElapsed,
  },
  {
    id: "airplane",
    path: "/airplane",
    title: "종이비행기 협곡",
    description:
      "마우스로 비행기를 조종하고 아이템을 모으며 협곡에서 멀리 날아갑니다.",
    formatScore: (score: number) => `${score.toFixed(1)} m`,
  },
] satisfies Array<{
  id: GameId;
  path: string;
  title: string;
  description: string;
  formatScore: (score: number) => string;
}>;

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

  return (
    <main className="home-page">
      <section className="home-hero">
        <p className="home-kicker">3D Mini Games</p>
        <h1 className="home-title">플레이할 미니게임을 선택하세요</h1>
        <p className="home-description">
          원하는 게임 박스를 누르면 바로 해당 미니게임으로 이동합니다.
        </p>
      </section>

      <section className="game-grid" aria-label="미니게임 목록">
        {games.map((game) => (
          <Link key={game.path} to={game.path} className="game-card">
            <span className="game-card-badge">Play</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
          </Link>
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
    </main>
  );
}
