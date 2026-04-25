import { app, BrowserWindow, Menu, ipcMain } from "electron";
import Store from "electron-store";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const appIconPath = path.join(__dirname, "../src/assets/icon/icon.ico");
const gameIds = new Set(["basic-run", "airplane"]);
const store = new Store({
  name: "high-scores",
  defaults: {
    highScores: {},
    scoreboards: {},
  },
});

function getScoreboard(gameId) {
  if (!gameIds.has(gameId)) return null;
  const records = store.get(`scoreboards.${gameId}`, []);
  if (Array.isArray(records) && records.length > 0) {
    return sortScoreboard(
      records.map((record, index) => ({
        id: record.id ?? `${gameId}-${record.achievedAt ?? "record"}-${index}`,
        score: record.score,
        achievedAt: record.achievedAt ?? new Date(0).toISOString(),
      })),
    );
  }

  const legacyHighScore = store.get(`highScores.${gameId}`, null);
  if (typeof legacyHighScore?.score === "number") {
    return [
      {
        id: `legacy-${gameId}`,
        score: legacyHighScore.score,
        achievedAt: legacyHighScore.achievedAt ?? new Date(0).toISOString(),
      },
    ];
  }

  return [];
}

function getHighScore(gameId) {
  const records = getScoreboard(gameId);
  return records?.[0] ?? null;
}

function sortScoreboard(records) {
  return records
    .filter((record) => typeof record.score === "number" && Number.isFinite(record.score))
    .sort((a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt))
    .slice(0, 5);
}

function registerScoreHandlers() {
  ipcMain.handle("scores:get-high-score", (_event, gameId) => getHighScore(gameId));
  ipcMain.handle("scores:get-scoreboard", (_event, gameId) => getScoreboard(gameId));
  ipcMain.handle("scores:get-all-scoreboards", () => ({
    "basic-run": getScoreboard("basic-run"),
    airplane: getScoreboard("airplane"),
  }));

  ipcMain.handle("scores:submit", (_event, payload) => {
    const { gameId, score } = payload ?? {};
    if (!gameIds.has(gameId) || typeof score !== "number" || !Number.isFinite(score)) {
      return { highScore: null, scoreboard: [], currentRecordId: null, currentRank: null, isNewHighScore: false };
    }

    const previous = getScoreboard(gameId);
    const next = {
      id: randomUUID(),
      score,
      achievedAt: new Date().toISOString(),
    };
    const scoreboard = sortScoreboard([...previous, next]);
    const index = scoreboard.findIndex((record) => record.id === next.id);
    const currentRank = index >= 0 ? index + 1 : null;

    store.set(`scoreboards.${gameId}`, scoreboard);
    store.set(`highScores.${gameId}`, scoreboard[0] ?? null);

    return {
      highScore: scoreboard[0] ?? null,
      scoreboard,
      currentRecordId: currentRank ? next.id : null,
      currentRank,
      isNewHighScore: currentRank === 1,
    };
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: "#0b1020",
    autoHideMenuBar: true,
    icon: appIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.removeMenu();
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerScoreHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
