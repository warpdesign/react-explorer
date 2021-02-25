import { isWin } from './platform';
import { exec } from 'child_process';

const WSL_EXE = 'wsl.exe';

export const hasWSL = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!isWin) {
            resolve(false);
        } else {
            exec(`${WSL_EXE} -l`, (error, stdout, stderr) => {
                if (!error && !stderr) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        }
    });
};

export const getWSLDistributions = (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        exec(`${WSL_EXE} -l -q`, (error, stdout, stderr) => {
            if (!error && !stderr && stdout) {
                const trimmed = stdout.replace(/\0/g, '');
                resolve(trimmed.split('\r\n').filter((str) => str.length));
            } else {
                resolve([]);
            }
        });
    });
};

export const decodeWSLFilename = (str: string) => {
    return str.replace(/[]/g, function (m: string): string {
        return ({
            '': '<',
            '': '>',
            '': ':',
            '': '"',
            '': '\\',
            '': '|',
            '': '?',
            '': '*',
        } as { [key: string]: string })[m];
    });
};

export const WSL_PREFIX = '\\\\wsl$\\';
