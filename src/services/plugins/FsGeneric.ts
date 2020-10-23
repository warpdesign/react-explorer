/* eslint-disable @typescript-eslint/no-unused-vars */
import { FsApi, File, Credentials, Fs } from '../Fs';
import * as fs from 'fs';

class GenericApi implements FsApi {
    type = 0;
    loginOptions: Credentials = null;

    isDirectoryNameValid(dirName: string): boolean {
        console.log('GenericFs.isDirectoryNameValid');
        return true;
    }

    resolve(newPath: string): string {
        return newPath;
    }

    join(...paths: string[]): string {
        return paths.join('/');
    }

    isConnected(): boolean {
        return true;
    }

    cd(path: string, transferId = -1): Promise<string> {
        return Promise.resolve(path);
    }

    size(source: string, files: string[], transferId = -1): Promise<number> {
        console.log('GenericFs.size');
        return Promise.resolve(10);
    }

    login(server?: string, credentials?: Credentials): Promise<void> {
        return Promise.resolve();
    }

    makedir(parent: string, dirName: string, transferId = -1): Promise<string> {
        console.log('FsGeneric.makedir');
        return Promise.resolve('');
    }

    delete(src: string, files: File[], transferId = -1): Promise<number> {
        console.log('FsGeneric.delete');
        return Promise.resolve(files.length);
    }

    rename(source: string, file: File, newName: string, transferId = -1): Promise<string> {
        console.log('FsGeneric.rename');
        return Promise.resolve(newName);
    }

    isDir(path: string, transferId = -1): Promise<boolean> {
        console.log('FsGeneric.isDir');
        return Promise.resolve(true);
    }

    exists(path: string, transferId = -1): Promise<boolean> {
        console.log('FsGeneric.exists');
        return Promise.resolve(true);
    }

    async makeSymlink(targetPath: string, path: string, transferId?: number): Promise<boolean> {
        console.log('FsGeneric.makeSymlink');
        return true;
    }

    stat(fullPath: string, transferId = -1): Promise<File> {
        return Promise.resolve({
            dir: '',
            fullname: '',
            name: '',
            extension: '',
            cDate: new Date(),
            mDate: new Date(),
            length: 0,
            mode: 777,
            isDir: false,
            readonly: false,
            type: '',
        } as File);
    }

    async list(dir: string, watchDir = false, transferId = -1): Promise<File[]> {
        console.log('FsGeneric.readDirectory');
        const pathExists = await this.isDir(dir);

        if (pathExists) {
            return Promise.resolve([]);
        } else {
            Promise.reject('error');
        }
    }

    off(): void {
        console.log('FsGeneric.off');
    }

    isRoot(path: string): boolean {
        return path === '/';
    }

    getStream(path: string, file: string, transferId = -1): Promise<fs.ReadStream> {
        try {
            const stream = fs.createReadStream(this.join(path, file));
            return Promise.resolve(stream);
        } catch (err) {
            console.log('FsLocal.getStream error', err);
            return Promise.reject(err);
        }
    }

    async putStream(
        readStream: fs.ReadStream,
        dstPath: string,
        progress: (bytesRead: number) => void,
        transferId = -1,
    ): Promise<void> {
        return Promise.resolve();
    }

    getParentTree(dir: string): Array<{ dir: string; fullname: string }> {
        const numParts = dir.replace(/^\//, '').split('/').length;
        const folders = [];
        for (let i = 0; i < numParts; ++i) {}
        return [];
    }

    sanityze(path: string): string {
        return path;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: (data: any) => void): void {
        //
    }
}

export const FsGeneric: Fs = {
    icon: 'database',
    name: 'generic',
    description: 'Fs that just implements the FsInterface but does nothing',
    options: {
        needsRefresh: false,
    },
    canread(str: string): boolean {
        return true;
    },
    serverpart(str: string): string {
        const server = str.replace(/^ftp\:\/\//, '');
        return server.split('/')[0];
    },
    credentials(str: string): Credentials {
        return {
            user: '',
            password: '',
            port: 0,
        };
    },
    displaypath(str: string) {
        return {
            // full path, display in the tab's tooltip
            fullPath: str,
            // short path, as displayed in the tab
            shortPath: str,
        };
    },
    API: GenericApi,
};
