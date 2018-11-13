import * as cp from 'cpy';
import { FsLocal } from './FsLocal';
import { FsGeneric } from './FsGeneric';
import { FsFtp } from './FsFtp';

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

export interface Fs {
    // runtime api
    API: (new (path:string) => FsApi);
    // static members
    canread(str: string): boolean;
    serverpart(str: string): string;
    name: string;
    description: string;
}



export interface FsApi {
    // public API
    list(dir: string): Promise<File[]>;
    cd(path:string): Promise<string>;
    delete(parent: string, files: File[]): Promise<number>;
    copy(parent: string, files: string[], dest: string): Promise<number> & cp.ProgressEmitter;
    join(...paths: string[]): string;
    makedir(parent: string, name: string): Promise<string>;
    rename(parent: string, file: File, name: string): Promise<string>;
    exists(path: string): Promise<boolean>;
    resolve(path: string): string;
    size(source: string, files: string[]): Promise<number>;
    login(user: string, password: string, port: number): Promise<void>;
    isConnected(): boolean;
    isDirectoryNameValid(dirName: string): boolean;
    get(path: string, file: string): Promise<string>;
    // getStream(path: string): ReadableStream;
    // putStream(stream: ReadableStream, path: string): Promise<any>;
    isRoot(path: string): boolean;
    free(): void;
}

const interfaces: Array<Fs> = new Array();

export function registerFs(fs: Fs): void {
    console.log('Registring Fs', fs.name);
    interfaces.push(fs);
};

export function getFS(path: string):Fs {
    let newfs = interfaces.find((filesystem) => filesystem.canread(path));

    if (!newfs) {
        newfs = FsGeneric;
    }

    return newfs;
}

registerFs(FsLocal);
registerFs(FsFtp);
registerFs(FsGeneric);