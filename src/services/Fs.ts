import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as mkdir from 'mkdirp';
import * as del from 'del';
import * as cp from 'cpy';
import { size } from '../utils/size';

const Parent:File = {
    dir: '..',
    fullname: '..',
    name: '',
    extension: '',
    cDate: new Date(),
    mDate: new Date(),
    length: 0,
    mode: 0,
    isDir: true
};

export interface File {
    dir: string;
    name: string;
    fullname: string;
    extension: string;
    cDate: Date;
    mDate: Date;
    length: number;
    mode: number;
    isDir: boolean;
}

export interface Directory {
    path: string;
    files: File[];
    selected: File[];
    type: DirectoryType
}

export enum DirectoryType {
    LOCAL = 0,
    REMOTE
}

interface FsInterface {
    readDirectory: (dir: string) => Promise<File[]>;
    pathExists: (path: string) => Promise<boolean>;
    makedir: (parent: string, dirName: string) => Promise<string>;
    delete: (src: string, files: File[]) => Promise<boolean>;
    size: (source: string, files: string[]) => Promise<number>;
    copy: (source: string, files: string[], dest: string) => Promise<void> & cp.ProgressEmitter;   
    isDirectoryNameValid: (dirName: string) => boolean;
}

const isWin = process.platform === "win32";
const invalidChars = isWin && /[\*:<>\?|"]+/ig || /^[\.]+$/ig;

export const Fs: FsInterface = {
    isDirectoryNameValid: (dirName: string): boolean => {
        console.log('checking dir', dirName);
        return !invalidChars.test(dirName);
    },

    size: (source:string, files: string[]): Promise<number> => {
        return new Promise(async (resolve, reject) => {
            try {
                let bytes = 0;
                for(let file of files) {
                    bytes += await size(path.join(source, file));
                }
                resolve(bytes);
            } catch(err) {
                reject(err);
            }
        });
    },

    copy: (source: string, files: string[], dest: string): Promise<void> & cp.ProgressEmitter => {
        console.log(files, dest, source);
        return cp(files, dest, { parents: true, cwd: source });
    },

    makedir: (parent: string, dirName: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const unixPath = path.join(parent, dirName).replace(/\\/g, '/');
            try {
                console.log('mkdir', unixPath);
                mkdir(unixPath, (err) => {
                    if (err) {
                        reject(false);    
                    } else {
                        resolve(path.join(parent, dirName));
                    }
                });

            } catch(err) {
                console.error(err);
                reject(false);
            }
        });
    },

    delete: (src: string, files: File[]): Promise<boolean> => {
        let toDelete = files.map((file) => path.join(src, file.fullname));

        return new Promise(async (resolve, reject) => {
            try {
                console.log('delete', toDelete);
                await del(toDelete);
                resolve(true);
            } catch (err) {
                reject(false);
            }
        });
    },

    pathExists: (path: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            try {
                const stat = fs.statSync(path);
                resolve(stat.isDirectory());
            } catch (err) {
                reject(false);
            }
        });
    },

    readDirectory: (dir: string): Promise<File[]> => {
        console.log('calling readDirectory', dir);
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (err, items) => {
                if (err) {
                    debugger;
                    reject(`Could not read directory '${path}', reason: ${err}`);
                } else {
                    const dirPath = path.resolve(dir);
                    // console.log(items);

                    const files: File[] = [];

                    for (var i = 0; i < items.length; i++) {
                        const fullPath = path.join(dirPath, items[i]);
                        const format = path.parse(fullPath);
                        const stats = fs.statSync(path.join(dirPath, items[i]));
                        // console.log(items[i]);
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
                            isDir: stats.isDirectory()
                        };

                        files.push(file);
                    }

                    // add parent
                    const parent = { ...Parent, dir: dirPath };

                    resolve([parent].concat(files));
                }
            });
        });
    }
};
