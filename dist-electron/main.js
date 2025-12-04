"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
let mainWindow = null;
let nextServer = null;
const isDev = process.env.NODE_ENV === 'development';
const PORT = 3000;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Scrim Analyzer',
        icon: path_1.default.join(__dirname, '../public/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        show: false,
        backgroundColor: '#030712', // bg-gray-950
    });
    // Remove menu bar in production
    if (!isDev) {
        mainWindow.setMenuBarVisibility(false);
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    const url = `http://localhost:${PORT}`;
    mainWindow.loadURL(url);
}
function startNextServer() {
    return new Promise((resolve, reject) => {
        if (isDev) {
            // In development, assume Next.js dev server is already running
            resolve();
            return;
        }
        // In production, try to locate the standalone server.
        const resources = process.resourcesPath;
        const candidates = [
            path_1.default.join(resources, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
            path_1.default.join(resources, 'app', '.next', 'standalone', 'server.js'),
            path_1.default.join(__dirname, '../.next/standalone/server.js'),
        ];

        let serverPath = candidates.find(p => fs_1.default.existsSync(p));
        if (!serverPath) {
            serverPath = candidates[2];
            console.error('Next.js server not found in candidates, falling back to:', serverPath);
        }

        nextServer = (0, child_process_1.spawn)(process.execPath, [serverPath], {
            cwd: path_1.default.dirname(serverPath) || path_1.default.join(__dirname, '..'),
            env: {
                ...process.env,
                PORT: PORT.toString(),
                NODE_ENV: 'production',
            },
            stdio: 'pipe',
        });
        nextServer.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log('[Next.js]', output);
            if (output.includes('Ready') || output.includes('started')) {
                resolve();
            }
        });
        nextServer.stderr?.on('data', (data) => {
            console.error('[Next.js Error]', data.toString());
        });
        nextServer.on('error', reject);
        // Fallback: resolve after 5 seconds even if no "Ready" message
        setTimeout(resolve, 5000);
    });
}
electron_1.app.whenReady().then(async () => {
    try {
        await startNextServer();
        createWindow();
    }
    catch (error) {
        console.error('Failed to start server:', error);
        electron_1.app.quit();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill();
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on('before-quit', () => {
    if (nextServer) {
        nextServer.kill();
    }
});
//# sourceMappingURL=main.js.map