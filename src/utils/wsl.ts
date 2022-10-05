import { isWin } from './platform';
import { throttle } from './throttle';
import { exec, spawn } from 'child_process';

const WSL_EXE = 'C:\\Windows\\System32\\wsl.exe';
const THROTTLE_DELAY = 800;

export interface WslDistribution {
    name: string;
    hasINotify: boolean;
}

export const watchWSLFolder = (path: string, distrib: string, callback: () => void) => {
    console.log('watchingWSLFolder', path, `(distrib=${distrib})`);
    const child = spawn(WSL_EXE, [
        '-d',
        distrib,
        '--',
        'inotifywait',
        '-e',
        'delete',
        '-e',
        'move',
        '-e',
        'create',
        '-m',
        path,
    ]);
    child.on('error', (e) => console.log('error', e));
    child.on('close', (e) => console.log('close', e));
    child.stdout.on('data', throttle(callback, THROTTLE_DELAY));

    return {
        close: () => child.kill(),
    };
};

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
