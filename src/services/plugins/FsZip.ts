/* eslint-disable @typescript-eslint/no-unused-vars */
import StreamZip, { StreamZipAsync, ZipEntry } from 'node-stream-zip'
import type { ReadStream, BigIntStats } from 'fs'
import { Transform, TransformCallback } from 'stream'
import * as path from 'path'

import { FsApi, FileDescriptor, Credentials, Fs, filetype, MakeId } from '$src/services/Fs'
import { throttle } from '$src/utils/throttle'
import { isWin, HOME_DIR } from '$src/utils/platform'

const invalidDirChars = (isWin && /[\*:<>\?|"]+/gi) || /^[\.]+[\/]+(.)*$/gi
const invalidFileChars = (isWin && /[\*:<>\?|"]+/gi) || /\//
const SEP = path.sep

// Since nodeJS will translate unix like paths to windows path, when running under Windows
// we accept Windows style paths (eg. C:\foo...) and unix paths (eg. /foo or ./foo)
const isRoot = (isWin && /((([a-zA-Z]\:)(\\)*)|(\\\\))$/) || /^\/$/

const progressFunc = throttle((progress: (bytes: number) => void, bytesRead: number) => {
    progress(bytesRead)
}, 400)

export const checkDirectoryName = (dirName: string) => !!!dirName.match(invalidDirChars) && dirName !== '/'

export interface ZipMethods {
    isZipRoot: (path: string) => boolean
    getEntries: () => Promise<ZipEntry[]>
}

export class Zip {
    ready = false
    zip: StreamZipAsync
    zipEntries: ZipEntry[]
    zipPath: string
    zipFilename: string

    constructor(path: string) {
        this.zip = new StreamZip.async({ file: path })
        this.zipEntries = []
        this.zipPath = path.replace(/(\/$)*/, '')
        this.zipFilename = ''
    }

    isZipRoot(path: string) {
        return true
    }

    async getEntries(path: string) {
        if (!this.ready) {
            const entries = await this.zip.entries()
            this.zipEntries = Object.values(entries)
            this.ready = true
        }

        const pathInZip = path.replace(this.zipPath, '')
        const isZipRoot = !!!pathInZip

        // TODO: get path inside zip
        return this.zipEntries.filter((entry) => {
            if (isZipRoot) {
                const name = entry.name.replace(/(\/$)*/g, '')
                // root: include files in root zip
                return !name.match(/\//)
            }
        })
    }

    getFileDescriptor(entry: ZipEntry) {
        const name = entry.name.replace(/(\/$)*/g, '')
        const parsed = path.parse(name)
        const extension = parsed.ext.toLowerCase()
        const mDate = new Date(entry.time)
        const mode = entry.attr ? ((entry.attr >>> 0) | 0) >> 16 : 0

        // TODO: build file
        const file = {
            dir: path.parse(`${this.zipPath}/${name}`).dir,
            fullname: name,
            name: parsed.name,
            extension,
            cDate: mDate,
            mDate,
            bDate: mDate,
            length: entry.size,
            mode,
            isDir: entry.isDirectory,
            readonly: true,
            type: (!entry.isDirectory && filetype(mode, 0, 0, extension)) || '',
            // CHECKME: can we have links inside a zip file?
            isSym: false,
            target: null,
            id: MakeId({
                ino: BigInt(entry.crc + (entry as any).headerOffset),
                dev: BigInt(entry.offset + +(entry as any).headerOffset),
            }),
        } as FileDescriptor

        return file
        //         dir: format.dir,
        //         fullname: format.base,
        //         name: format.name,
        //         extension: format.ext.toLowerCase(),
        //         cDate: stats.ctime,
        //         mDate: stats.mtime,
        //         bDate: stats.birthtime,
        //         length: Number(stats.size),
        //         mode: Number(stats.mode),
        //         isDir: stats.isDirectory(),
        //         readonly: false,
        //         type:
        //             (!stats.isDirectory() &&
        //                 filetype(Number(stats.mode), Number(stats.gid), Number(stats.uid), format.ext.toLowerCase())) ||
        //             '',
        //         isSym: stats.isSymbolicLink(),
        //         target: (stats.isSymbolicLink() && vol.readlinkSync(fullPath)) || null,
        //         id: MakeId({ ino: stats.ino, dev: stats.dev }),
    }
}

export class ZipApi implements FsApi {
    type = 0
    // current path
    path: string
    loginOptions: Credentials = null
    onFsChange: (filename: string) => void
    zip: Zip

    constructor(path: string, onFsChange: (filename: string) => void) {
        this.path = ''
        this.onFsChange = onFsChange
        this.zip = new Zip(path)
        debugger
    }

    // local fs doesn't require login
    isConnected(): boolean {
        return true
    }

    isDirectoryNameValid(dirName: string): boolean {
        return checkDirectoryName(dirName)
    }

    join(...paths: string[]): string {
        return path.join(...paths)
    }

    resolve(newPath: string): string {
        // TODO:
        // gh#44: replace ~ with userpath
        debugger
        const dir = newPath.replace(/^~/, HOME_DIR)
        return path.resolve(dir)
    }

    async cd(path: string, transferId = -1): Promise<string> {
        const resolvedPath = this.resolve(path)
        try {
            const isDir = await this.isDir(resolvedPath)
            if (isDir) {
                return resolvedPath
            } else {
                throw { code: 'ENOTDIR' }
            }
        } catch {}
    }

    size(source: string, files: string[], transferId = -1): Promise<number> {
        return Promise.reject('FsZip:size not implemented!')
        // return new Promise(async (resolve, reject) => {
        //     try {
        //         let bytes = 0
        //         for (const file of files) {
        //             bytes += await size(path.join(source, file))
        //         }
        //         resolve(bytes)
        //     } catch (err) {
        //         reject(err)
        //     }
        // })
    }

    async makedir(source: string, dirName: string, transferId = -1): Promise<string> {
        // return new Promise((resolve, reject) => {
        //     console.log('makedir, source:', source, 'dirName:', dirName)
        //     const unixPath = path.join(source, dirName).replace(/\\/g, '/')
        //     console.log('unixPath', unixPath)
        //     try {
        //         console.log('calling mkdir')
        //         reject('FsVirtual:makedir not implemented!')
        //         // mkdir(unixPath, (err: NodeJS.ErrnoException) => {
        //         //     if (err) {
        //         //         console.log('error creating dir', err)
        //         //         reject(err)
        //         //     } else {
        //         //         console.log('successfully created dir', err)
        //         //         resolve(path.join(source, dirName))
        //         //     }
        //         // })
        //     } catch (err) {
        //         console.log('error execing mkdir()', err)
        //         reject(err)
        //     }
        // })
        throw 'TODO: FsZip.makedir'
    }

    delete(source: string, files: FileDescriptor[], transferId = -1): Promise<number> {
        const toDelete = files.map((file) => path.join(source, file.fullname))

        return Promise.reject('TODO: FsZip.delete not implemented!')
        // return new Promise(async (resolve, reject) => {
        //     try {
        //         const deleted = await del(toDelete, {
        //             force: true,
        //             noGlob: true,
        //         })
        //         resolve(deleted.length)
        //     } catch (err) {
        //         reject(err)
        //     }
        // })
    }

    rename(source: string, file: FileDescriptor, newName: string, transferId = -1): Promise<string> {
        throw 'TODO: FsZip.rename'
        // const oldPath = path.join(source, file.fullname)
        // const newPath = path.join(source, newName)

        // if (!newName.match(invalidFileChars)) {
        //     return new Promise((resolve, reject) => {
        //         // since node's fs.rename will overwrite the destination
        //         // path if it exists, first check that file doesn't exist
        //         this.exists(newPath)
        //             .then((exists) => {
        //                 if (exists) {
        //                     reject({
        //                         code: 'EEXIST',
        //                         oldName: file.fullname,
        //                     })
        //                 } else {
        //                     vol.rename(oldPath, newPath, (err) => {
        //                         if (err) {
        //                             reject({
        //                                 code: err.code,
        //                                 message: err.message,
        //                                 newName: newName,
        //                                 oldName: file.fullname,
        //                             })
        //                         } else {
        //                             resolve(newName)
        //                         }
        //                     })
        //                 }
        //             })
        //             .catch((err) => {
        //                 reject({
        //                     code: err.code,
        //                     message: err.message,
        //                     newName: newName,
        //                     oldName: file.fullname,
        //                 })
        //             })
        //     })
        // } else {
        //     // reject promise with previous name in case of invalid chars
        //     return Promise.reject({
        //         oldName: file.fullname,
        //         newName: newName,
        //         code: 'BAD_FILENAME',
        //     })
        // }
    }

    async makeSymlink(targetPath: string, path: string, transferId = -1): Promise<boolean> {
        throw 'TODO: FsZip.makeSymLink'
        // return new Promise<boolean>((resolve, reject) =>
        //     vol.symlink(targetPath, path, (err) => {
        //         if (err) {
        //             reject(err)
        //         } else {
        //             resolve(true)
        //         }
        //     }),
        // )
    }

    async isDir(path: string, transferId = -1): Promise<boolean> {
        console.warn('TODO: FsZip.isDir => check that file inside dir is a directory')
        return true
    }

    async exists(path: string, transferId = -1): Promise<boolean> {
        throw 'TODO: FsZip.Exists not implemented'
        // try {
        //     await vol.promises.access(path)
        //     return true
        // } catch (err) {
        //     if (err.code === 'ENOENT') {
        //         return false
        //     } else {
        //         throw err
        //     }
        // }
    }

    async stat(fullPath: string, transferId = -1): Promise<FileDescriptor> {
        throw 'TODO: FsZip.stat not implemented'
        // try {
        //     const format = path.parse(fullPath)
        //     const stats = vol.lstatSync(fullPath, { bigint: true })
        //     const file: FileDescriptor = {
        //         dir: format.dir,
        //         fullname: format.base,
        //         name: format.name,
        //         extension: format.ext.toLowerCase(),
        //         cDate: stats.ctime,
        //         mDate: stats.mtime,
        //         bDate: stats.birthtime,
        //         length: Number(stats.size),
        //         mode: Number(stats.mode),
        //         isDir: stats.isDirectory(),
        //         readonly: false,
        //         type:
        //             (!stats.isDirectory() &&
        //                 filetype(Number(stats.mode), Number(stats.gid), Number(stats.uid), format.ext.toLowerCase())) ||
        //             '',
        //         isSym: stats.isSymbolicLink(),
        //         target: (stats.isSymbolicLink() && vol.readlinkSync(fullPath)) || null,
        //         id: MakeId({ ino: stats.ino, dev: stats.dev }),
        //     }

        //     return file
        // } catch (err) {
        //     throw err
        // }
    }

    login(server?: string, credentials?: Credentials): Promise<void> {
        return Promise.resolve()
    }

    onList(dir: string): void {
        console.warn('FsZop.onList not implemented')
        // if (dir !== this.path) {
        //     // console.log('stopWatching', this.path)
        //     try {
        //         VirtualWatch.stopWatchingPath(this.path, this.onFsChange)
        //         VirtualWatch.watchPath(dir, this.onFsChange)
        //     } catch (e) {
        //         console.warn('Could not watch path', dir, e)
        //     }
        //     // console.log('watchPath', dir)
        //     this.path = dir
        // }
    }

    async list(dir: string, watchDir = false, transferId = -1): Promise<FileDescriptor[]> {
        const entries = await this.zip.getEntries(dir)
        // return []
        return entries.map((entry) => this.zip.getFileDescriptor(entry))
        debugger
        throw 'TODO: FsZip.list not implemented'
        // try {
        //     await this.isDir(dir)
        //     return new Promise<FileDescriptor[]>((resolve, reject) => {
        //         vol.readdir(dir, (err, items) => {
        //             if (err) {
        //                 reject(err)
        //             } else {
        //                 const dirPath = path.resolve(dir)

        //                 const files: FileDescriptor[] = []

        //                 for (let i = 0; i < items.length; i++) {
        //                     const file = ZipApi.fileFromPath(path.join(dirPath, items[i] as string))
        //                     files.push(file)
        //                 }

        //                 watchDir && this.onList(dirPath)

        //                 resolve(files)
        //             }
        //         })
        //     })
        // } catch (err) {
        //     throw {
        //         code: err.code,
        //         message: `Could not access path: ${dir}`,
        //     }
        // }
    }

    static fileFromPath(fullPath: string): FileDescriptor {
        const format = path.parse(fullPath)
        const name = fullPath
        const stats: Partial<BigIntStats> = null

        debugger

        return {
            name: `${fullPath}`,
        } as FileDescriptor
        // try {
        //     // do not follow symlinks first
        //     stats = vol.lstatSync(fullPath, { bigint: true })
        //     if (stats.isSymbolicLink()) {
        //         // get link target path first
        //         name = vol.readlinkSync(fullPath) as string
        //         targetStats = vol.statSync(fullPath, { bigint: true })
        //     }
        // } catch (err) {
        //     console.warn('error getting stats for', fullPath, err)

        //     const isDir = stats ? stats.isDirectory() : false
        //     const isSymLink = stats ? stats.isSymbolicLink() : false

        //     stats = {
        //         ctime: new Date(),
        //         mtime: new Date(),
        //         birthtime: new Date(),
        //         size: stats ? stats.size : 0n,
        //         isDirectory: (): boolean => isDir,
        //         mode: -1n,
        //         isSymbolicLink: (): boolean => isSymLink,
        //         ino: 0n,
        //         dev: 0n,
        //     }
        // }

        // const extension = path.parse(name).ext.toLowerCase()
        // const mode = targetStats ? targetStats.mode : stats.mode

        // const file: FileDescriptor = {
        //     dir: format.dir,
        //     fullname: format.base,
        //     name: format.name,
        //     extension: extension,
        //     cDate: stats.ctime,
        //     mDate: stats.mtime,
        //     bDate: stats.birthtime,
        //     length: Number(stats.size),
        //     mode: Number(mode),
        //     isDir: targetStats ? targetStats.isDirectory() : stats.isDirectory(),
        //     readonly: false,
        //     type:
        //         (!(targetStats ? targetStats.isDirectory() : stats.isDirectory()) &&
        //             filetype(Number(mode), 0, 0, extension)) ||
        //         '',
        //     isSym: stats.isSymbolicLink(),
        //     target: (stats.isSymbolicLink() && name) || null,
        //     id: MakeId({ ino: stats.ino, dev: stats.dev }),
        // }

        // return file
    }

    isRoot(path: string): boolean {
        return !!path.match(isRoot)
    }

    off(): void {
        //
    }

    // TODO add error handling
    async getStream(path: string, file: string, transferId = -1): Promise<ReadStream> {
        // try {
        //     const stream = fs.createReadStream(this.join(path, file))
        //     return Promise.resolve(stream)
        // } catch (err) {
        //     console.log('FsVirtual.getStream error', err)
        //     return Promise.reject(err)
        // }
        return Promise.reject('TODO: getStream')
    }

    putStream(
        readStream: ReadStream,
        dstPath: string,
        progress: (bytes: number) => void,
        transferId = -1,
    ): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // return new Promise((resolve: (val?: any) => void, reject: (val?: any) => void) => {
        //     let finished = false
        //     let readError = false
        //     let bytesRead = 0

        //     const reportProgress = new Transform({
        //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //         transform(chunk: any, encoding: any, callback: TransformCallback) {
        //             bytesRead += chunk.length
        //             progressFunc(progress, bytesRead)
        //             callback(null, chunk)
        //         },
        //         highWaterMark: 16384 * 31,
        //     })

        //     const writeStream = fs.createWriteStream(dstPath)

        //     readStream.once('error', (err) => {
        //         console.log('error on read stream')
        //         readError = true
        //         readStream.destroy()
        //         writeStream.destroy(err)
        //     })

        //     readStream.pipe(reportProgress).pipe(writeStream)

        //     writeStream.once('finish', (...args) => {
        //         progress(writeStream.bytesWritten)
        //         finished = true
        //     })

        //     writeStream.once('error', (err) => {
        //         // remove created file if it's empty and there was a problem
        //         // accessing the source file: we will report an error to the
        //         // user so there's no need to leave an empty file
        //         if (readError && !bytesRead && !writeStream.bytesWritten) {
        //             console.log('cleaning up fs')
        //             fs.unlink(dstPath, (err) => {
        //                 if (!err) {
        //                     console.log('cleaned-up fs')
        //                 } else {
        //                     console.log('error cleaning-up fs', err)
        //                 }
        //             })
        //         }
        //         reject(err)
        //     })

        //     writeStream.once('close', () => {
        //         if (finished) {
        //             resolve()
        //         } else {
        //             reject()
        //         }
        //     })

        //     writeStream.once('error', (err) => {
        //         reject(err)
        //     })
        // })
        throw 'TODO: FsZip.putStream not implemented'
    }

    getParentTree(dir: string): Array<{ dir: string; fullname: string; name: string }> {
        const parts = dir.split(SEP)
        const max = parts.length - 1
        let fullname = ''

        if (dir.length === 1) {
            return [
                {
                    dir,
                    fullname: '',
                    name: dir,
                },
            ]
        } else {
            const folders = []

            for (let i = 0; i <= max; ++i) {
                folders.push({
                    dir,
                    fullname,
                    name: parts[max - i] || SEP,
                })

                if (!i) {
                    fullname += '..'
                } else {
                    fullname += '/..'
                }
            }

            return folders
        }
    }

    sanityze(path: string): string {
        return isWin ? (path.match(/\\$/) ? path : path + '\\') : path
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: (data: any) => void): void {
        //
    }
}

export function FolderExists(path: string): boolean {
    return false
}

export const FsZip: Fs = {
    icon: 'archive',
    name: 'zip',
    description: 'Zip Filesystem (Readonly)',
    options: {
        needsRefresh: false,
    },
    canread(str: string): boolean {
        return str.replace(/\/$/, '').split(/\.zip/gi).length === 2
    },
    serverpart(str: string): string {
        return 'zip'
    },
    credentials(str: string): Credentials {
        return {
            user: '',
            password: '',
            port: 0,
        }
    },
    displaypath(str: string): { shortPath: string; fullPath: string } {
        const split = str.split(SEP)
        return {
            fullPath: str,
            shortPath: split.slice(-1)[0] || str,
        }
    },
    API: ZipApi,
}
