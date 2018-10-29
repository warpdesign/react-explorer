import { FsInterface, File } from './Fs';
import * as cp from 'cpy';

const FtpUrl = /^(ftp|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;
const invalidChars = /^[\.]+$/ig;

export const FsGeneric: FsInterface = {
    name: 'ftp',
    description: 'Fs that just implements fs over ftp',
    type: 1,

    guess: (str: string): boolean => {
        return !!str.match(FtpUrl);
    },

    isDirectoryNameValid: (dirName: string): boolean => {
        console.log('FTP.isDirectoryNameValid');
        return !invalidChars.test(dirName);
    },

    resolve: (newPath: string): string => {
        console.warn('TODO: implement resolve');
        return newPath;
    },

    size: (source: string, files: string[]): Promise<number> => {
        console.log('GenericFs.size');
        return Promise.resolve(10);
    },

    copy: (source: string, files: string[], dest: string): Promise<void> & cp.ProgressEmitter => {
        console.log('Generic.copy');
        const prom: Promise<void> & cp.ProgressEmitter = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 2000);
        }) as Promise<void> & cp.ProgressEmitter;

        prom.on = (name, handler): Promise<void> => {
            return this;
        }

        return prom;
    },

    makedir: (parent: string, dirName: string): Promise<string> => {
        console.log('FsGeneric.makedir');
        return Promise.resolve('');
    },

    delete: (src: string, files: File[]): Promise<boolean> => {
        console.log('FsGeneric.delete');
        return Promise.resolve(true);
    },

    pathExists: (path: string): Promise<boolean> => {
        console.log('FsGeneric.pathExists');
        return Promise.resolve(true);
    },

    readDirectory: (dir: string): Promise<File[]> => {
        console.log('FsGeneric.readDirectory');
        return Promise.resolve([

        ]);
    }
};