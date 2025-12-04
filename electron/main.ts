import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';
const PORT = 3000;

function getServerPath(): string {
    if (isDev) {
        return ''; // Not used in dev mode
    }

    // In production the Next standalone server may be unpacked to
    // `resources/app.asar.unpacked/.next/standalone/server.js` so that
    // node can execute it (files inside an asar cannot be executed directly).
    const resources = process.resourcesPath;

    const candidates = [
        // Unpacked standalone (recommended when using asar)
        path.join(resources, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
        // If builder unpacked into an `app` folder for some reason
        path.join(resources, 'app', '.next', 'standalone', 'server.js'),
        // Relative to the compiled electron dir (useful in dev or dir packaging)
        path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
        // A fallback server.js at the app root
        path.join(__dirname, '..', 'server.js'),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            console.log('Found server at:', p);
            return p;
        }
    }

    console.error('Server not found! Tried:', candidates);
    return candidates[2]; // Fallback to the relative path
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Scrim Analyzer',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        show: false,
        backgroundColor: '#030712',
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

    // Retry loading the URL if it fails initially
    const loadWithRetry = async (retries = 10) => {
        for (let i = 0; i < retries; i++) {
            try {
                await mainWindow?.loadURL(url);
                return;
            } catch (error) {
                console.log(`Retry ${i + 1}/${retries} loading URL...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

    loadWithRetry();
}

function startNextServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isDev) {
            // In development, assume Next.js dev server is already running
            resolve();
            return;
        }

        const serverPath = getServerPath();
        const serverDir = path.dirname(serverPath);

        console.log('Starting Next.js server from:', serverPath);
        console.log('Server directory:', serverDir);

        // Set up environment for the server
        const serverEnv = {
            ...process.env,
            PORT: PORT.toString(),
            NODE_ENV: 'production',
            HOSTNAME: 'localhost',
        };

        nextServer = spawn(process.execPath, [serverPath], {
            cwd: serverDir,
            env: serverEnv,
            stdio: 'pipe',
        });

        nextServer.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log('[Next.js]', output);
            if (output.includes('Ready') || output.includes('started') || output.includes('Listening')) {
                resolve();
            }
        });

        nextServer.stderr?.on('data', (data) => {
            console.error('[Next.js Error]', data.toString());
        });

        nextServer.on('error', (error) => {
            console.error('Failed to start server:', error);
            reject(error);
        });

        nextServer.on('exit', (code) => {
            console.log('Server exited with code:', code);
        });

        // Fallback: resolve after 5 seconds even if no "Ready" message
        setTimeout(resolve, 5000);
    });
}

app.whenReady().then(async () => {
    try {
        await startNextServer();
        createWindow();
    } catch (error) {
        console.error('Failed to start server:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (nextServer) {
        nextServer.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (nextServer) {
        nextServer.kill();
    }
});
