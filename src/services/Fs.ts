import * as cp from 'cpy';
import { FsLocal } from './FsLocal';
import { FsGeneric } from './FsGeneric';

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
    readonly: boolean;
}

export interface Directory {
    path: string;
    files: File[];
    selected: File[];
    FS: FsInterface;
}

export enum DirectoryType {
    LOCAL = 0,
    REMOTE
}

export interface FsInterface {
    name: string;
    type: DirectoryType;
    description: string;
    readDirectory: (dir: string) => Promise<File[]>;
    pathExists: (path: string) => Promise<boolean>;
    makedir: (parent: string, dirName: string) => Promise<string>;
    delete: (src: string, files: File[]) => Promise<boolean>;
    rename: (src: File, newName: string) => Promise<string>;
    size: (source: string, files: string[]) => Promise<number>;
    copy: (source: string, files: string[], dest: string) => Promise<void> & cp.ProgressEmitter;
    isDirectoryNameValid: (dirName: string) => boolean;
    resolve: (dirName: string) => string;
    guess: (path: string) => boolean;
}

const interfaces: Array<FsInterface> = new Array();

function registerFs(fs: FsInterface): void {
    console.log('Registring Fs', fs.name);
    interfaces.push(fs);
};

export function getFs(path: string): FsInterface {
    const fs = interfaces.find((filesystem) => filesystem.guess(path));

    return fs;
}

registerFs(FsLocal);
registerFs(FsGeneric);