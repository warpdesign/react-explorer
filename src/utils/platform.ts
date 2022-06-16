import { ipcRenderer } from 'electron';

const OS = ipcRenderer.sendSync('app:getOS');
console.log('OS', OS);

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
