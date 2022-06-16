import { platform } from 'process';
import { homedir, tmpdir } from 'os';
import { sep } from 'path';

// expects describe to be globally defined: should only be used from test environment
// declare var describe: any;
// declare var it: any;

// assume Unix in that case: may need some tweaks for some exotic platform
const isUnix = platform !== 'win32';
const TEST_FILES_DIR = tmpdir() + sep + 'react-explorer-tests';

// call this to perform Unix specific tests
export const describeUnix = (name: string, fn: jest.EmptyFunction): void => {
    if (isUnix) {
        describe(`${name} (Unix)`, fn);
    } else {
        describe.skip(name, fn);
    }
};

// call this to perform Windows specific tests
export const describeWin = (name: string, fn: jest.EmptyFunction) => {
    if (!isUnix) {
        describe(`${name} (Win)`, fn);
    } else {
        describe.skip(name, fn);
    }
};

// call this to perform Unix specific tests
export const itUnix = (name: string, fn?: jest.ProvidesCallback, timeout?: number) => {
    if (isUnix) {
        it(`${name} (Unix)`, fn, timeout);
    } else {
        it.skip(name, fn, timeout);
    }
};

export const getPath = (id: string): string => {
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
};
