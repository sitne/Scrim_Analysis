import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    openMatchesFolder: () => ipcRenderer.send('open-matches-folder'),
    getMatchesDir: () => ipcRenderer.invoke('get-matches-dir'),
    changeMatchesDir: () => ipcRenderer.invoke('change-matches-dir'),
});
