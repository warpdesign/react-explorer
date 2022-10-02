import { isWin } from './platform';
import { exec } from 'child_process';

const WSL_EXE = 'wsl.exe';

export interface WslDistribution {
    name: string;
    hasINotify: boolean;
}

const hasINotify = (name: string): Promise<boolean> =>
    new Promise((resolve) => {
        exec(`wsl.exe -d ${name} -- inotifywait`, ({ code }) => {
            resolve(code <= 1);
        });
    });

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

export const getWSLDistributions = (): Promise<WslDistribution[]> => {
    return new Promise((resolve) => {
        exec(`${WSL_EXE} -l -q`, async (error, stdout, stderr) => {
            if (!error && !stderr && stdout) {
                const trimmed = stdout.replace(/\0/g, '');
                const distribs = await Promise.all(
                    trimmed
                        .split('\r\n')
                        .filter((str) => str.length)
                        .map(async (name) => {
                            return {
                                name,
                                hasINotify: await hasINotify(name),
                            } as WslDistribution;
                        }),
                );

                resolve(distribs);
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
