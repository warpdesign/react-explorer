import { FsApi, File } from './Fs';
import * as cp from 'cpy';

class GenericApi implements FsApi {
    type = 0;

    isDirectoryNameValid(dirName: string): boolean {
        console.log('GenericFs.isDirectoryNameValid');
        return true;
    }

    resolve(newPath: string): string {
        return newPath;
    }

    join(...paths:string[]): string {
        return this.join(...paths);
    }

    isConnected(): boolean {
        return true;
    }

    cd(path: string) {
        return Promise.resolve(path);
    }

    size(source: string, files: string[]): Promise<number> {
        console.log('GenericFs.size');
        return Promise.resolve(10);
    }

    copy(source: string, files: string[], dest: string): Promise<any> & cp.ProgressEmitter {
        console.log('Generic.copy');
        const prom: Promise<void> & cp.ProgressEmitter = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 2000);
        }) as Promise<void> & cp.ProgressEmitter;

        prom.on = (name, handler): Promise<void> => {
            return prom;
        }

        return prom;
    }

    login(user: string, password: string):Promise<void> {
        return Promise.resolve();
    }

    makedir(parent: string, dirName: string): Promise<string> {
        console.log('FsGeneric.makedir');
        return Promise.resolve('');
    }

    delete(src: string, files: File[]): Promise<number> {
        console.log('FsGeneric.delete');
        return Promise.resolve(files.length);
    }

    rename(source: string, file: File, newName: string): Promise<string> {
        console.log('FsGeneric.rename');
        return Promise.resolve(newName);
    }

    exists(path: string): Promise<boolean> {
        console.log('FsGeneric.pathExists');
        return Promise.resolve(true);
    }

    async list(dir: string): Promise<File[]> {
        console.log('FsGeneric.readDirectory');
        const pathExists = await this.exists(dir);

        if (pathExists) {
            return Promise.resolve([ ]);
        } else {
            Promise.reject('error');
        }
    }

    free() {

    }

    isRoot(path: string): boolean {
        return path === '/';
    }

    get(path: string): Promise<string> {
        return Promise.resolve(path);
    }
};

export const FsGeneric = {
    name: 'generic',
    description: 'Fs that just implements the FsInterface but does nothing',
    canread(str: string): boolean {
        return true;
    },
    serverpart(str: string): string {
        const server = str.replace(/^ftp\:\/\//, '');
        return server.split('/')[0];
    },
    API: GenericApi
}