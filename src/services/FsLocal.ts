import { FsApi, File, ICredentials, Fs } from './Fs';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as mkdir from 'mkdirp';
import * as del from 'del';
import { size } from '../utils/size';
import { throttle } from '../utils/throttle';
const { Transform } = require('stream');

const isWin = process.platform === "win32";
const invalidChars = isWin && /[\*:<>\?|"]+/ig || /^[\.]+[\/]+(.)*$/ig;
// since nodeJS will translate unix like paths to windows path, when running under Windows
// we accept Windows style paths (eg. C:\foo...) and unix paths (eg. /foo or ./foo)
const localStart = isWin && /^(([a-zA-Z]\:)|([\.]*\/|\.))/ || /^([\.]*\/|\.)/;

const Parent: File = {
    dir: '..',
    fullname: '..',
    name: '',
    extension: '',
    cDate: new Date(),
    mDate: new Date(),
    length: 0,
    mode: 0,
    isDir: true,
    readonly: true
};

class LocalApi implements FsApi {
    type = 0;
    // current path
    path: string;
    loginOptions:ICredentials = null;

    constructor(path:string) {
        this.path = this.resolve(path);
    }

    // local fs doesn't require login
    isConnected():boolean {
        return true;
    }

    isDirectoryNameValid(dirName: string): boolean {
        return !!!dirName.match(invalidChars);
    }

    join(...paths: string[]): string {
        return path.join(...paths);
    }

    resolve(newPath: string): string {
        return path.resolve(newPath);
    }

    cd(path: string) {
        const resolved = this.resolve(path);

        return this.isDir(resolved).then(() => resolved);
    }

    size(source: string, files: string[]): Promise<number> {
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

    makedir(source: string, dirName: string): Promise<string> {
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

    delete(source:string, files: File[]): Promise<number> {
        let toDelete = files.map((file) => path.join(source, file.fullname));

        return new Promise(async (resolve, reject) => {
            try {
                console.log('delete', toDelete);
                await del(toDelete, {force: true});
                resolve(files.length);
            } catch (err) {
                reject(err);
            }
        });
    }

    rename(source:string, file: File, newName: string): Promise <string> {
        const oldPath = path.join(source, file.fullname);
        const newPath = path.join(source, newName);

        if (!newName.match(invalidChars)) {
            console.log('valid !', oldPath, newPath);
            return new Promise((resolve, reject) => {
                fs.rename(oldPath, newPath, (err) => {
                    if (err) {
                        reject(file.fullname);
                    } else {
                        resolve(newName);
                    }
                });
            });
        }
        // reject promise with previous name in case of invalid chars
        return Promise.reject(file.fullname);
    }

    isDir(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                const stat = fs.statSync(path);
                resolve(stat.isDirectory());
            } catch (err) {
                reject(err);
            }
        });
    }

    exists(path: string): Promise<boolean> {
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

    async stat(fullPath: string): Promise<File> {
        return new Promise<File>((resolve, reject) => {
            try {
                const format = path.parse(fullPath);
                const stats = fs.statSync(fullPath);
                const file =
                {
                    dir: format.dir,
                    fullname: format.base,
                    name: format.name,
                    extension: format.ext,
                    cDate: stats.ctime,
                    mDate: stats.mtime,
                    length: stats.size,
                    mode: stats.mode,
                    isDir: stats.isDirectory(),
                    readonly: false
                };

                resolve(file);
            } catch (err) {
                reject(err);
            }
        });
    }

    login(server?: string, credentials?:ICredentials): Promise<void> {
        return Promise.resolve();
    }

    async list(dir: string, appendParent = true): Promise<File[]> {
        console.log('calling readDirectory', dir);
        const pathExists = await this.isDir(dir);

        if (pathExists) {
            return new Promise<File[]>((resolve, reject) => {
                fs.readdir(dir, (err, items) => {
                    if (err) {
                        reject(`Could not read directory '${dir}', reason: ${err}`);
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
                                    size: 0,
                                    isDirectory: () => false,
                                    mode: 777
                                }
                            }

                            const file =
                            {
                                dir: format.dir,
                                fullname: items[i],
                                name: format.name,
                                extension: format.ext,
                                cDate: stats.ctime,
                                mDate: stats.mtime,
                                length: stats.size,
                                mode: stats.mode,
                                isDir: stats.isDirectory(),
                                readonly: false
                            };

                            files.push(file);
                        }

                        // add parent
                        if (appendParent && !this.isRoot(dir)) {
                            const parent = { ...Parent, dir: dirPath };

                            resolve([parent].concat(files));
                        } else {
                            resolve(files);
                        }
                    }
                });
            });
        } else {
            return Promise.reject('Path does not exist');
        }
    }

    isRoot(path: string): boolean {
        return path === '/';
    }

    free() {

    }

    get(path: string, file: string): Promise<string> {
        return Promise.resolve(this.join(path, file));
    }

    // TODO add error handling
    async getStream(path: string, file: string): Promise<fs.ReadStream> {
        try {
            console.log('opening read stream', this.join(path, file));
            const stream = fs.createReadStream(this.join(path, file), { highWaterMark: 31 * 16384});
            return Promise.resolve(stream);
        } catch (err) {
            console.log('FsLocal.getStream error', err);
            return Promise.reject(err);
        };
    }

    // TODO: handle stream error
    async putStream(readStream: fs.ReadStream, dstPath: string, progress: (pourcent: number) => void): Promise<void>{
        let bytesRead = 0;
        const throttledProgress = throttle(() => { progress(bytesRead) }, 800);

        const reportProgress = new Transform({
            transform(chunk:any, encoding:any, callback:any) {
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

    sanityze(path: string) {
        return path;
    }
};

export const FsLocal:Fs = {
    icon: 'database',
    name: 'local',
    description: 'Local Filesystem',
    canread(str: string): boolean {
        console.log('FsLocal.canread', str, !!str.match(localStart));
        return !!str.match(localStart);
    },
    serverpart(str: string): string {
        // const server = str.replace(/^ftp\:\/\//, '');
        // return server.split('/')[0];
        return 'local';
    },
    credentials(str: string): ICredentials {
        return {
            user: '',
            password: '',
            port: 0
        };
    },
    API: LocalApi
}