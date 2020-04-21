import { FsLocal } from "../FsLocal";
import * as fs from 'fs';

import {
    describeUnix,
    describeWin,
    getPath,
} from "../../../utils/test/helpers";

import mock from 'mock-fs';
import TmpDir from './fixtures/tmpDir'

let localAPI: any;

const HOMEDIR = getPath("home");
const TESTS_DIR = getPath("tests_dir");

// needed to avoid crashes when console.log
// is called and mock() has been called
// see #
console.log('');

describe('FsLocal', () => {
    describeUnix("isDirectoryNameValid", function() {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
        });
    
        it("unix: dir name cannot start with  ../", function() {
            const isValid = localAPI.isDirectoryNameValid("../");
    
            expect(isValid).toBe(false);
        });
    
        it("unix: dir name cannot start with  ./", function() {
            const isValid = localAPI.isDirectoryNameValid("./");
    
            expect(isValid).toBe(false);
        });
    
        it("unix: dir name cannot start with  ../.", function() {
            const isValid = localAPI.isDirectoryNameValid("../.");
    
            expect(isValid).toBe(false);
        });
    });
    
    // @todo add Windows specific tests for isDirectoryNameValid
    describe("resolve", function() {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
        });
    
        it("~ resolves to homedir", function() {
            const dir = localAPI.resolve("~");
    
            expect(dir).toBe(HOMEDIR);
        });
    });
    
    describe("cd", function() {
        const filePath = `${TESTS_DIR}/file`

        beforeAll(() => {
            mock(TmpDir);
            localAPI = new FsLocal.API("/", () => {});
        });

        afterAll(() => mock.restore());
    
        it("should throw ENOTDIR if is not a directory", async function() {
            expect.assertions(1);
    
            try {
                await localAPI.cd(filePath);
            } catch (err) {
                expect(err.code).toBe("ENOTDIR");
            }
        });
    
        it("should throw if does not exist", async function() {
            expect.assertions(1);
    
            try {
                await localAPI.cd(`${filePath}__`);
            } catch (err) {
                expect(err.code).toBe("ENOENT");
            }
        });
    
        it("should return resolved path if exists and is a dir", function() {
            const dir = localAPI.resolve(TESTS_DIR);
    
            expect(dir).toBe(TESTS_DIR);
        });
    
        it("should return resolved homedir path for ~", function() {
            expect.assertions(1);
    
            const dir = localAPI.resolve("~");
    
            expect(dir).toBe(HOMEDIR);
        });
    });
    
    describe("size", function() {
        const SIZE_PATH = `${TESTS_DIR}/sizeTest`;
    
        beforeAll(() => {
            mock(TmpDir);
            localAPI = new FsLocal.API("/", () => {});
        });

        afterAll(() => mock.restore());
    
        it("should return 0 if no files", async () => {
            expect.assertions(1);
    
            const size = await localAPI.size(__dirname, []);
            expect(size).toBe(0);
        });
    
        it("should return correct size for 14 bytes file", async () => {
            expect.assertions(1);
    
            const size = await localAPI.size(SIZE_PATH, ["14bytes"]);
            expect(size).toBe(14);
        });
    
        it("should return correct size for several 14 + 1024 files", async () => {
            expect.assertions(1);
    
            const size = await localAPI.size(SIZE_PATH, ["14bytes", "1024bytes"]);
            expect(size).toBe(1038);
        });
    
        it("should throw ENOENT if file does not exist", async () => {
            expect.assertions(1);
    
            try {
                await localAPI.size(SIZE_PATH, ["15bytes"]);
            } catch (err) {
                expect(err.code).toBe("ENOENT");
            }
        });
    });
    
    describe("makedir", function() {
        const MAKEDIR_PATH = `${TESTS_DIR}/makedirTest`;
    
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            mock(TmpDir);
        });
    
        afterAll(() => mock.restore());

        it("should return success if folder already exists", async () => {
            expect.assertions(1);
    
            const resolved = await localAPI.makedir(MAKEDIR_PATH, "");
            expect(resolved).toBe(MAKEDIR_PATH);
        });

        // won't work with mock-fs unfortunately
        // it.only("should throw EACCES if source does not exist", async () => {
        //     expect.assertions(1);

        //     try {
        //         await localAPI.makedir("/azerty", "foo");
        //     } catch (err) {
        //         // Catalina now has RO system FS
        //         expect(err.code).toMatch(/EACCES|EROFS/);
        //     }
        // });
    
        it("should throw EACCES if source is not readable", async () => {
            expect.assertions(1);
    
            try {
                await localAPI.makedir(`${MAKEDIR_PATH}/denied`, "foo");
            } catch (err) {
                expect(err.code).toBe("EACCES");
            }
        });
    
        it("should create a single folder", async () => {
            expect.assertions(1);
    
            const resolved = await localAPI.makedir(MAKEDIR_PATH, "dir1");
    
            expect(resolved).toBe(`${MAKEDIR_PATH}/dir1`);
        });
    
        it("should create several folders", async () => {
            expect.assertions(1);
    
            const resolved = await localAPI.makedir(MAKEDIR_PATH, "dir2/dir3/dir4");
    
            expect(resolved).toBe(`${MAKEDIR_PATH}/dir2/dir3/dir4`);
        });
    });
    
    describe("makeSymLink", () => {
        const filePath = `${TESTS_DIR}/file`

        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            mock(TmpDir);
        });

        afterAll(() => mock.restore());

        it('should create valid softlink', async () => {
            expect.assertions(1);

            const res = await localAPI.makeSymlink(filePath, '/link1');
            expect(res).toBe(true);
        });

        it('should create non valid softlink', async () => {
            expect.assertions(1);

            const res = await localAPI.makeSymlink('/not_here', '/link2');
            expect(res).toBe(true);
        });

        it('should throw EENOENT if link could not be created because link path does not exist', async () => {
            expect.assertions(1);

            try {
                await localAPI.makeSymlink(filePath, '/non/valid');
            } catch(err) {
                expect(err.code).toBe('ENOENT');
            }
        });

        it('should throw EACCES if access was denied when creating link', async () => {
            expect.assertions(1);

            try {
                await localAPI.makeSymlink(filePath, `${TESTS_DIR}/makedirTest/denied/link`);
            } catch(err) {
                expect(err.code).toBe('EACCES');
            }
        });

        it('should throw EEXIST if file with that name already exists', async () => {
            expect.assertions(1);

            try {
                const res = await localAPI.makeSymlink(filePath, `${TESTS_DIR}/file`);
            } catch(err) {
                expect(err.code).toBe('EEXIST');
            }
        });
    });

    describe('rename', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            mock(TmpDir);
        });

        afterAll(() => mock.restore());
        
        it('should throw EEXIST if destination already exists', async () => {
            expect.assertions(1);

            try {
                await localAPI.rename(`${TESTS_DIR}/sizeTest`, { fullname: '14bytes' }, '1024bytes');
            } catch(err) {
                expect(err.code).toBe('EEXIST');
            }
        });

        it('should throw ENOENT if source does not exist', async () => {
            expect.assertions(1);

            try {
                await localAPI.rename(`${TESTS_DIR}/sizeTest`, { fullname: 'nothing_here' }, 'new_file');
            } catch(err) {
                expect(err.code).toBe('ENOENT');
            }
        });

        it('should throw EACCES if user cannot access destination folder', async () => {
            expect.assertions(1);

            try {
                await localAPI.rename(`${TESTS_DIR}/deleteTest/folder_denied`, { fullname: 'file2' }, 'new_file');
            } catch(err) {
                expect(err.code).toBe('EACCES');
            }
        });

        it('should allow renaming a protected file', async () => {
            expect.assertions(1);

            const res = await localAPI.rename(`${TESTS_DIR}/deleteTest`, { fullname: 'file_denied' }, 'new_file');
            expect(res).toBe('new_file');
        });

        it('should rename a file', async () => {
            expect.assertions(1);

            const res = await localAPI.rename(`${TESTS_DIR}`, { fullname: 'file' }, 'new_file');
            expect(res).toBe('new_file');
        });
    });

    describe('isDir', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            mock(TmpDir);
        });

        afterAll(() => mock.restore());
        
        it('should return true if file is a directory', async () => {
            expect.assertions(1);
            const res = await localAPI.isDir(TESTS_DIR);
            expect(res).toBe(true);
        });

        it('should return true if symlink is a directory', async () => {
            expect.assertions(1);
            const res = await localAPI.isDir(`${TESTS_DIR}/linkToSizeTest`);
            expect(res).toBe(true);
        });

        it('should throw ENOENT if file cannot be accessed', async () => {
            expect.assertions(1);

            try {
                const res = await localAPI.isDir(`${TESTS_DIR}/deleteTest/fileDenied`);
                expect(res).toBe(false);
            } catch (err) {
                expect(err.code).toBe('ENOENT');
            }
        });

        it('should throw ENOENT if file does not exist', async () => {
            expect.assertions(1);
            try {
                await localAPI.isDir(`${TESTS_DIR}/not_here`);
            } catch(err) {
                expect(err.code).toBe('ENOENT');
            }
        });

        it('should return false if file is a symlink pointing to a file', async () => {
            expect.assertions(1);
            const res = await localAPI.isDir(`${TESTS_DIR}/link`);
            expect(res).toBe(false);
        });

        it('should return false if path is a file', async () => {
            expect.assertions(1);
            const res = await localAPI.isDir(`${TESTS_DIR}/file`);
            expect(res).toBe(false);
        });
    });

    describe('exists', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            mock(TmpDir);
        });

        afterAll(() => mock.restore());

        it('should resolve to true if file exists', async () => {
            expect.assertions(1);
            const res = await localAPI.exists(`${TESTS_DIR}/file`);
            expect(res).toBe(true);
        });

        it('should resolve to false if file does not exists', async () => {
            expect.assertions(1);
            const res = await localAPI.exists(`${TESTS_DIR}/nothing`);
            expect(res).toBe(false);
        });
    });

    describe('stat', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            mock(TmpDir);
        });

        afterAll(() => mock.restore());

        // -   "atime": 2020-04-19T16:54:07.529Z,
        // -   "atimeMs": 1587315247529,
        // -   "birthtime": 2020-04-19T16:54:07.529Z,
        // -   "birthtimeMs": 1587315247529,
        // -   "blksize": 4096,
        // -   "blocks": 0,
        // -   "ctime": 2020-04-19T16:54:07.529Z,
        // -   "ctimeMs": 1587315247529,
        //     -   "gid": 1140567832,
        // -   "mtime": 2020-04-19T16:54:07.529Z,
        // -   "mtimeMs": 1587315247529,
        // -   "nlink": 1,
        // -   "rdev": 0,
        // -   "size": 0,
        // -   "uid": 138850138,

        it('should return stat for existing file', async () => {
            const path = `${TESTS_DIR}/file`;
            expect.assertions(1);

            const fsStat = fs.statSync(path);
            const stat = await localAPI.stat(path);
            expect(stat).toEqual({
                dir: TESTS_DIR,
                fullname: 'file',
                name: 'file',
                extension: '',
                cDate: fsStat.ctime,
                bDate: fsStat.ctime,
                mDate: fsStat.mtime,
                length: fsStat.size,
                isDir: false,
                isSym: false,
                id: {
                    dev: fsStat.dev,
                    ino: fsStat.ino
                },
                mode: fsStat.mode,
                readonly: false,
                target: null,
                type: ''
            });
        });

        it('should return link target in target prop if file is a link', async () => {
            const path = `${TESTS_DIR}/link`;
            expect.assertions(1);

            const stat = await localAPI.stat(path);
            expect(stat.target).toBe('file');
        });

        it('should throw error if file does not exist', async () => {
            const path = `${TESTS_DIR}/nothing_here`;
            expect.assertions(1);

            try {
                await localAPI.stat(path);
            } catch(err) {
                expect(err.code).toBe('ENOENT');
            }
        });
    });

    describe('login', () => {
        it('should resolve to true', async () => {
            expect.assertions(1);
            expect(localAPI.login()).resolves.toBe(undefined);
        });
    });

    // TODO: cannot be tested with mock-fs for now
    // describe('onList',() => {
    //     it('should return ')
    // });

    describe('list', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
            jest.spyOn(localAPI, 'onList').mockImplementation(() => {});
            mock(TmpDir);
        });

        afterEach(() => jest.clearAllMocks())

        afterAll(() => {
            mock.restore();
        });

        it('should throw ENOENT if path does not exist', async () => {
            expect.assertions(1);
            try {
                await localAPI.list('/nothing');
            } catch(err) {
                expect(err.code).toBe('ENOENT');
            }
        });

        // TODO: should have called onList(dir)
        it('should return every files found in path if it exists', async () => {
            expect.assertions(1);
            
            const files = await localAPI.list(TESTS_DIR);
            
            expect(files.length).toBe(6);
        });

        it('should throw ENOTDIR if path is not a folder', async () => {
            expect.assertions(1);
            try {
                await localAPI.list(`${TESTS_DIR}/deleteTest/file`);
            } catch(err) {
                expect(err.code).toBe('ENOTDIR');
            }
        });

        it('should throw EACCES if cannot access folder', async () => {
            expect.assertions(1);
            try {
                await localAPI.list(`${TESTS_DIR}/deleteTest/folder_denied`);
            } catch(err) {
                expect(err.code).toBe('EACCES');
            }
        });

        it('should call onList with path when listing a valid directory', async () => {
            expect.assertions(2);
            
            await localAPI.list(TESTS_DIR);
            
            expect(localAPI.onList).toHaveBeenCalledTimes(1);
            expect(localAPI.onList).toHaveBeenCalledWith(TESTS_DIR);
        });
    });

    describeUnix('isRoot', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("/", () => {});
        });

        it('should return false for empty path', () => {
            expect(localAPI.isRoot('')).toBe(false);
        });

        it('should return true is path !== "/"', () => {
            expect(localAPI.isRoot('/foo')).toBe(false);
        });

        it('should return true is path === "/"', () => {
            expect(localAPI.isRoot('/')).toBe(true);
        });
    });

    describeWin('isRoot', () => {
        beforeAll(() => {
            localAPI = new FsLocal.API("C:\\", () => {});
        });

        it('should return false for empty path', () => {
            expect(localAPI.isRoot('')).toBe(false);
        });

        it('should return true is path !== "X:\\"', () => {
            expect(localAPI.isRoot('C:\\Windows')).toBe(false);
        });

        it('should return true is path === "X:\\"', () => {
            expect(localAPI.isRoot('C:\\')).toBe(true);
        });

        it('should return true if path === "\\\\"', () => {
            expect(localAPI.isRoot('\\\\')).toBe(true);
        });

        it('should return false if path === "\\\\foo"', () => {
            expect(localAPI.isRoot('\\\\foo')).toBe(true);
        });
    });
    // // describe("delete", function() {
    //     const DELETE_PATH = `${TESTS_DIR}/deleteTest`;
    
    //     beforeAll(() => {
    //         localAPI = new FsLocal.API("/", () => {});
    //         return prepareTmpTestFiles();
    //     });

    //     it('should resolve if file/folder does not exist', async () => {
    //         expect.assertions(1);
    
    //         const deleted = await localAPI.delete(`${DELETE_PATH}`, [{
    //             fullname: 'not_here'
    //         }]);
    
    //         expect(deleted).toBe(1);
    //     });
    
    //     it('should throw EACCESS if file/folder is write protected', async () => {
    //         expect.assertions(1);
    //         process.stdout.write('ro');
    //         process.stdout.write(`++${DELETE_PATH}++`)
    //         // const deleted = await localAPI.delete(`${DELETE_PATH}`, [{
    //         //     fullname: 'file_denied'
    //         // }]);
    
    //         // expect(deleted).toBe(2);
    //         expect(1).toBe(2);
    //     });
    
    //     it("should delete single file and resolve if success", () => {});
    
    //     it("should delete empty folder and resolve if success", () => {});
    
    //     it("should delete not empty folder and resolve if success", () => {});
    
    //     it("should delete not empty folder + files and resolve", () => {});
    // });
})
