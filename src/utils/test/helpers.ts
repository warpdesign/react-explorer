import { platform } from 'process';
import { homedir, tmpdir } from 'os';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// expects describe to be globally defined: should only be used from test environment
declare var describe: any;

// assume Unix in that case: may need some tweaks for some exotic platform
const isUnix = platform !== 'win32';
const TEST_FILES_DIR = tmpdir() + '/react-explorer-tests';

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

function createEmptyFile(path: string, bytes = 0, mode = 0o777) {
    // console.log('creating file', path, bytes);
    writeFileSync(path, Buffer.alloc(bytes), {
        mode
    });
}

// create some test files/directories for testing local fs functions
// @todo handle windows style separators
export const prepareTmpTestFiles = () => {
    return new Promise((resolve, reject) => {
        // console.log('tmpdir', TEST_FILES_DIR);
        const tmpSizeDir = `${TEST_FILES_DIR}/sizeTest`;
        const tmpMakedirDir = `${TEST_FILES_DIR}/makedirTest`
        const tmpDeleteDir = `${TEST_FILES_DIR}/deleteTest`

        // delete tmpdir if it exits
        // console.log('deleting dir', TEST_FILES_DIR);
        // first make this folder readable so that it can be removed
        if (existsSync(`${tmpMakedirDir}/denied`)) {
            execSync(`chmod 777 ${tmpMakedirDir}/denied`);
        }

        if (existsSync(`${tmpDeleteDir}/folder_denied`)) {
            execSync(`chmod 777 ${tmpDeleteDir}/folder_denied`);
        }

        if (existsSync(`${tmpDeleteDir}/file_denied`)) {
            execSync(`chmod 777 ${tmpDeleteDir}/file_denied`);
        }

        if (existsSync(TEST_FILES_DIR)) {
            execSync(`rm -rf ${TEST_FILES_DIR}`);
        }

        // console.log('creating dir', TEST_FILES_DIR);
        // recreate directory
        mkdirSync(TEST_FILES_DIR);

        // size test
        mkdirSync(tmpSizeDir);
        createEmptyFile(`${tmpSizeDir}/14bytes`, 14);
        createEmptyFile(`${tmpSizeDir}/1024bytes`, 1024);

        // makedir test
        mkdirSync(tmpMakedirDir);
        mkdirSync(`${tmpMakedirDir}/denied`, 0o000);

        // delete test
        mkdirSync(tmpDeleteDir);
        mkdirSync(`${tmpDeleteDir}/folder_denied`, 0o000);

        mkdirSync(`${tmpDeleteDir}/single_folder`);
        mkdirSync(`${tmpDeleteDir}/multiple_folder`);

        createEmptyFile(`${tmpDeleteDir}/file`, 1024);
        createEmptyFile(`${tmpDeleteDir}/file_denied`, 1024, 0o000);

        resolve();
    });
}