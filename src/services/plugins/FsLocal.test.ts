import { FsLocal } from './FsLocal';

import { describeUnix, getPath } from '../../utils/test';

let localAPI: any;

const HOMEDIR = getPath('home');

describeUnix('isDirectoryNameValid: unix', function () {
    beforeAll(() => {
        localAPI = new FsLocal.API('/', () => { });
    });

    it('unix: dir name cannot start with  ../', function () {
        const isValid = localAPI.isDirectoryNameValid('../');

        expect(isValid).toBe(false);
    });

    it('unix: dir name cannot start with  ./', function () {
        const isValid = localAPI.isDirectoryNameValid('./');

        expect(isValid).toBe(false);
    });

    it('unix: dir name cannot start with  ../.', function () {
        const isValid = localAPI.isDirectoryNameValid('../.');

        expect(isValid).toBe(false);
    });
});

// @todo add Windows specific tests for isDirectoryNameValid

describe('resolve', function () {
    beforeAll(() => {
        localAPI = new FsLocal.API('/', () => { });
    });

    it('~ resolves to homedir', function () {
        const dir = localAPI.resolve('~');

        expect(dir).toBe(HOMEDIR);
    });
});

describe('cd', function () {
    beforeAll(() => {
        localAPI = new FsLocal.API('/', () => { });
    });

    it('should throw if is not a directory', async function () {
        expect.assertions(1);

        try {
            await localAPI.cd(__filename);
        } catch (err) {
            expect(err.code).toBe('ENOTDIR');
        }
    });

    it('should throw if is does not exist', async function () {
        expect.assertions(1);

        try {
            await localAPI.cd(__filename + '__');
        } catch (err) {
            expect(err.code).toBe('ENOENT');
        }
    });

    it('should return resolved path if exists and is a dir', function () {
        expect.assertions(1);

        const dir = localAPI.resolve(__dirname);

        expect(dir).toBe(__dirname);
    });

    it('should return resolved homedir path for ~', function () {
        expect.assertions(1);

        const dir = localAPI.resolve('~');

        expect(dir).toBe(HOMEDIR);
    });
});

describe('size', function () {
    beforeAll(() => {
        localAPI = new FsLocal.API('/', () => { });
    });
});