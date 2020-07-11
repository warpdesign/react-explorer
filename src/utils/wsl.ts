import { isWin } from './platform';
import { exec } from 'child_process';

export const hasWSL = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!isWin) {
            resolve(false);
        } else {
            exec('wsl -l', (error, stdout, stderr) => {
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
        exec('wsl -l -q', (error, stdout, stderr) => {
            if (!error && !stderr && stdout) {
                const trimmed = stdout.replace(/\0/g, '');
                resolve(trimmed.split('\r\n').filter(str => str.length))
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
            '': '*'
        } as { [key: string]: string })[m];
    });
}

export const WSL_PREFIX = '\\\\wsl$\\';
