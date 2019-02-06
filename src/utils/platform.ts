import { platform } from 'process';
import { release } from 'os';
import { remote } from 'electron';

declare var ENV: any;
export const isMac = platform === 'darwin';
export const isMojave = isMac && ((parseInt(release().split('.')[0], 10) - 4) >= 14);
export const isWin = platform === 'win32';
export const defaultFolder = ENV.NODE_ENV === 'production' ? remote.app.getPath('home') : (platform === "win32" ? remote.app.getPath('temp') : '/tmp/react-explorer');