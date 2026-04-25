import { useCallback, useEffect, useState } from "react";
import type { GameId, HighScoreRecord, SubmitScoreResult } from "../types/electron";

export function useHighScore(gameId: GameId) {
  const [highScore, setHighScore] = useState<HighScoreRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI?.getHighScore(gameId).then((record) => {
      if (!cancelled) setHighScore(record);
    });

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const submitScore = useCallback(
    async (score: number): Promise<SubmitScoreResult> => {
      const result = await window.electronAPI?.submitScore({ gameId, score });
      const fallback = { highScore: null, isNewHighScore: false };
      const next = result ?? fallback;
      if (next.highScore) setHighScore(next.highScore);
      return next;
    },
    [gameId],
  );

  return { highScore, submitScore };
}

export function createScoreShareUrl(gameTitle: string, scoreLabel: string) {
  const text = `내가 ${gameTitle}에서 최고 점수 ${scoreLabel}를 기록했어!`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
