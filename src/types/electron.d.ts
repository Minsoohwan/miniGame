export type GameId = "basic-run" | "airplane";

export type HighScoreRecord = {
  id: string;
  score: number;
  achievedAt: string;
};

export type SubmitScoreResult = {
  highScore: HighScoreRecord | null;
  scoreboard: HighScoreRecord[];
  currentRecordId: string | null;
  currentRank: number | null;
  isNewHighScore: boolean;
};

export type Scoreboards = Record<GameId, HighScoreRecord[]>;

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getHighScore: (gameId: GameId) => Promise<HighScoreRecord | null>;
      getScoreboard: (gameId: GameId) => Promise<HighScoreRecord[]>;
      getAllScoreboards: () => Promise<Scoreboards>;
      submitScore: (payload: {
        gameId: GameId;
        score: number;
      }) => Promise<SubmitScoreResult>;
    };
  }
}

export {};
