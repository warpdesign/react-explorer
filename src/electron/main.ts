import { app, BrowserWindow, ipcMain, ipcRenderer } from 'electron';
import * as process from 'process';
import { watch } from 'fs';
import { AppMenu, LocaleString } from './appMenus';
import { isPackage } from '../utils/platform';

declare var __dirname: string
declare var ENV: any;

const ENV_E2E = !!process.env.E2E;
const SOURCE_PATH = './build';
const HTML_PATH = `file://${__dirname}/index.html`;
const WINDOW_DEFAULT_SETTINGS = {
    minWidth: 750,
    width: 800,
    height: 600
};

const ElectronApp = {
    mainWindow: <Electron.BrowserWindow>null,
    devWindow: <Electron.BrowserWindow>null,
    appMenu: <AppMenu>null,
    cleanupCounter: 0,
    forceExit: false,
    /**
     * Listen to Electron app events
     */
    init() {
        app.on('ready', () => this.onReady());
        // prevent app from exiting at first request: the user may attempt to exit the app
        // while transfers are in progress so we first send a request to the frontend
        // if no transfers are in progress, exit confirmation is received which makes the app close
        app.on('before-quit', (e) => {
            console.log('before quit');
            if (!this.forceExit) {
                e.preventDefault();
            } else {
                this.cleanupAndExit();
            }
        });

        app.on('activate', (e) => {
            if (this.mainWindow) {
                this.mainWindow.restore();
            }
        });
    },
    /**
     * Create React-Explorer main window and:
     * - load entry html file
     * - bind close/minimize events
     * - create main menu
     */
    createMainWindow() {
        console.log('Create Main Window');
        this.mainWindow = new BrowserWindow({
            minWidth: WINDOW_DEFAULT_SETTINGS.minWidth,
            width: WINDOW_DEFAULT_SETTINGS.width,
            height: WINDOW_DEFAULT_SETTINGS.height,
            webPreferences: {
                enableBlinkFeatures: 'OverlayScrollbars,OverlayScrollbarsFlashAfterScrollUpdate,OverlayScrollbarsFlashWhenMouseEnter'
            }
        });

        this.mainWindow.loadURL(HTML_PATH);

        // this.mainWindow.on('close', () => app.quit());

        // Prevent the window from closing in case transfers are in progress
        this.mainWindow.on('close', (e: Event) => {
            if (!this.forceExit) {
                console.log('exit request and no force: sending back exitRequest');
                e.preventDefault();
                this.mainWindow.webContents.send('exitRequest');
            }
        });

        this.mainWindow.on('minimize', () => {
            this.mainWindow.minimize();
        });

        this.appMenu = new AppMenu(this.mainWindow);
    },
    /**
     * Install special React DevTools
     */
    installReactDevTools() {
        console.log('Install React DevTools');
        const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name: any) => console.log(`Added Extension:  ${name}`))
            .catch((err: any) => console.log('An error occurred: ', err));
    },
    /**
     * Install recursive file watcher to reload the app on fs change events
     * Note that this probably won't work correctly under Linux since fs.watch
     * doesn't support recrusive watch on this OS.
     */
    installWatcher() {
        if (!ENV_E2E && !isPackage) {
            console.log('Install Code Change Watcher');
            watch(SOURCE_PATH, { recursive: true }, () => this.reloadApp());
        }
    },
    /**
     * Clears the session cache and reloads main window without cache
     */
    reloadApp() {
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

        ipcMain.on('readyToExit', () => {
            this.cleanupAndExit();
        });

        ipcMain.on('openDevTools', () => {
            console.log('should open dev tools');
            this.openDevTools(true);
        });

        ipcMain.on('openTerminal', (event: Event, cmd: string) => {
            console.log('running', cmd);
            const exec = require("child_process").exec;
            exec(cmd).unref();
        });

        ipcMain.on('languageChanged', (e: Event, strings: LocaleString) => {
            if (this.appMenu) {
                this.appMenu.createMenu(strings);
            } else {
                console.log('languageChanged but app not ready :(');
            }
        });

        ipcMain.on('selectAll', () => {
            if (this.mainWindow) {
                this.mainWindow.webContents.selectAll();
            }
        });

        ipcMain.on('needsCleanup', () => this.cleanupCounter++);
        ipcMain.on('cleanedUp', () => this.onCleanUp());
    },

    /**
     * Called when the app is ready to exit: this will send cleanup event to renderer process
     * 
     */
    cleanupAndExit() {
        console.log('cleanupAndExit');
        if (this.cleanupCounter) {
            console.log('cleanupCounter non zero');
            this.mainWindow.webContents.send('cleanup');
        } else {
            console.log('cleanupCount zero: exit');
            app.exit();
        }
    },
    onCleanUp() {
        console.log('onCleanup');
        this.cleanupCounter--;
        // exit app if everything has been cleaned up
        // otherwise do nothing and wait for cleanup
        if (!this.cleanupCounter) {
            app.exit();
        }
    },
    /**
     * Open the dev tools window
     */
    openDevTools(force = false) {
        // spectron problem if devtools is opened, see https://github.com/electron/spectron/issues/254
        if ((!ENV_E2E && !isPackage) || force) {
            if (!this.devWindow || this.devWindow.isDestroyed()) {
                this.devWindow = new BrowserWindow();
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
    onReady() {
        console.log('App Ready');
        if (!ENV_E2E && !isPackage) {
            this.installReactDevTools();
        }

        this.installIpcMainListeners();
        this.createMainWindow();
        this.installWatcher();
        this.openDevTools();
    }
}

console.log(`Electron Version ${app.getVersion()}`);
ElectronApp.init();
