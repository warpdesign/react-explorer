import { isWin } from './platform';
import { homedir, tmpdir } from 'os';
import { mkdirSync } from 'fs';
import { execSync } from 'child_process';

// expects describe to be globally defined: should only be used from test environment
declare var describe: any;

// assume Unix in that case: may need some tweaks for some exotic platform
const isUnix = !isWin;
const TEST_FILES_DIR = tmpdir() + '/react-explorer-tests';

// call this to perform unix specified tests
export const describeUnix = (...args: any) => isUnix && describe(...args) || describe.skip(...args);
// call this to perform windows specified tests
export const describeWin = (...args: any) => isWin && describe(...args) || describe.skip(...args);

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

function createEmptyFile(path: string, bytes = 0) {
    console.log('creating file', path, bytes);
    execSync(`dd if=/dev/zero of=${path} bs=${bytes} count=1`);
}

// create some test files/directories for testing local fs functions
// @todo handle windows style separators
export const prepareTmpTestFiles = async () => {
    console.log('tmpdir', TEST_FILES_DIR);
    const tmpSizeDir = `${TEST_FILES_DIR}/sizeTest`;
    const tmpMakedirDir = `${TEST_FILES_DIR}/makedirTest`

    // delete tmpdir if it exits
    console.log('deleting dir', TEST_FILES_DIR);
    // first make this folder readable so that it can be removed
    execSync(`chmod 777 ${tmpMakedirDir}/denied`);
    execSync(`rm -rf ${TEST_FILES_DIR}`);

    console.log('creating dir', TEST_FILES_DIR);
    // recreate directory
    mkdirSync(TEST_FILES_DIR);

    // size test
    mkdirSync(tmpSizeDir);
    createEmptyFile(`${tmpSizeDir}/14bytes`, 14);
    createEmptyFile(`${tmpSizeDir}/1024bytes`, 1024);

    // makedir test
    mkdirSync(tmpMakedirDir);
    mkdirSync(`${tmpMakedirDir}/denied`, 0o000);
}