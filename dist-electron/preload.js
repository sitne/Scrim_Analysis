"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods to the renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    openMatchesFolder: () => electron_1.ipcRenderer.send('open-matches-folder'),
    getMatchesDir: () => electron_1.ipcRenderer.invoke('get-matches-dir'),
    changeMatchesDir: () => electron_1.ipcRenderer.invoke('change-matches-dir'),
});
//# sourceMappingURL=preload.js.map