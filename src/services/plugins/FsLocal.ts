import { FsApi, File, ICredentials, Fs, filetype, MakeId } from "../Fs";
import * as fs from "fs";
import * as path from "path";
const mkdir = require("mkdirp");
const del = require("del");
import { size } from "../../utils/size";
import { throttle } from "../../utils/throttle";
const { Transform } = require("stream");
import { isWin, HOME_DIR } from "../../utils/platform";
import { LocalWatch } from "./LocalWatch";

const invalidDirChars = (isWin && /[\*:<>\?|"]+/gi) || /^[\.]+[\/]+(.)*$/gi;
const invalidFileChars = (isWin && /[\*:<>\?|"]+/gi) || /\//;
const SEP = path.sep;

// Since nodeJS will translate unix like paths to windows path, when running under Windows
// we accept Windows style paths (eg. C:\foo...) and unix paths (eg. /foo or ./foo)
const localStart =
    (isWin && /^(([a-zA-Z]\:)|([\.]*\/|\.)|(\\\\)|~)/) || /^([\.]*\/|\.|~)/;
const isRoot = (isWin && /((([a-zA-Z]\:)(\\)*)|(\\\\))$/) || /^\/$/;

const progressFunc = throttle((progress: any, bytesRead: number) => {
    progress(bytesRead);
}, 400);

export class LocalApi implements FsApi {
    type = 0;
    // current path
    path: string;
    loginOptions: ICredentials = null;
    onFsChange: (filename: string) => void;

    constructor(_: string, onFsChange: (filename: string) => void) {
        this.path = "";
        this.onFsChange = onFsChange;
    }

    // local fs doesn't require login
    isConnected(): boolean {
        return true;
    }

    isDirectoryNameValid(dirName: string): boolean {
        return !!!dirName.match(invalidDirChars) && dirName !== "/";
    }

    join(...paths: string[]): string {
        return path.join(...paths);
    }

    resolve(newPath: string): string {
        // gh#44: replace ~ with userpath
        const dir = newPath.replace(/^~/, HOME_DIR);
        return path.resolve(dir);
    }

    cd(path: string, transferId = -1) {
        const resolvedPath = this.resolve(path);
        return this.isDir(resolvedPath)
            .then((isDir: boolean) => {
                if (isDir) {
                    return resolvedPath;
                } else {
                    throw { code: "ENOTDIR" };
                }
            })
            .catch(err => {
                return Promise.reject(err);
            });
    }

    size(source: string, files: string[], transferId = -1): Promise<number> {
        return new Promise(async (resolve, reject) => {
            try {
                let bytes = 0;
                for (let file of files) {
                    bytes += await size(path.join(source, file));
                }
                resolve(bytes);
            } catch (err) {
                reject(err);
            }
        });
    }

    async makedir(source: string, dirName: string, transferId = -1): Promise<string> {
        return new Promise((resolve, reject) => {
            const unixPath = path.join(source, dirName).replace(/\\/g, "/");
            try {
                mkdir(unixPath, (err: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(path.join(source, dirName));
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    delete(source: string, files: File[], transferId = -1): Promise<number> {
        let toDelete = files.map(file => path.join(source, file.fullname));

        return new Promise(async (resolve, reject) => {
            try {
                const deleted = await del(toDelete, {
                    force: true,
                    noGlob: true
                });
                resolve(deleted.length);
            } catch (err) {
                // console.log("error delete", err);
                reject(err);
            }
        });
    }

    rename(
        source: string,
        file: File,
        newName: string,
        transferId = -1
    ): Promise<string> {
        const oldPath = path.join(source, file.fullname);
        const newPath = path.join(source, newName);

        if (!newName.match(invalidFileChars)) {
            return new Promise((resolve, reject) => {
                // since node's fs.rename will overwrite the destination
                // path if it exists, first check that file doesn't exist
                this.exists(newPath).then(exists => {
                    if (exists) {
                        reject({
                            code: "EEXIST",
                            oldName: file.fullname
                        });
                    } else {
                        fs.rename(oldPath, newPath, err => {
                            if (err) {
                                reject({
                                    code: err.code,
                                    message: err.message,
                                    newName: newName,
                                    oldName: file.fullname
                                });
                            } else {
                                resolve(newName);
                            }
                        });
                    }
                })
                    .catch((err) => {
                        reject({
                            code: err.code,
                            message: err.message,
                            newName: newName,
                            oldName: file.fullname
                        });
                    })
            });
        } else {
            // reject promise with previous name in case of invalid chars
            return Promise.reject({
                oldName: file.fullname,
                newName: newName,
                code: "BAD_FILENAME"
            });
        }
    }

    async makeSymlink(targetPath: string, path: string, transferId = -1): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => fs.symlink(targetPath, path, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        }));
    }

    async isDir(path: string, transferId = -1): Promise<boolean> {
        const lstat = fs.lstatSync(path);
        const stat = fs.statSync(path);
        return stat.isDirectory() || lstat.isDirectory();
    }

    async exists(path: string, transferId = -1): Promise<boolean> {
        try {
            fs.statSync(path);
            return true;
        } catch (err) {
            if (err.code === "ENOENT") {
                return false;
            } else {
                throw err;
            }
        }
    }

    async stat(fullPath: string, transferId = -1): Promise<File> {
        try {
            const format = path.parse(fullPath);
            const stats = fs.lstatSync(fullPath);
            const file: File = {
                dir: format.dir,
                fullname: format.base,
                name: format.name,
                extension: format.ext.toLowerCase(),
                cDate: stats.ctime,
                mDate: stats.mtime,
                bDate: stats.birthtime,
                length: stats.size,
                mode: stats.mode,
                isDir: stats.isDirectory(),
                readonly: false,
                type:
                    (!stats.isDirectory() &&
                        filetype(
                            stats.mode,
                            stats.gid,
                            stats.uid,
                            format.ext.toLowerCase()
                        )) ||
                    "",
                isSym: stats.isSymbolicLink(),
                target: stats.isSymbolicLink() && fs.readlinkSync(fullPath) || null,
                id: MakeId(stats)
            };

            return file;
        } catch (err) {
            throw err;
        }
    }

    login(server?: string, credentials?: ICredentials): Promise<void> {
        return Promise.resolve();
    }

    onList(dir: string) {
        if (dir !== this.path) {
            // console.log('stopWatching', this.path);
            try {
                LocalWatch.stopWatchingPath(this.path, this.onFsChange);
                LocalWatch.watchPath(dir, this.onFsChange);
            } catch(e) {
                console.warn('Could not watch path', dir, e);
            }
            // console.log('watchPath', dir);
            this.path = dir;
        }
    }

    async list(dir: string, watchDir = false, transferId = -1): Promise<File[]> {
        try {
            await this.isDir(dir);
            return new Promise<File[]>((resolve, reject) => {
                fs.readdir(dir, (err, items) => {
                    if (err) {
                        reject(err);
                    } else {
                        const dirPath = path.resolve(dir);

                        const files: File[] = [];

                        for (var i = 0; i < items.length; i++) {
                            const file = LocalApi.fileFromPath(
                                path.join(dirPath, items[i])
                            );
                            files.push(file);
                        }

                        watchDir && this.onList(dirPath);

                        resolve(files);
                    }
                });
            });
        } catch (err) {
            throw ({
                code: err.code,
                message: `Could not access path: ${dir}`
            });
        }
    }

    static fileFromPath(fullPath: string): File {
        const format = path.parse(fullPath);
        let name = fullPath;
        let stats: Partial<fs.Stats> = null;
        let target_stats = null;

        try {
            // do not follow symlinks first
            stats = fs.lstatSync(fullPath);
            if (stats.isSymbolicLink()) {
                // get link target path first
                name = fs.readlinkSync(fullPath);
                target_stats = fs.statSync(fullPath);
            }
        } catch (err) {
            console.warn(
                "error getting stats for",
                fullPath,
                err
            );

            const isDir = stats ? stats.isDirectory() : false
            const isSymLink = stats ? stats.isSymbolicLink() : false

            stats = {
                ctime: new Date(),
                mtime: new Date(),
                birthtime: new Date(),
                size: stats ? stats.size : 0,
                isDirectory: () => isDir,
                mode: -1,
                isSymbolicLink: () => isSymLink,
                ino: 0,
                dev: 0
            };
        }

        const extension = path.parse(name).ext.toLowerCase();
        const mode = target_stats ? target_stats.mode : stats.mode;

        const file: File = {
            dir: format.dir,
            fullname: format.base,
            name: format.name,
            extension: extension,
            cDate: stats.ctime,
            mDate: stats.mtime,
            bDate: stats.birthtime,
            length: stats.size,
            mode: mode,
            isDir: target_stats
                ? target_stats.isDirectory()
                : stats.isDirectory(),
            readonly: false,
            type:
                (!(target_stats
                    ? target_stats.isDirectory()
                    : stats.isDirectory()) &&
                    filetype(mode, 0, 0, extension)) ||
                "",
            isSym: stats.isSymbolicLink(),
            target: stats.isSymbolicLink() && name || null,
            id: MakeId(stats)
        };

        return file;
    }

    isRoot(path: string): boolean {
        return !!path.match(isRoot);
    }

    off() {
        // console.log("off", this.path);
        // console.log("stopWatchingPath", this.path);
        LocalWatch.stopWatchingPath(this.path, this.onFsChange);
    }

    // TODO add error handling
    async getStream(
        path: string,
        file: string,
        transferId = -1
    ): Promise<fs.ReadStream> {
        try {
            // console.log('opening read stream', this.join(path, file));
            const stream = fs.createReadStream(this.join(path, file), {
                highWaterMark: 31 * 16384
            });
            return Promise.resolve(stream);
        } catch (err) {
            console.log("FsLocal.getStream error", err);
            return Promise.reject(err);
        }
    }

    putStream(
        readStream: fs.ReadStream,
        dstPath: string,
        progress: (pourcent: number) => void,
        transferId = -1
    ): Promise<void> {
        return new Promise(
            (resolve: (val?: any) => void, reject: (val?: any) => void) => {
                let finished = false;
                let readError = false;
                let bytesRead = 0;

                const reportProgress = new Transform({
                    transform(chunk: any, encoding: any, callback: any) {
                        bytesRead += chunk.length;
                        progressFunc(progress, bytesRead);
                        callback(null, chunk);
                    },
                    highWaterMark: 16384 * 31
                });

                readStream.once("error", err => {
                    console.log("error on read stream");
                    readError = true;
                    readStream.destroy();
                    writeStream.destroy(err);
                });

                const writeStream = fs.createWriteStream(dstPath);

                readStream.pipe(reportProgress).pipe(writeStream);

                writeStream.once("finish", () => {
                    finished = true;
                });

                writeStream.once("error", err => {
                    // remove created file if it's empty and there was a problem
                    // accessing the source file: we will report an error to the
                    // user so there's no need to leave an empty file
                    if (readError && !bytesRead && !writeStream.bytesWritten) {
                        console.log("cleaning up fs");
                        fs.unlink(dstPath, err => {
                            if (!err) {
                                console.log("cleaned-up fs");
                            } else {
                                console.log("error cleaning-up fs", err);
                            }
                        });
                    }
                    reject(err);
                });

                writeStream.once("close", () => {
                    if (finished) {
                        resolve();
                    } else {
                        reject();
                    }
                });

                writeStream.once("error", err => {
                    reject(err);
                });
            }
        );
    }

    getParentTree(
        dir: string
    ): Array<{ dir: string; fullname: string; name: string }> {
        const parts = dir.split(SEP);
        const max = parts.length - 1;
        let fullname = "";

        if (dir.length === 1) {
            return [
                {
                    dir,
                    fullname: "",
                    name: dir
                }
            ];
        } else {
            const folders = [];

            for (let i = 0; i <= max; ++i) {
                folders.push({
                    dir,
                    fullname,
                    name: parts[max - i] || SEP
                });

                if (!i) {
                    fullname += "..";
                } else {
                    fullname += "/..";
                }
            }

            return folders;
        }
    }

    sanityze(path: string) {
        return isWin ? (path.match(/\\$/) ? path : path + "\\") : path;
    }

    on(event: string, cb: (data: any) => void): void { }
}

export function FolderExists(path: string) {
    try {
        return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
    } catch (err) {
        return false;
    }
}

export const FsLocal: Fs = {
    icon: "database",
    name: "local",
    description: "Local Filesystem",
    options: {
        needsRefresh: false
    },
    canread(str: string): boolean {
        // console.log('FsLocal.canread', str, !!str.match(localStart));
        return !!str.match(localStart);
    },
    serverpart(str: string): string {
        return "local";
    },
    credentials(str: string): ICredentials {
        return {
            user: "",
            password: "",
            port: 0
        };
    },
    displaypath(str: string) {
        const split = str.split(SEP);
        return {
            fullPath: str,
            shortPath: split.slice(-1)[0] || str
        };
    },
    API: LocalApi
};
