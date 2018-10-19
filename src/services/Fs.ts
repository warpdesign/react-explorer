import * as fs from 'fs';
import * as path from 'path';

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
    type: DirectoryType
}

export enum DirectoryType {
    LOCAL = 0,
    REMOTE
}

interface FsInterface {
    readDirectory: (dir: string) => Promise<File[]>;
    pathExists: (path: string) => Promise<boolean>;
}

export const Fs: FsInterface = {
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
