import { platform } from 'process';
import { release } from 'os';
import { remote, app } from 'electron';

declare var ENV: any;

const META_KEY = 91;
const CTRL_KEY = 17;
const appInstance = app || remote.app;

export const isPackage = process.mainModule.filename.indexOf('app.asar') > -1;
export const isMac = platform === 'darwin';
export const isMojave = isMac && ((parseInt(release().split('.')[0], 10) - 4) >= 14);
export const isWin = platform === 'win32';
export const isLinux = platform === 'linux';
export const metaKeyCode = isMac && META_KEY || CTRL_KEY;
export const lineEnding = isWin ? '\r\n' : '\n';
// Folders
export const defaultFolder = ENV.NODE_ENV === 'production' ? appInstance.getPath('home') : (platform === "win32" ? appInstance.getPath('temp') : '/tmp/react-explorer');
export const TMP_DIR = appInstance.getPath('temp');
export const HOME_DIR = appInstance.getPath('home');
export const DOWNLOADS_DIR = appInstance.getPath('downloads');
export const MUSIC_DIR = appInstance.getPath('music');
export const DOCS_DIR = appInstance.getPath('documents');
export const DESKTOP_DIR = appInstance.getPath('desktop');
export const PICTURES_DIR = appInstance.getPath('pictures');
export const VIDEOS_DIR = appInstance.getPath('videos');