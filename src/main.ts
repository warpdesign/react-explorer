import { app, BrowserWindow } from 'electron'
declare var __dirname: string
let mainWindow: Electron.BrowserWindow

function installReactDevTools() {
  const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name:any) => console.log(`Added Extension:  ${name}`))
    .catch((err:any) => console.log('An error occurred: ', err));
}

function onReady() {
  installReactDevTools();

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  const fileName = `file://${__dirname}/index.html`;

  mainWindow.loadURL(fileName);

  mainWindow.on('close', () => app.quit());
}

app.on('ready', () => onReady());
app.on('window-all-closed', () => app.quit());

console.log(`Electron Version ${app.getVersion()}`);