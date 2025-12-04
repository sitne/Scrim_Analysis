"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods to the renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    // Add more APIs here if needed in the future
});
//# sourceMappingURL=preload.js.map