import { File, Credentials, Fs } from '../Fs';
import { LocalApi } from './FsLocal';
import * as fs from 'fs';
import * as path from 'path';
import { isWin } from '../../utils/platform';
const invalidDirChars = /^[\.]+[\/]+(.)*$/gi;
const invalidFileChars = /\//;
const SEP = path.sep;
import { WslWatch } from './WslWatch';

// Since nodeJS will translate unix like paths to windows path, when running under Windows
// we accept Windows style paths (eg. C:\foo...) and unix paths (eg. /foo or ./foo)
const wslStart = /^(\\\\wsl\$)/;

export class WslApi extends LocalApi {
    isRoot(path: string): boolean {
        // We need to make a special case for wsl since \\wsl$ is not a drive, there's no root.
        // Instead we consider the distrib's root dir (eg. \\wsl$\\Debian) as root.
        const parts = path.substr(6).split('\\').filter(Boolean);
        console.log('wsl isroot', parts.length < 2);
        return parts.length < 2;
    }

    isDirectoryNameValid(dirName: string): boolean {
        return !!!dirName.match(invalidDirChars) && dirName !== '/';
    }

    rename(source: string, file: File, newName: string, transferId = -1): Promise<string> {
        const oldPath = path.join(source, file.fullname);
        const newPath = path.join(source, newName);

        if (!newName.match(invalidFileChars)) {
            return new Promise((resolve, reject) => {
                // since node's fs.rename will overwrite the destination
                // path if it exists, first check that file doesn't exist
                this.exists(newPath)
                    .then((exists) => {
                        if (exists) {
                            reject({
                                code: 'EEXIST',
                                oldName: file.fullname,
                            });
                        } else {
                            fs.rename(oldPath, newPath, (err) => {
                                if (err) {
                                    reject({
                                        code: err.code,
                                        message: err.message,
                                        newName: newName,
                                        oldName: file.fullname,
                                    });
                                } else {
                                    resolve(newName);
                                }
                            });
                        }
                    })
                    .catch((err) => {
                        reject({
                            code: err.code,
                            message: err.message,
                            newName: newName,
                            oldName: file.fullname,
                        });
                    });
            });
        } else {
            // reject promise with previous name in case of invalid chars
            return Promise.reject({
                oldName: file.fullname,
                newName: newName,
                code: 'BAD_FILENAME',
            });
        }
    }
    onList(dir: string): void {
        if (dir !== this.path) {
            try {
                WslWatch.stopWatchingPath(this.path, this.onFsChange);
                WslWatch.watchPath(dir, this.onFsChange);
            } catch (e) {
                console.warn('Could not watch path', dir, e);
            }
            this.path = dir;
        }
    }
}

export const FsWsl: Fs = {
    icon: 'database',
    name: 'local-wsl',
    description: 'Local WSL Filesystem',
    options: {
        needsRefresh: false,
    },
    canread(str: string): boolean {
        return isWin && !!str.match(wslStart);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    serverpart(str: string): string {
        return 'local';
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    credentials(str: string): Credentials {
        return {
            user: '',
            password: '',
            port: 0,
        };
    },
    displaypath(str: string) {
        const split = str.split(SEP);
        return {
            fullPath: str,
            shortPath: split.slice(-1)[0] || str,
        };
    },
    API: WslApi,
};
