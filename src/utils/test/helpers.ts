import { platform } from 'process';
import { homedir, tmpdir } from 'os';
import { sep } from 'path';

// expects describe to be globally defined: should only be used from test environment
declare var describe: any;
declare var it: any;

// assume Unix in that case: may need some tweaks for some exotic platform
const isUnix = platform !== 'win32';
const TEST_FILES_DIR = tmpdir() + sep + 'react-explorer-tests';

// call this to perform unix specific tests
export const describeUnix = (...args: any) => {
    args[0] += ' (Unix)';
    if (isUnix) {
        describe(...args);
    } else {
        describe.skip(...args);
    }
};

// call this to perform windows specific tests
export const describeWin = (...args: any) => {
    args[0] += ' (Win)';
    if (!isUnix) {
        describe(...args);
    } else {
        describe.skip(...args);
    }
};

// call this to perform unix specific tests
export const itUnix = (...args: any) => {
    args[0] += ' (Unix)';
    if (isUnix) {
        it(...args);
    } else {
        it.skip(...args);
    }
};

export const getPath = (id: string) => {
    switch (id) {
        case 'home':
            return homedir();

        case 'temp':
            return tmpdir();

        case 'tests_dir':
            return TEST_FILES_DIR;

        default:
            return tmpdir();
    }
}
