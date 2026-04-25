export type GameId = "basic-run" | "airplane";

export type HighScoreRecord = {
  score: number;
  achievedAt: string;
};

export type SubmitScoreResult = {
  highScore: HighScoreRecord | null;
  isNewHighScore: boolean;
};

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getHighScore: (gameId: GameId) => Promise<HighScoreRecord | null>;
      submitScore: (payload: {
        gameId: GameId;
        score: number;
      }) => Promise<SubmitScoreResult>;
    };
  }
}

export {};
