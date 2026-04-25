import { Link } from "react-router-dom";

const games = [
  {
    path: "/basic-run",
    title: "장애물 달리기",
    description: "좌우로 장애물을 피하며 오래 살아남는 러닝 게임",
  },
  {
    path: "/airplane",
    title: "종이비행기 협곡",
    description:
      "마우스로 비행기를 조종하고 아이템을 모으며 협곡에서 멀리 날아갑니다.",
  },
];

export function HomePage() {
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
    </main>
  );
}
