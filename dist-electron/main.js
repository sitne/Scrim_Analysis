"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const net_1 = __importDefault(require("net"));
let mainWindow = null;
let nextServer = null;
const isDev = process.env.NODE_ENV === 'development';
function getServerPath() {
    if (isDev) {
        return ''; // Not used in dev mode
    }
    const resources = process.resourcesPath;
    const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'main.log');
    function log(message) {
        fs_1.default.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
    }
    log(`Resources path: ${resources}`);
    const candidates = [
        path_1.default.join(resources, 'standalone', 'server.js'),
        path_1.default.join(resources, 'standalone', 'code', 'runs', 'server.js'),
        path_1.default.join(resources, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
        path_1.default.join(resources, 'app.asar.unpacked', '.next', 'standalone', 'code', 'runs', 'server.js'),
        path_1.default.join(__dirname, '..', '.next', 'standalone', 'server.js'),
        path_1.default.join(__dirname, '..', '.next', 'standalone', 'code', 'runs', 'server.js'),
        path_1.default.join(__dirname, '..', 'server.js'),
    ];
    for (const p of candidates) {
        if (fs_1.default.existsSync(p)) {
            log(`Found server at: ${p}`);
            console.log('Found server at:', p);
            return p;
        }
    }
    log(`Server not found! Tried: ${JSON.stringify(candidates)}`);
    console.error('Server not found! Tried:', candidates);
    return candidates[0];
}
const getFreePort = async () => {
    return new Promise((resolve, reject) => {
        const server = net_1.default.createServer();
        server.listen(0, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
};
function createWindow(port) {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'Scrim Analyzer',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        show: false,
        backgroundColor: '#030712',
    });
    if (!isDev) {
        mainWindow.setMenuBarVisibility(false);
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    const url = `http://localhost:${port}`;
    const loadWithRetry = async (retries = 10) => {
        for (let i = 0; i < retries; i++) {
            try {
                await mainWindow?.loadURL(url);
                return;
            }
            catch (error) {
                console.log(`Retry ${i + 1}/${retries} loading URL...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };
    loadWithRetry();
    electron_1.ipcMain.on('open-matches-folder', () => {
        const matchesDir = path_1.default.join(electron_1.app.getPath('userData'), 'matches');
        if (!fs_1.default.existsSync(matchesDir)) {
            fs_1.default.mkdirSync(matchesDir, { recursive: true });
        }
        electron_1.shell.openPath(matchesDir);
    });
}
function startNextServer() {
    return new Promise(async (resolve, reject) => {
        if (isDev) {
            resolve(3000);
            return;
        }
        try {
            const port = await getFreePort();
            const serverPath = getServerPath();
            const serverDir = path_1.default.dirname(serverPath);
            console.log('Starting Next.js server from:', serverPath);
            console.log('Server directory:', serverDir);
            console.log('Using port:', port);
            const userDataPath = electron_1.app.getPath('userData');
            const dbPath = path_1.default.join(userDataPath, 'database.db');
            const configPath = path_1.default.join(userDataPath, 'config.json');
            let config = { matchesDir: path_1.default.join(userDataPath, 'matches') };
            try {
                if (fs_1.default.existsSync(configPath)) {
                    const savedConfig = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
                    if (savedConfig.matchesDir) {
                        config.matchesDir = savedConfig.matchesDir;
                    }
                }
            }
            catch (e) {
                console.error('Failed to load config:', e);
            }
            const matchesDir = config.matchesDir;
            if (!fs_1.default.existsSync(matchesDir)) {
                fs_1.default.mkdirSync(matchesDir, { recursive: true });
            }
            electron_1.ipcMain.handle('get-matches-dir', () => {
                return config.matchesDir;
            });
            electron_1.ipcMain.handle('change-matches-dir', async () => {
                const result = await electron_1.dialog.showOpenDialog(mainWindow, {
                    properties: ['openDirectory', 'createDirectory'],
                    defaultPath: config.matchesDir,
                    title: 'Select Matches Directory'
                });
                if (!result.canceled && result.filePaths.length > 0) {
                    const newPath = result.filePaths[0];
                    config.matchesDir = newPath;
                    fs_1.default.writeFileSync(configPath, JSON.stringify(config, null, 2));
                    // Delete database to clear all match data when folder changes
                    const logPath = path_1.default.join(userDataPath, 'main.log');
                    const log = (msg) => {
                        const logLine = `${new Date().toISOString()} [FolderChange] ${msg}\n`;
                        console.log(msg);
                        fs_1.default.appendFileSync(logPath, logLine);
                    };
                    log(`Folder changed to: ${newPath}`);
                    log('Stopping Next.js server to release database lock...');
                    // Stop the Next.js server first to release the database lock
                    if (nextServer) {
                        nextServer.kill();
                        nextServer = null;
                        // Give it a moment to release the file handle
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    log(`Attempting to delete database at: ${dbPath}`);
                    if (fs_1.default.existsSync(dbPath)) {
                        try {
                            fs_1.default.unlinkSync(dbPath);
                            log('Database deleted successfully');
                        }
                        catch (e) {
                            log(`Failed to delete database: ${e}`);
                            // Try again after a longer delay
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            try {
                                fs_1.default.unlinkSync(dbPath);
                                log('Database deleted successfully (retry)');
                            }
                            catch (e2) {
                                log(`Failed to delete database (retry): ${e2}`);
                            }
                        }
                    }
                    else {
                        log('Database file does not exist, nothing to delete');
                    }
                    // Also delete journal file if it exists
                    const journalPath = dbPath + '-journal';
                    if (fs_1.default.existsSync(journalPath)) {
                        try {
                            fs_1.default.unlinkSync(journalPath);
                            log('Database journal deleted');
                        }
                        catch (e) {
                            log(`Failed to delete journal: ${e}`);
                        }
                    }
                    // Also delete WAL file if it exists (SQLite WAL mode)
                    const walPath = dbPath + '-wal';
                    if (fs_1.default.existsSync(walPath)) {
                        try {
                            fs_1.default.unlinkSync(walPath);
                            log('Database WAL deleted');
                        }
                        catch (e) {
                            log(`Failed to delete WAL: ${e}`);
                        }
                    }
                    // Also delete SHM file if it exists (SQLite shared memory)
                    const shmPath = dbPath + '-shm';
                    if (fs_1.default.existsSync(shmPath)) {
                        try {
                            fs_1.default.unlinkSync(shmPath);
                            log('Database SHM deleted');
                        }
                        catch (e) {
                            log(`Failed to delete SHM: ${e}`);
                        }
                    }
                    log('Restarting application...');
                    electron_1.dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'フォルダ変更',
                        message: 'フォルダが変更されました。アプリケーションを再起動します。',
                        buttons: ['OK']
                    }).then(() => {
                        electron_1.app.relaunch();
                        electron_1.app.exit(0);
                    });
                    return newPath;
                }
                return null;
            });
            if (!fs_1.default.existsSync(dbPath)) {
                const resourceDbPath = path_1.default.join(process.resourcesPath, 'prisma', 'dev.db');
                const devDbPath = path_1.default.join(__dirname, '..', 'prisma', 'dev.db');
                let sourceDb = '';
                if (fs_1.default.existsSync(resourceDbPath)) {
                    sourceDb = resourceDbPath;
                }
                else if (fs_1.default.existsSync(devDbPath)) {
                    sourceDb = devDbPath;
                }
                if (sourceDb) {
                    console.log(`Copying database from ${sourceDb} to ${dbPath}`);
                    fs_1.default.copyFileSync(sourceDb, dbPath);
                }
                else {
                    console.error('Could not find source database to copy!');
                }
            }
            const serverEnv = {
                ...process.env,
                PORT: port.toString(),
                NODE_ENV: 'production',
                HOSTNAME: 'localhost',
                ELECTRON_RUN_AS_NODE: '1',
                DATABASE_URL: `file:${dbPath}`,
                MATCHES_DIR: matchesDir,
            };
            nextServer = (0, child_process_1.spawn)(process.execPath, [serverPath], {
                cwd: serverDir,
                env: serverEnv,
                stdio: 'pipe',
            });
            nextServer.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log('[Next.js]', output);
                const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'main.log');
                fs_1.default.appendFileSync(logPath, `${new Date().toISOString()} [Next.js] ${output}\n`);
                if (output.includes('Ready') || output.includes('started') || output.includes('Listening')) {
                    resolve(port);
                }
            });
            nextServer.stderr?.on('data', (data) => {
                const output = data.toString();
                console.error('[Next.js Error]', output);
                const logPath = path_1.default.join(electron_1.app.getPath('userData'), 'main.log');
                fs_1.default.appendFileSync(logPath, `${new Date().toISOString()} [Next.js Error] ${output}\n`);
            });
            nextServer.on('error', (error) => {
                console.error('Failed to start server:', error);
                reject(error);
            });
            nextServer.on('exit', (code) => {
                console.log('Server exited with code:', code);
            });
            setTimeout(() => resolve(port), 5000);
        }
        catch (error) {
            reject(error);
        }
    });
}
electron_1.app.whenReady().then(async () => {
    try {
        const port = await startNextServer();
        createWindow(port);
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
        // In dev mode we use 3000, in prod we might need to store the port if we want to recreate window without restarting server
        // For now, simple re-creation might fail if we don't know the port.
        // But typically on macOS (where activate is used), the app stays running.
        // We can store the port in a global variable.
    }
});
electron_1.app.on('before-quit', () => {
    if (nextServer) {
        nextServer.kill();
    }
});
//# sourceMappingURL=main.js.map