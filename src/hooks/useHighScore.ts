import { useCallback, useEffect, useState } from "react";
import type {
  GameId,
  HighScoreRecord,
  Scoreboards,
  SubmitScoreResult,
} from "../types/electron";

const emptyScoreboards: Scoreboards = {
  "basic-run": [],
  airplane: [],
};

function sortScoreboard(records: HighScoreRecord[]) {
  return records
    .filter((record) => Number.isFinite(record.score))
    .sort((a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt))
    .slice(0, 5);
}

function getLocalStorageKey(gameId: GameId) {
  return `scoreboards.${gameId}`;
}

function readLocalScoreboard(gameId: GameId) {
  const raw = window.localStorage.getItem(getLocalStorageKey(gameId));
  if (!raw) return [];

  try {
    const records = JSON.parse(raw) as HighScoreRecord[];
    return Array.isArray(records) ? sortScoreboard(records) : [];
  } catch {
    return [];
  }
}

function writeLocalScoreboard(gameId: GameId, records: HighScoreRecord[]) {
  window.localStorage.setItem(
    getLocalStorageKey(gameId),
    JSON.stringify(sortScoreboard(records)),
  );
}

function submitLocalScore(gameId: GameId, score: number): SubmitScoreResult {
  const previous = readLocalScoreboard(gameId);
  const currentRecord: HighScoreRecord = {
    id: `${gameId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    score,
    achievedAt: new Date().toISOString(),
  };
  const scoreboard = sortScoreboard([...previous, currentRecord]);
  const index = scoreboard.findIndex((record) => record.id === currentRecord.id);
  const currentRank = index >= 0 ? index + 1 : null;

  writeLocalScoreboard(gameId, scoreboard);

  return {
    highScore: scoreboard[0] ?? null,
    scoreboard,
    currentRecordId: currentRank ? currentRecord.id : null,
    currentRank,
    isNewHighScore: currentRank === 1,
  };
}

export function useHighScore(gameId: GameId) {
  const [highScore, setHighScore] = useState<HighScoreRecord | null>(null);
  const [scoreboard, setScoreboard] = useState<HighScoreRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadScoreboard = async () => {
      const records =
        (await window.electronAPI?.getScoreboard?.(gameId).catch(() => null)) ??
        readLocalScoreboard(gameId);
      if (cancelled) return;
      const sorted = sortScoreboard(records);
      setScoreboard(sorted);
      setHighScore(sorted[0] ?? null);
    };

    void loadScoreboard();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const submitScore = useCallback(
    async (score: number): Promise<SubmitScoreResult> => {
      const result =
        (await window.electronAPI?.submitScore?.({ gameId, score }).catch(() => null)) ??
        submitLocalScore(gameId, score);
      const next = {
        ...result,
        scoreboard: sortScoreboard(result.scoreboard),
      };
      if (next.highScore) setHighScore(next.highScore);
      setScoreboard(next.scoreboard);
      return next;
    },
    [gameId],
  );

  return { highScore, scoreboard, submitScore };
}

export function useAllScoreboards() {
  const [scoreboards, setScoreboards] = useState<Scoreboards>(emptyScoreboards);

  useEffect(() => {
    let cancelled = false;

    const loadScoreboards = async () => {
      const records =
        (await window.electronAPI?.getAllScoreboards?.().catch(() => null)) ?? {
          "basic-run": readLocalScoreboard("basic-run"),
          airplane: readLocalScoreboard("airplane"),
        };

      if (!cancelled) {
        setScoreboards({
          "basic-run": sortScoreboard(records["basic-run"] ?? []),
          airplane: sortScoreboard(records.airplane ?? []),
        });
      }
    };

    void loadScoreboards();

    return () => {
      cancelled = true;
    };
  }, []);

  return scoreboards;
}

