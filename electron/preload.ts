import { contextBridge } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    // Add more APIs here if needed in the future
});
