import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  getHighScore: (gameId) => ipcRenderer.invoke("scores:get-high-score", gameId),
  getScoreboard: (gameId) => ipcRenderer.invoke("scores:get-scoreboard", gameId),
  getAllScoreboards: () => ipcRenderer.invoke("scores:get-all-scoreboards"),
  submitScore: (payload) => ipcRenderer.invoke("scores:submit", payload),
});
