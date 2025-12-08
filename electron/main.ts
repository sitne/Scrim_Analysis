import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import net from 'net';

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

const isDev = process.env.NODE_ENV === 'development';

function getServerPath(): string {
    if (isDev) {
        return ''; // Not used in dev mode
    }

    const resources = process.resourcesPath;
    const logPath = path.join(app.getPath('userData'), 'main.log');

    function log(message: string) {
        fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
    }

    log(`Resources path: ${resources}`);

    const candidates = [
        path.join(resources, 'standalone', 'server.js'),
        path.join(resources, 'standalone', 'code', 'runs', 'server.js'),
        path.join(resources, 'app.asar.unpacked', '.next', 'standalone', 'server.js'),
        path.join(resources, 'app.asar.unpacked', '.next', 'standalone', 'code', 'runs', 'server.js'),
        path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
        path.join(__dirname, '..', '.next', 'standalone', 'code', 'runs', 'server.js'),
        path.join(__dirname, '..', 'server.js'),
    ];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            log(`Found server at: ${p}`);
            console.log('Found server at:', p);
            return p;
        }
    }

    log(`Server not found! Tried: ${JSON.stringify(candidates)}`);
    console.error('Server not found! Tried:', candidates);
    return candidates[0];
}

const getFreePort = async (): Promise<number> => {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
};

function createWindow(port: number) {
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
            } catch (error) {
                console.log(`Retry ${i + 1}/${retries} loading URL...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

    loadWithRetry();

    ipcMain.on('open-matches-folder', () => {
        const matchesDir = path.join(app.getPath('userData'), 'matches');
        if (!fs.existsSync(matchesDir)) {
            fs.mkdirSync(matchesDir, { recursive: true });
        }
        shell.openPath(matchesDir);
    });
}

function startNextServer(): Promise<number> {
    return new Promise(async (resolve, reject) => {
        if (isDev) {
            resolve(3000);
            return;
        }

        try {
            const port = await getFreePort();
            const serverPath = getServerPath();
            const serverDir = path.dirname(serverPath);

            console.log('Starting Next.js server from:', serverPath);
            console.log('Server directory:', serverDir);
            console.log('Using port:', port);

            const userDataPath = app.getPath('userData');
            const dbPath = path.join(userDataPath, 'database.db');
            const configPath = path.join(userDataPath, 'config.json');

            let config = { matchesDir: path.join(userDataPath, 'matches') };
            try {
                if (fs.existsSync(configPath)) {
                    const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    if (savedConfig.matchesDir) {
                        config.matchesDir = savedConfig.matchesDir;
                    }
                }
            } catch (e) {
                console.error('Failed to load config:', e);
            }

            const matchesDir = config.matchesDir;

            if (!fs.existsSync(matchesDir)) {
                fs.mkdirSync(matchesDir, { recursive: true });
            }

            ipcMain.handle('get-matches-dir', () => {
                return config.matchesDir;
            });

            ipcMain.handle('change-matches-dir', async () => {
                const result = await dialog.showOpenDialog(mainWindow!, {
                    properties: ['openDirectory', 'createDirectory'],
                    defaultPath: config.matchesDir,
                    title: 'Select Matches Directory'
                });

                if (!result.canceled && result.filePaths.length > 0) {
                    const newPath = result.filePaths[0];
                    config.matchesDir = newPath;
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

                    // Delete database to clear all match data when folder changes
                    const logPath = path.join(userDataPath, 'main.log');
                    const log = (msg: string) => {
                        const logLine = `${new Date().toISOString()} [FolderChange] ${msg}\n`;
                        console.log(msg);
                        fs.appendFileSync(logPath, logLine);
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

                    if (fs.existsSync(dbPath)) {
                        try {
                            fs.unlinkSync(dbPath);
                            log('Database deleted successfully');
                        } catch (e) {
                            log(`Failed to delete database: ${e}`);
                            // Try again after a longer delay
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            try {
                                fs.unlinkSync(dbPath);
                                log('Database deleted successfully (retry)');
                            } catch (e2) {
                                log(`Failed to delete database (retry): ${e2}`);
                            }
                        }
                    } else {
                        log('Database file does not exist, nothing to delete');
                    }

                    // Also delete journal file if it exists
                    const journalPath = dbPath + '-journal';
                    if (fs.existsSync(journalPath)) {
                        try {
                            fs.unlinkSync(journalPath);
                            log('Database journal deleted');
                        } catch (e) {
                            log(`Failed to delete journal: ${e}`);
                        }
                    }

                    // Also delete WAL file if it exists (SQLite WAL mode)
                    const walPath = dbPath + '-wal';
                    if (fs.existsSync(walPath)) {
                        try {
                            fs.unlinkSync(walPath);
                            log('Database WAL deleted');
                        } catch (e) {
                            log(`Failed to delete WAL: ${e}`);
                        }
                    }

                    // Also delete SHM file if it exists (SQLite shared memory)
                    const shmPath = dbPath + '-shm';
                    if (fs.existsSync(shmPath)) {
                        try {
                            fs.unlinkSync(shmPath);
                            log('Database SHM deleted');
                        } catch (e) {
                            log(`Failed to delete SHM: ${e}`);
                        }
                    }

                    log('Restarting application...');

                    dialog.showMessageBox(mainWindow!, {
                        type: 'info',
                        title: 'フォルダ変更',
                        message: 'フォルダが変更されました。アプリケーションを再起動します。',
                        buttons: ['OK']
                    }).then(() => {
                        app.relaunch();
                        app.exit(0);
                    });

                    return newPath;
                }
                return null;
            });

            if (!fs.existsSync(dbPath)) {
                const resourceDbPath = path.join(process.resourcesPath, 'prisma', 'dev.db');
                const devDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

                let sourceDb = '';
                if (fs.existsSync(resourceDbPath)) {
                    sourceDb = resourceDbPath;
                } else if (fs.existsSync(devDbPath)) {
                    sourceDb = devDbPath;
                }

                if (sourceDb) {
                    console.log(`Copying database from ${sourceDb} to ${dbPath}`);
                    fs.copyFileSync(sourceDb, dbPath);
                } else {
                    console.error('Could not find source database to copy!');
                }
            }

            const serverEnv: NodeJS.ProcessEnv = {
                ...(process.env as NodeJS.ProcessEnv),
                PORT: port.toString(),
                NODE_ENV: 'production',
                HOSTNAME: 'localhost',
                ELECTRON_RUN_AS_NODE: '1',
                DATABASE_URL: `file:${dbPath}`,
                MATCHES_DIR: matchesDir,
            };

            nextServer = spawn(process.execPath, [serverPath], {
                cwd: serverDir,
                env: serverEnv,
                stdio: 'pipe',
            });

            nextServer.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log('[Next.js]', output);
                const logPath = path.join(app.getPath('userData'), 'main.log');
                fs.appendFileSync(logPath, `${new Date().toISOString()} [Next.js] ${output}\n`);

                if (output.includes('Ready') || output.includes('started') || output.includes('Listening')) {
                    resolve(port);
                }
            });

            nextServer.stderr?.on('data', (data) => {
                const output = data.toString();
                console.error('[Next.js Error]', output);
                const logPath = path.join(app.getPath('userData'), 'main.log');
                fs.appendFileSync(logPath, `${new Date().toISOString()} [Next.js Error] ${output}\n`);
            });

            nextServer.on('error', (error) => {
                console.error('Failed to start server:', error);
                reject(error);
            });

            nextServer.on('exit', (code) => {
                console.log('Server exited with code:', code);
            });

            setTimeout(() => resolve(port), 5000);

        } catch (error) {
            reject(error);
        }
    });
}

app.whenReady().then(async () => {
    try {
        const port = await startNextServer();
        createWindow(port);
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
        // In dev mode we use 3000, in prod we might need to store the port if we want to recreate window without restarting server
        // For now, simple re-creation might fail if we don't know the port.
        // But typically on macOS (where activate is used), the app stays running.
        // We can store the port in a global variable.
    }
});

app.on('before-quit', () => {
    if (nextServer) {
        nextServer.kill();
    }
});
