import { ipcRenderer } from 'electron';
import { platform } from 'process';

const OS = ipcRenderer.sendSync('app:getOS') || {
    isMac: platform === 'darwin',
    isMojave: false,
    isWin: platform === 'win32',
    isLinux: platform === 'linux',
    metaKeyCode: platform === 'darwin' ? 91 : 17,
    lineEnding: platform === 'win32' ? '\r\n' : '\n',
    defaultFolder: '/',
    TMP_DIR: '/tmp',
    HOME_DIR: '/cy/home',
    DOWNLOADS_DIR: '/cy/downloads',
    MUSIC_DIR: '/cy/music',
    DOCS_DIR: '/cy/documents',
    DESKTOP_DIR: '/cy/desktop',
    PICTURES_DIR: '/cy/pictures',
    VIDEOS_DIR: '/cy/videos',
    ALL_DIRS: {
        HOME_DIR: '/cy/home',
        DOWNLOADS_DIR: '/cy/downloads',
        PICTURES_DIR: '/cy/pictures',
        MUSIC_DIR: '/cy/music',
        DOCS_DIR: '/cy/documents',
        DESKTOP_DIR: '/cy/desktop',
        VIDEOS_DIR: '/cy/videos',
    },
    USERNAME: 'cypress',
    VERSIONS: {
        platform,
        release: 'xx',
        arch: 'arch',
        electron: 'electron',
        chrome: 'chrome version',
        node: 'node version',
    },
};

export const isMac = OS.isMac;
export const isMojave = OS.isMojave;
export const isWin = OS.isWin;
export const isLinux = OS.isLinux;
export const metaKeyCode = OS.metaKeyCode;
export const lineEnding = OS.lineEnding;
export const defaultFolder = OS.defaultFolder;
export const TMP_DIR = OS.TMP_DIR;
export const HOME_DIR = OS.HOME_DIR;
export const DOWNLOADS_DIR = OS.DOWNLOADS_DIR;
export const MUSIC_DIR = OS.MUSIC_DIR;
export const DOCS_DIR = OS.DOCS_DIR;
export const DESKTOP_DIR = OS.DESKTOP_DIR;
export const PICTURES_DIR = OS.PICTURES_DIR;
export const VIDEOS_DIR = OS.VIDEOS_DIR;
export const ALL_DIRS: { [key: string]: string } = OS.ALL_DIRS;
export const USERNAME = OS.USERNAME;
export const VERSIONS = OS.VERSIONS;
