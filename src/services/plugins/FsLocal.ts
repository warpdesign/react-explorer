import { FsApi, File, ICredentials, Fs, filetype, MakeId } from '../Fs';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdir from 'mkdirp';
import * as del from 'del';
import { size } from '../../utils/size';
import { throttle } from '../../utils/throttle';
const { Transform } = require('stream');
import { isWin, HOME_DIR } from '../../utils/platform';
import { LocalWatch } from './LocalWatch';

const invalidDirChars = isWin && /[\*:<>\?|"]+/ig || /^[\.]+[\/]+(.)*$/ig;
const invalidFileChars = isWin && /[\*:<>\?|"]+/ig || /\//;
const SEP = path.sep;

// Since nodeJS will translate unix like paths to windows path, when running under Windows
// we accept Windows style paths (eg. C:\foo...) and unix paths (eg. /foo or ./foo)
const localStart = isWin && /^(([a-zA-Z]\:)|([\.]*\/|\.)|(\\\\)|~)/ || /^([\.]*\/|\.|~)/;
const isRoot = isWin && /((([a-zA-Z]\:)(\\)*)|(\\\\))$/ || /^\/$/;

class LocalApi implements FsApi {
    type = 0;
    // current path
    path: string;
    loginOptions: ICredentials = null;
    onFsChange: (filename: string) => void;

    constructor(path: string, onFsChange: (filename: string) => void) {
        this.path = '';
        this.onFsChange = onFsChange;
    }

    // local fs doesn't require login
    isConnected(): boolean {
        return true;
    }

    isDirectoryNameValid(dirName: string): boolean {
        return !!!dirName.match(invalidDirChars) && dirName !== '/';
    }

    join(...paths: string[]): string {
        return path.join(...paths);
    }

    resolve(newPath: string): string {
        // gh#44: replace ~ with userpath
        const dir = newPath.replace(/^~/, HOME_DIR);
        return path.resolve(dir);
    }

    cd(path: string, transferId = -1) {
        const resolvedPath = this.resolve(path);
        return this.isDir(resolvedPath).then((isDir: boolean) => {
            if (isDir) {
                return resolvedPath;
            } else {
                throw { code: 'NOT_A_DIR' };
            }
        })
            .catch((err) => {
                return Promise.reject(err);
            });
    }

    size(source: string, files: string[], transferId = -1): Promise<number> {
        return new Promise(async (resolve, reject) => {
            try {
                let bytes = 0;
                for (let file of files) {
                    bytes += await size(path.join(source, file));
                }
                resolve(bytes);
            } catch (err) {
                reject(err);
            }
        });
    }

    // copy(source: string, files: string[], dest: string): Promise<any> & cp.ProgressEmitter {
    //     console.log('***', files, dest, source);
    //     return cp(files, dest, { parents: true, cwd: source });
    // }

    makedir(source: string, dirName: string, transferId = -1): Promise<string> {
        return new Promise((resolve, reject) => {
            const unixPath = path.join(source, dirName).replace(/\\/g, '/');
            try {
                console.log('mkdir', unixPath);
                mkdir(unixPath, (err) => {
                    if (err) {
                        reject(false);
                    } else {
                        resolve(path.join(source, dirName));
                    }
                });

            } catch (err) {
                console.error(err);
                reject(false);
            }
        });
    }

    delete(source: string, files: File[], transferId = -1): Promise<number> {
        let toDelete = files.map((file) => path.join(source, file.fullname));

        return new Promise(async (resolve, reject) => {
            try {
                console.log('delete', toDelete);
                await del(toDelete, { force: true });
                resolve(files.length);
            } catch (err) {
                reject(err);
            }
        });
    }

    rename(source: string, file: File, newName: string, transferId = -1): Promise<string> {
        const oldPath = path.join(source, file.fullname);
        const newPath = path.join(source, newName);

        if (!newName.match(invalidFileChars)) {
            console.log('valid !', oldPath, newPath);
            return new Promise((resolve, reject) => {
                fs.rename(oldPath, newPath, (err) => {
                    if (err) {
                        reject({
                            code: err.code,
                            message: err.message,
                            newName: newName,
                            oldName: file.fullname
                        });
                    } else {
                        resolve(newName);
                    }
                });
            });
        } else {
            // reject promise with previous name in case of invalid chars
            return Promise.reject({
                oldName: file.fullname,
                newName: newName,
                code: 'BAD_FILENAME'
            });
        }
    }

    isDir(path: string, transferId = -1): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                const lstat = fs.lstatSync(path);
                const stat = fs.statSync(path);
                resolve(stat.isDirectory() || lstat.isDirectory());
            } catch (err) {
                reject(err);
            }
        });
    }

    exists(path: string, transferId = -1): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                fs.statSync(path);
                resolve(true);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    resolve(false);
                } else {
                    reject(err);
                }
            }
        });
    }

    async stat(fullPath: string, transferId = -1): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            try {
                const format = path.parse(fullPath);
                const stats = fs.statSync(fullPath);
                const file: File =
                {
                    dir: format.dir,
                    fullname: format.base,
                    name: format.name,
                    extension: format.ext.toLowerCase(),
                    cDate: stats.ctime,
                    mDate: stats.mtime,
                    bDate: stats.birthtime,
                    length: stats.size,
                    mode: stats.mode,
                    isDir: stats.isDirectory(),
                    readonly: false,
                    type: !stats.isDirectory() && filetype(stats.mode, format.ext.toLowerCase()) || '',
                    isSym: stats.isSymbolicLink(),
                    id: MakeId(stats)
                };

                resolve(file);
            } catch (err) {
                reject(err);
            }
        });
    }

    login(server?: string, credentials?: ICredentials): Promise<void> {
        return Promise.resolve();
    }

    onList(dir: string) {
        console.log('onList', dir, this.path);
        if (dir !== this.path) {
            console.log('stopWatching', this.path);
            LocalWatch.stopWatchingPath(this.path, this.onFsChange);
            console.log('watchPath', dir);
            LocalWatch.watchPath(dir, this.onFsChange);
            this.path = dir;
        }
    }

    async list(dir: string, appendParent = true, transferId = -1): Promise<File[]> {
        console.log('calling readDirectory', dir);
        const pathExists = await this.isDir(dir);

        if (pathExists) {
            return new Promise<File[]>((resolve, reject) => {
                fs.readdir(dir, (err, items) => {
                    if (err) {
                        reject(err);
                    } else {
                        const dirPath = path.resolve(dir);

                        const files: File[] = [];

                        for (var i = 0; i < items.length; i++) {
                            const fullPath = path.join(dirPath, items[i]);
                            const format = path.parse(fullPath);
                            let stats;

                            try {
                                stats = fs.statSync(path.join(dirPath, items[i]));
                            } catch (err) {
                                console.warn('error getting stats for', path.join(dirPath, items[i]), err);
                                stats = {
                                    ctime: new Date(),
                                    mtime: new Date(),
                                    birthtime: new Date(),
                                    size: 0,
                                    isDirectory: () => true,
                                    mode: -1,
                                    isSymbolicLink: () => false,
                                    ino: 0,
                                    dev: 0
                                }
                            }

                            const file: File =
                            {
                                dir: format.dir,
                                fullname: items[i],
                                name: format.name,
                                extension: format.ext.toLowerCase(),
                                cDate: stats.ctime,
                                mDate: stats.mtime,
                                bDate: stats.birthtime,
                                length: stats.size,
                                mode: stats.mode,
                                isDir: stats.isDirectory(),
                                readonly: false,
                                type: !stats.isDirectory() && filetype(stats.mode, format.ext.toLowerCase()) || '',
                                isSym: stats.isSymbolicLink(),
                                id: MakeId(stats)
                            };

                            files.push(file);
                        }

                        this.onList(dirPath);

                        resolve(files);
                        // add parent
                        // if (appendParent && !this.isRoot(dir)) {
                        //     debugger;
                        //     const parent = { ...Parent, dir: dirPath };

                        //     resolve([parent].concat(files));
                        // } else {
                        //     resolve(files);
                        // }
                    }
                });
            });
        } else {
            return Promise.reject('Path does not exist');
        }
    }

    isRoot(path: string): boolean {
        return !!path.match(isRoot);
    }

    off() {
        console.log('off', this.path);
        console.log('stopWatchingPath', this.path);
        LocalWatch.stopWatchingPath(this.path, this.onFsChange);
    }

    // TODO add error handling
    async getStream(path: string, file: string, transferId = -1): Promise<fs.ReadStream> {
        try {
            console.log('opening read stream', this.join(path, file));
            const stream = fs.createReadStream(this.join(path, file), { highWaterMark: 31 * 16384 });
            return Promise.resolve(stream);
        } catch (err) {
            console.log('FsLocal.getStream error', err);
            return Promise.reject(err);
        };
    }

    // TODO: handle stream error
    async putStream(readStream: fs.ReadStream, dstPath: string, progress: (pourcent: number) => void, transferId = -1): Promise<void> {
        let bytesRead = 0;
        const throttledProgress = throttle(() => { progress(bytesRead) }, 800);

        const reportProgress = new Transform({
            transform(chunk: any, encoding: any, callback: any) {
                bytesRead += chunk.length;
                // console.log('dataChunk', bytesRead / 1024, 'Ko');
                throttledProgress();
                callback(null, chunk);
            },
            highWaterMark: 16384 * 31
        });

        console.log('opening write stream', dstPath);
        const writeStream = fs.createWriteStream(dstPath);

        readStream.pipe(reportProgress)
            .pipe(writeStream);

        return new Promise((resolve: (val?: any) => void, reject: (val?: any) => void) => {
            // readStream.once('close', () => resolve());
            writeStream.once('finish', () => {
                resolve();
            });
        });
    }

    getParentTree(dir: string): Array<{ dir: string, fullname: string, name: string }> {
        const parts = dir.split(SEP);
        const max = parts.length - 1;
        let fullname = '';

        if (dir.length === 1) {
            return [{
                dir,
                fullname: '',
                name: dir
            }]
        } else {
            const folders = [];

            for (let i = 0; i <= max; ++i) {
                folders.push({
                    dir,
                    fullname,
                    name: parts[max - i] || SEP
                });

                if (!i) {
                    fullname += '..';
                } else {
                    fullname += '/..'
                }
            }

            return folders;
        }
    }

    sanityze(path: string) {
        return isWin ? (path.match(/\\$/) ? path : path + '\\') : path;
    }

    on(event: string, cb: (data: any) => void): void {

    }
};

export function FolderExists(path: string) {
    try {
        return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
    } catch (err) {
        return false;
    }
}

export const FsLocal: Fs = {
    icon: 'database',
    name: 'local',
    description: 'Local Filesystem',
    canread(str: string): boolean {
        console.log('FsLocal.canread', str, !!str.match(localStart));
        return !!str.match(localStart);
    },
    serverpart(str: string): string {
        return 'local';
    },
    credentials(str: string): ICredentials {
        return {
            user: '',
            password: '',
            port: 0
        };
    },
    displaypath(str: string) {
        const split = str.split(SEP);
        return {
            fullPath: str,
            shortPath: split.slice(-1)[0] || str
        };
    },
    API: LocalApi
}
