import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import process = require('process');
import path = require('path');
import child_process = require('child_process');
import { AppMenu, LocaleString } from './appMenus';
import { isLinux } from './osSupport';
import { WindowSettings } from './windowSettings';
import { Remote } from './remote';

declare const ENV: { [key: string]: string | boolean | number | Record<string, unknown> };
const ENV_E2E = !!process.env.E2E;
const HTML_PATH = `${__dirname}/index.html`;

// allow non-content-aware native modules, needed for drivelist
// see: https://github.com/balena-io-modules/drivelist/issues/373
app.allowRendererProcessReuse = false;

const ElectronApp = {
    mainWindow: null as Electron.BrowserWindow,
    devWindow: null as Electron.BrowserWindow,
    appMenu: null as AppMenu,
    cleanupCounter: 0,
    forceExit: false,
    /**
     * Listen to Electron app events
     */
    init(): void {
        app.on('ready', () => this.onReady());
        // prevent app from exiting at first request: the user may attempt to exit the app
        // while transfers are in progress so we first send a request to the frontend
        // if no transfers are in progress, exit confirmation is received which makes the app close
        app.on('before-quit', (e) => {
            // TODO: detect interrupt
            console.log('before quit');
            if (!this.forceExit) {
                console.log('no forceExit, sending exitRequest to renderer');
                e.preventDefault();
                this.mainWindow.webContents.send('exitRequest');
            } else {
                console.log('forceExit is true, calling cleanupAndExit');
                this.cleanupAndExit();
            }
        });

        app.on('activate', (e) => {
            if (this.mainWindow) {
                this.mainWindow.restore();
            }
        });

        // when interrupt is received we have to force exit
        process.on('SIGINT', function () {
            console.log('*** BREAK');
            this.forceExit = true;
        });
    },
    /**
     * Create React-Explorer main window and:
     * - load entry html file
     * - bind close/minimize events
     * - create main menu
     */
    async createMainWindow(): Promise<void> {
        console.log('Create Main Window');

        await Remote.init();

        this.mainWindow = new BrowserWindow({
            minWidth: WindowSettings.DEFAULTS.minWidth,
            minHeight: WindowSettings.DEFAULTS.minHeight,
            // width: settings.width,
            // height: settings.height,
            // x: settings.x,
            // y: settings.y,
            webPreferences: {
                nodeIntegration: true,
                enableRemoteModule: true,
            },
            icon: (isLinux && path.join(__dirname, 'icon.png')) || undefined,
        });

        const settings = WindowSettings.getSettings(this.mainWindow.id);
        console.log('settings', settings.x);

        settings.manage(this.mainWindow);

        this.mainWindow.setBounds({
            width: settings.width,
            height: settings.height,
            x: settings.x || this.mainWindow.getBounds().x,
            y: settings.y || this.mainWindow.getBounds().y,
        });

        if (!settings.custom) {
            console.log('custom settings not found: resetting');
            settings.custom = {
                splitView: false,
            };
        }

        console.log(settings.custom);

        // this.mainWindow.initialSettings = settings.custom;

        // this.mainWindow.loadURL(HTML_PATH);
        this.mainWindow.loadFile(HTML_PATH);

        // this.mainWindow.on('close', () => app.quit());

        // Prevent the window from closing in case transfers are in progress
        this.mainWindow.on('close', (e: Event) => {
            console.log('on:close');
            if (!this.forceExit) {
                console.log('exit request and no force: sending back exitRequest');
                e.preventDefault();
                this.mainWindow.webContents.send('exitRequest');
            } else {
                console.log('forceExit: let go exit event');
            }
        });

        this.mainWindow.on('minimize', () => {
            this.mainWindow.minimize();
        });

        // this.mainWindpw.on('page-title-updated', (e: Event) => {
        //     e.preventDefault();
        // });

        this.appMenu = new AppMenu(this.mainWindow);
    },
    /**
     * Install special React DevTools
     */
    installReactDevTools(): void {
        console.log('Install React DevTools');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name: string) => console.log(`Added Extension:  ${name}`))
            .catch((err: Error) => console.log('An error occurred: ', err));
    },
    /**
     * Install recursive file watcher to reload the app on fs change events
     * Note that this probably won't work correctly under Linux since fs.watch
     * doesn't support recrusive watch on this OS.
     */
    // installWatcher(): void {
    //     if (!ENV_E2E && !isPackage) {
    //         console.log('Install Code Change Watcher');
    //         watch(SOURCE_PATH, { recursive: true }, () => this.reloadApp());
    //     }
    // },
    /**
     * Clears the session cache and reloads main window without cache
     */
    reloadApp(): void {
        const mainWindow = this.mainWindow;
        if (mainWindow) {
            mainWindow.webContents.session.clearCache(() => {
                mainWindow.webContents.reloadIgnoringCache();
            });
        }
    },
    /**
     * Install listeners to handle messages coming from the renderer process:
     *
     * - reloadIgnoringCache: need to reload the main window (dev only)
     * - exit: wants to exit the app
     * - openTerminal(cmd): should open a new terminal process using specified cmd line
     * - languageChanged(strings): language has been changed so menus need to be updated
     * - selectAll: wants to generate a selectAll event
     */
    installIpcMainListeners() {
        console.log('Install ipcMain Listeners');

        ipcMain.on('reloadIgnoringCache', () => this.reloadApp());

        ipcMain.handle('readyToExit', () => {
            console.log('readyToExit');
            this.cleanupAndExit();
        });

        ipcMain.handle('openDevTools', () => {
            console.log('should open dev tools');
            this.openDevTools(true);
        });

        ipcMain.handle(
            'openTerminal',
            (event: Event, cmd: string): Promise<{ code: number; terminal: string }> => {
                console.log('running', cmd);
                const exec = child_process.exec;
                return new Promise((resolve) => {
                    exec(cmd, (error: child_process.ExecException) => {
                        if (error) {
                            resolve({ code: error.code, terminal: cmd });
                        } else {
                            resolve();
                        }
                    }).unref();
                });
            },
        );

        ipcMain.handle('languageChanged', (e: Event, strings: LocaleString, lang: string) => {
            if (this.appMenu) {
                this.appMenu.createMenu(strings, lang);
            } else {
                console.log('languageChanged but app not ready :(');
            }
        });

        ipcMain.handle('selectAll', () => {
            if (this.mainWindow) {
                this.mainWindow.webContents.selectAll();
            }
        });

        ipcMain.handle('needsCleanup', () => {
            console.log('needscleanup');
            this.cleanupCounter++;
            console.log('needscleanup, counter now:', this.cleanupCounter);
        });
        ipcMain.handle('cleanedUp', () => this.onCleanUp());

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ipcMain.handle('setWindowSettings', (event, data: { [key: string]: any }) => {
            const { settings } = data;
            console.log('changeWindowSettings', event.sender.id, settings);
            const state = WindowSettings.getSettings(event.sender.id);
            console.log('got state', state);
            state.custom = settings;
        });
    },

    installNativeThemeListener(): void {
        nativeTheme.on('updated', () => {
            BrowserWindow.getAllWindows().forEach((window) => {
                window.webContents.send('nativeTheme:updated', nativeTheme.shouldUseDarkColors);
            });
        });
    },

    /**
     * Called when the app is ready to exit: this will send cleanup event to renderer process
     *
     */
    cleanupAndExit(): void {
        console.log('cleanupAndExit');
        if (this.cleanupCounter) {
            console.log('cleanupCounter non zero', this.cleanupCounter);
            this.mainWindow.webContents.send('cleanup');
        } else {
            console.log('cleanupCount zero: exit');
            app.exit();
        }
    },
    onCleanUp(): void {
        this.cleanupCounter--;
        // exit app if everything has been cleaned up
        // otherwise do nothing and wait for cleanup
        console.log('onCleanUp, counter now', this.cleanupCounter);
        if (!this.cleanupCounter) {
            console.log('cleanupCounter equals to zero, calling app.exit()');
            app.exit();
        } else {
            console.log('cleanupCounter non zero, cancel exit', this.cleanupCounter);
        }
    },
    /**
     * Open the dev tools window
     */
    openDevTools(force = false): void {
        // spectron problem if devtools is opened, see https://github.com/electron/spectron/issues/254
        if ((!ENV_E2E && ENV.NODE_ENV) !== 'production' || force) {
            if (!this.devWindow || this.devWindow.isDestroyed()) {
                const winState = WindowSettings.getDevToolsSettings();

                this.devWindow = new BrowserWindow({
                    width: winState.width,
                    height: winState.height,
                    x: winState.x,
                    y: winState.y,
                });

                winState.manage(this.devWindow);

                this.mainWindow.webContents.setDevToolsWebContents(this.devWindow.webContents);
                this.mainWindow.webContents.openDevTools({ mode: 'detach' });
            } else {
                if (this.devWindow.isMinimized()) {
                    this.devWindow.restore();
                } else {
                    this.devWindow.focus();
                }
            }
        }
    },
    /**
     * app.ready callback: that's the app's main entry point
     */
    async onReady(): Promise<void> {
        console.log('App Ready');
        // react-devtools doesn't work properly with file:// scheme, starting with Electron 9
        // see: https://github.com/electron/electron/issues/24011 &
        // https://github.com/electron/electron/pull/25151
        // if (!ENV_E2E && !isPackage) {
        //     this.installReactDevTools();
        // }

        this.installIpcMainListeners();
        this.installNativeThemeListener();
        await this.createMainWindow();
        this.openDevTools();
    },
};

console.log(`Electron Version ${app.getVersion()}`);
ElectronApp.init();
