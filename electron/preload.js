import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  getHighScore: (gameId) => ipcRenderer.invoke("scores:get-high-score", gameId),
  submitScore: (payload) => ipcRenderer.invoke("scores:submit", payload),
});
