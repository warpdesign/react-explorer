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
export const defaultFolder = ENV.NODE_ENV === 'production' ? appInstance.getPath('home') : (platform === "win32" ? appInstance.getPath('temp') : '/tmp/react-explorer');