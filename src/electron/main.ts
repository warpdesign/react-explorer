import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as process from 'process';
import { watch } from 'fs';
import { AppMenu, LocaleString } from './appMenus';
import { isPackage } from '../utils/platform';

declare var __dirname: string
declare var ENV: any;

// const CLOSE_EXIT_DELAY = 2000;
const ENV_E2E = !!process.env.E2E;

let mainWindow: Electron.BrowserWindow;
let appMenu: AppMenu;

function installReactDevTools() {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

    installExtension(REACT_DEVELOPER_TOOLS)
        .then((name: any) => console.log(`Added Extension:  ${name}`))
        .catch((err: any) => console.log('An error occurred: ', err));
}

function installWatcher(path: string) {
    watch(path, { recursive: true }, reloadApp);
}

function reloadApp() {
    if (mainWindow) {
        mainWindow.webContents.session.clearCache(function () {
            mainWindow.webContents.reloadIgnoringCache();
        });
    }
}

let forceExit = false;

function installExitListeners() {
    let exitWindow: BrowserWindow = null;
    let timeout: any = 0;

    ipcMain.on('reloadIgnoringCache', reloadApp);

    // ipcMain.on('exitWarning', (event:Event, exitString:string) => {
    //     console.log('exitWindow', exitString);

    //     if (exitWindow) {
    //         clearTimeout(timeout);
    //         timeout = 0;
    //     } else {
    //         exitWindow = new BrowserWindow({
    //             width: 560,
    //             height: 130,
    //             transparent: true,
    //             frame: false,
    //             alwaysOnTop: true,
    //             focusable: false
    //         });

    //         exitWindow.loadURL("data:text/html;charset=utf-8," + encodeURI(`<html><head><style type="text/css">p{border-radius:4px;padding: 22px 5px;background-color:rgba(80,80,80,.8);color:white;text-shadow:1px 1px 2px rgba(79,79,79,.3);font-size:24px;}body{font-family:Helvetica;text-align:center;background-color:transparent}</style></head><body><p>${exitString}</p></body></html>`));
    //     }
    // });

    // ipcMain.on('endExitWarning', () => {
    //     console.log('endExitWindow');
    //     timeout = setTimeout(() => {
    //         if (exitWindow) {
    //             exitWindow.close();
    //             exitWindow = null;
    //         }
    //     }, CLOSE_EXIT_DELAY);
    // });

    ipcMain.on('exit', () => {
        forceExit = true;
        console.log('need to exit without warning!');
        app.quit();
    });

    ipcMain.on('openTerminal', (event: Event, cmd: string) => {
        console.log('running', cmd);
        const exec = require("child_process").exec;
        exec(cmd).unref();
    });

    ipcMain.on('languageChanged', (e: Event, strings: LocaleString) => {
        if (appMenu) {
            appMenu.createMenu(strings);
        } else {
            console.log('languageChanged but app not ready :(');
        }
    });

    ipcMain.on('selectAll', () => {
        mainWindow.webContents.selectAll();
    });
}

function onReady() {
    if (!ENV_E2E && !isPackage) {
        installReactDevTools();
    }
    installExitListeners();

    mainWindow = new BrowserWindow({
        minWidth: 750,
        width: 800,
        height: 600,
        webPreferences: {
            enableBlinkFeatures: 'OverlayScrollbars'
        }
    });

    if (!ENV_E2E && !isPackage) {
        // const { dialog } = require('electron');
        // dialog.showMessageBox(null, {
        //     message: JSON.stringify(process.env)
        // });
        installWatcher('./build');
    }

    const fileName = `file://${__dirname}/index.html`;

    mainWindow.loadURL(fileName);

    mainWindow.on('close', () => app.quit());

    // devtools
    // spectron problem if devtools is opened, see https://github.com/electron/spectron/issues/254
    if (!ENV_E2E && !isPackage) {
        const devtools = new BrowserWindow();
        mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Prevent the window from closing in case transfers are in progress
    mainWindow.on('close', (e: Event) => {
        if (!forceExit) {
            console.log('exit request and no force: sending back exitRequest');
            e.preventDefault();
            mainWindow.webContents.send('exitRequest');
        }
    });

    mainWindow.on('minimize', () => {
        mainWindow.minimize();
    });

    appMenu = new AppMenu(mainWindow);
}


app.on('ready', () => onReady());
// prevent app from exiting at first request: the user may attempt to exit the app
// while transfers are in progress so we first send a request to the frontend
// if no transfers are in progress, exit confirmation is received which makes the app close
app.on('before-quit', (e) => {
    console.log('before quit');
    if (!forceExit) {
        e.preventDefault();
    } else {
        console.log('oops, bye!');
        // force exit app: filesystem access (transfers in progress) may prevent the app from quiting
        app.exit();
    }
});

app.on('activate', (e) => {
    if (mainWindow) {
        mainWindow.restore();
    }
});

console.log(`Electron Version ${app.getVersion()}`);
