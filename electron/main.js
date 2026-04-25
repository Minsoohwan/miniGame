import { app, BrowserWindow, Menu, ipcMain } from "electron";
import Store from "electron-store";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const gameIds = new Set(["basic-run", "airplane"]);
const store = new Store({
  name: "high-scores",
  defaults: {
    highScores: {},
  },
});

function getHighScore(gameId) {
  if (!gameIds.has(gameId)) return null;
  return store.get(`highScores.${gameId}`, null);
}

function registerScoreHandlers() {
  ipcMain.handle("scores:get-high-score", (_event, gameId) => getHighScore(gameId));

  ipcMain.handle("scores:submit", (_event, payload) => {
    const { gameId, score } = payload ?? {};
    if (!gameIds.has(gameId) || typeof score !== "number" || !Number.isFinite(score)) {
      return { highScore: null, isNewHighScore: false };
    }

    const previous = getHighScore(gameId);
    if (previous && previous.score >= score) {
      return { highScore: previous, isNewHighScore: false };
    }

    const next = {
      score,
      achievedAt: new Date().toISOString(),
    };
    store.set(`highScores.${gameId}`, next);
    return { highScore: next, isNewHighScore: true };
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
