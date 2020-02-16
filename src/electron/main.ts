import { app, BrowserWindow, ipcMain, ipcRenderer } from 'electron';
const process = require('process');
import { watch } from 'fs';
const path = require('path');
import { AppMenu, LocaleString } from './appMenus';
import { isPackage, isLinux } from '../utils/platform';
import { WindowSettings } from './windowSettings';

declare var __dirname: string
declare var ENV: any;

const ENV_E2E = !!process.env.E2E;
const SOURCE_PATH = './build';
const HTML_URL = `file://${__dirname}/index.html`;
const HTML_PATH = `${__dirname}/index.html`;

const ElectronApp = {
    mainWindow: <Electron.BrowserWindow>null,
    devWindow: <Electron.BrowserWindow>null,
    appMenu: <AppMenu>null,
    cleanupCounter: 0,
    forceExit: false,
    /**
     * Listen to Electron app events
     */
    async init() {
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
    createMainWindow() {
        console.log('Create Main Window');

        const settings = WindowSettings.getSettings(0);
        // console.log('settings', settings);

        this.mainWindow = new BrowserWindow({
            minWidth: WindowSettings.DEFAULTS.minWidth,
            minHeight: WindowSettings.DEFAULTS.minHeight,
            width: settings.width,
            height: settings.height,
            x: settings.x,
            y: settings.y,
            webPreferences: {
                nodeIntegration: true
            },
            icon: isLinux && path.join(__dirname, 'icon.png') || undefined
        });

        settings.manage(this.mainWindow);

        if (!settings.getCustom()) {
            settings.setCustom({
                splitView: false
            });
        }

        console.log(settings.getCustom());

        this.mainWindow.initialSettings = settings.getCustom();

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
            console.log('readyToExit');
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

        ipcMain.on('needsCleanup', () => { console.log('needscleanup'); this.cleanupCounter++; console.log('needscleanup, counter now:', this.cleanupCounter); });
        ipcMain.on('cleanedUp', () => this.onCleanUp());

        ipcMain.on('setWindowSettings', (_:Event, data: {[key:string]: any}) => {
            console.log('changeWindowSettings', data);
            const { id, settings } = data;
            const state = WindowSettings.getSettings(id);
            console.log('got state', state);
            state.setCustom(settings);
        });
    },

    /**
     * Called when the app is ready to exit: this will send cleanup event to renderer process
     * 
     */
    cleanupAndExit() {
        console.log('cleanupAndExit');
        if (this.cleanupCounter) {
            console.log('cleanupCounter non zero', this.cleanupCounter);
            this.mainWindow.webContents.send('cleanup');
        } else {
            console.log('cleanupCount zero: exit');
            app.exit();
        }
    },
    onCleanUp() {
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
    openDevTools(force = false) {
        // spectron problem if devtools is opened, see https://github.com/electron/spectron/issues/254
        if ((!ENV_E2E && !isPackage) || force) {
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
