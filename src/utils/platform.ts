import { platform } from 'process';
import { release, userInfo } from 'os';
import { remote, app } from 'electron';

declare var ENV: any;

type App = {getPath: (name:string) => string} | Partial<Electron.App>;

function getDefaultFolder() {
    let defaultFolder = "";

    if (typeof jest !== 'undefined') {
        defaultFolder = "";
    } else {
        defaultFolder = ENV.NODE_ENV === 'production' ? appInstance.getPath('home') : (platform === "win32" ? appInstance.getPath('temp') : '/tmp/react-explorer');
    }

    return defaultFolder;
}

function getAppInstance() : App {
    
    let appInstance:App = app || remote && remote.app;
    
    if (!appInstance) {
        const getPath:(name:string) => string = require('./test/helpers').getPath;
        // simulate getPath for test environment
        appInstance = {
            getPath
        };
    }

    return appInstance;
}

const appInstance = getAppInstance();

const META_KEY = 91;
const CTRL_KEY = 17;

export const isPackage = process.mainModule && process.mainModule.filename.indexOf('app.asar') > -1;
export const isMac = platform === 'darwin';
export const isMojave = isMac && ((parseInt(release().split('.')[0], 10) - 4) >= 14);
export const isWin = platform === 'win32';
export const isLinux = platform === 'linux';
export const metaKeyCode = isMac && META_KEY || CTRL_KEY;
export const lineEnding = isWin ? '\r\n' : '\n';
export const defaultFolder = getDefaultFolder();
export const TMP_DIR = appInstance.getPath('temp');
export const HOME_DIR = appInstance.getPath('home');
export const DOWNLOADS_DIR = appInstance.getPath('downloads');
export const MUSIC_DIR = appInstance.getPath('music');
export const DOCS_DIR = appInstance.getPath('documents');
export const DESKTOP_DIR = appInstance.getPath('desktop');
export const PICTURES_DIR = appInstance.getPath('pictures');
export const VIDEOS_DIR = appInstance.getPath('videos');
export const ALL_DIRS = { HOME_DIR, DOWNLOADS_DIR, PICTURES_DIR, MUSIC_DIR, DOCS_DIR, DESKTOP_DIR, VIDEOS_DIR };
export const USERNAME = userInfo().username || 'username';
