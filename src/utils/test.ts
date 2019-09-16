import { isWin } from './platform';
import { homedir, tmpdir } from 'os';

// expects describe to be globally defined: should only be used from test environment
declare var describe: any;

// assume Unix in that case: may need some tweaks for some exotic platform
const isUnix = !isWin;

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

        default:
            return tmpdir();
    }
}