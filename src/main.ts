import { app, BrowserWindow, ipcMain } from 'electron';
import * as process from 'process';
import { watch } from 'fs';

declare var __dirname: string

const CLOSE_EXIT_DELAY = 2000;
const ENV_E2E = !!process.env.E2E;

let mainWindow: Electron.BrowserWindow;

function installReactDevTools() {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name:any) => console.log(`Added Extension:  ${name}`))
      .catch((err: any) => console.log('An error occurred: ', err));
}

function installWatcher(path: string, window: BrowserWindow) {
    watch(path, { recursive: true }, () => {
    window.webContents.reloadIgnoringCache();
  });
}

let forceExit = false;

function installExitListeners() {
    let exitWindow: BrowserWindow = null;
    let timeout:any = 0;

    ipcMain.on('exitWarning', (event:Event, exitString:string) => {
        console.log('exitWindow', exitString);

        if (exitWindow) {
            clearTimeout(timeout);
            timeout = 0;
        } else {
            exitWindow = new BrowserWindow({
                width: 560,
                height: 130,
                transparent: true,
                frame: false,
                alwaysOnTop: true,
                focusable: false
            });

            exitWindow.loadURL("data:text/html;charset=utf-8," + encodeURI(`<html><head><style type="text/css">p{border-radius:4px;padding: 22px 5px;background-color:rgba(80,80,80,.8);color:white;text-shadow:1px 1px 2px rgba(79,79,79,.3);font-size:24px;}body{font-family:Helvetica;text-align:center;background-color:transparent}</style></head><body><p>${exitString}</p></body></html>`));
        }
    });

    ipcMain.on('endExitWarning', () => {
        console.log('endExitWindow');
        timeout = setTimeout(() => {
            if (exitWindow) {
                exitWindow.close();
                exitWindow = null;
            }
        }, CLOSE_EXIT_DELAY);
    });

    ipcMain.on('exit', () => {
        forceExit = true;
        console.log('need to exit without warning!');
        app.quit();
    });
}

function onReady() {
    if (!ENV_E2E) {
        installReactDevTools();
    }
    installExitListeners();

    mainWindow = new BrowserWindow({
        minWidth: 750,
        width: 800,
        height: 600
    });

    if (!ENV_E2E) {
        installWatcher('./dist', mainWindow);
    }

    const fileName = `file://${__dirname}/index.html`;

    mainWindow.loadURL(fileName);

    mainWindow.on('close', () => app.quit());

    // devtools
    // spectron problem if devtools is opened, see https://github.com/electron/spectron/issues/254
    if (!ENV_E2E) {
        const devtools = new BrowserWindow();
        mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('close', (e: Event) => {
        if (!forceExit) {
            console.log('exit request and no force: sending back exitRequest');
            e.preventDefault();
            mainWindow.webContents.send('exitRequest');
        }
    })
}

app.on('ready', () => onReady());
app.on('before-quit', (e) => {
    console.log('before quit');
    // prevent cmd+q to exit on macOS
    if (!forceExit) {
        e.preventDefault();
    } else {
        console.log('oops, bye!');
        // force exit app: filesystem access (transfers in progress) may prevent the app from quiting
        app.exit();
    }
});

console.log(`Electron Version ${app.getVersion()}`);
