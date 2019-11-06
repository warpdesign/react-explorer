import { FsLocal } from "./FsLocal";

import {
    describeUnix,
    getPath,
    prepareTmpTestFiles
} from "../../utils/test/helpers";

let localAPI: any;

const HOMEDIR = getPath("home");
const TESTS_DIR = getPath("tests_dir");

describeUnix("isDirectoryNameValid: unix", function() {
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
    beforeAll(() => {
        localAPI = new FsLocal.API("/", () => {});
    });

    it("should throw if is not a directory", async function() {
        expect.assertions(1);

        try {
            await localAPI.cd(__filename);
        } catch (err) {
            expect(err.code).toBe("ENOTDIR");
        }
    });

    it("should throw if is does not exist", async function() {
        expect.assertions(1);

        try {
            await localAPI.cd(__filename + "__");
        } catch (err) {
            expect(err.code).toBe("ENOENT");
        }
    });

    it("should return resolved path if exists and is a dir", function() {
        const dir = localAPI.resolve(__dirname);

        expect(dir).toBe(__dirname);
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
        localAPI = new FsLocal.API("/", () => {});
        return prepareTmpTestFiles();
    });

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
        return prepareTmpTestFiles();
    });

    it("should return success if folder already exists", async () => {
        expect.assertions(1);

        const resolved = await localAPI.makedir(MAKEDIR_PATH, "");
        expect(resolved).toBe(MAKEDIR_PATH);
    });

    it("should throw EACCES if source does not exist", async () => {
        expect.assertions(1);

        try {
            await localAPI.makedir("/azerty", "foo");
        } catch (err) {
            // Catalina now has RO system FS
            expect(err.code).toMatch(/EACCES|EROFS/);
        }
    });

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

describe("delete", function() {
    const DELETE_PATH = `${TESTS_DIR}/deleteTest`;

    beforeAll(() => {
        localAPI = new FsLocal.API("/", () => {});
        return prepareTmpTestFiles();
    });

    // it('should resolve if file/folder does not exist', async () => {
    //     expect.assertions(1);

    //     const deleted = await localAPI.delete(`${DELETE_PATH}`, [{
    //         fullname: 'not_here'
    //     }]);

    //     expect(deleted).toBe(1);
    // });

    // it.only('should throw EACCESS if file/folder is write protected', async () => {
    //     expect.assertions(1);

    //     const deleted = await localAPI.delete(`${DELETE_PATH}`, [{
    //         fullname: 'file_denied'
    //     }]);

    //     expect(deleted).toBe(2);
    // });

    it("should delete single file and resolve if success", () => {});

    it("should delete empty folder and resolve if success", () => {});

    it("should delete not empty folder and resolve if success", () => {});

    it("should delete not empty folder + files and resolve", () => {});
});
