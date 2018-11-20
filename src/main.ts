import { app, BrowserWindow } from 'electron';
import { watch } from 'fs';

declare var __dirname: string

let mainWindow: Electron.BrowserWindow

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

function onReady() {
  installReactDevTools();

  mainWindow = new BrowserWindow({
    minWidth: 750,
    width: 800,
    height: 600
  });

  installWatcher('./dist', mainWindow);

  const fileName = `file://${__dirname}/index.html`;

  mainWindow.loadURL(fileName);

  mainWindow.on('close', () => app.quit());

  // devtools
  const devtools = new BrowserWindow();
  mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.on('ready', () => onReady());
app.on('window-all-closed', () => app.quit());

console.log(`Electron Version ${app.getVersion()}`);