/* eslint-disable @typescript-eslint/no-unused-vars */
import StreamZip, { StreamZipAsync, ZipEntry } from 'node-stream-zip'
import * as path from 'path'

import { FsApi, FileDescriptor, Credentials, Fs, filetype, MakeId } from '$src/services/Fs'
import { throttle } from '$src/utils/throttle'
import { isWin, HOME_DIR } from '$src/utils/platform'

const invalidDirChars = (isWin && /[\*:<>\?|"]+/gi) || /^[\.]+[\/]+(.)*$/gi
const invalidFileChars = (isWin && /[\*:<>\?|"]+/gi) || /\//
const SEP = path.sep
const getZipPathRegEx = /(?<=\.zip).*/i
// Since nodeJS will translate unix like paths to windows path, when running under Windows
// we accept Windows style paths (eg. C:\foo...) and unix paths (eg. /foo or ./foo)
const isRoot = (isWin && /((([a-zA-Z]\:)(\\)*)|(\\\\))$/) || /^\/$/

export const checkDirectoryName = (dirName: string) => !!!dirName.match(invalidDirChars) && dirName !== '/'

export interface ZipMethods {
    getEntries: (path: string) => Promise<ZipEntry[]>
    getRelativePath: (path: string) => string
    prepareEntries: (path: string) => Promise<void>
    getFileDescriptor: (entry: ZipEntry) => FileDescriptor
    getFileStream: (path: string) => any
    isDir: (path: string) => boolean
    setup: (path: string) => void
    close(): void
}

export class Zip implements ZipMethods {
    ready = false
    zip: StreamZipAsync = null
    zipEntries: ZipEntry[] = []
    zipPath = ''

    constructor(path: string) {
        this.setup(path)
    }

    close() {
        // Reset zipPath so that zip is reopened if needed: this can happen
        // if files from this zip are added into clipboard, then tab is closed
        // and user pastes files.
        this.zipPath = ''
        this.zip.close()
    }

    /**
     * Get path relative to zip path
     */
    getRelativePath(path: string) {
        return path.replace(this.zipPath, '').replace(/^\//, '')
    }

    async setup(path: string) {
        const zipPath = path.replace(getZipPathRegEx, '')
        if (zipPath !== this.zipPath) {
            this.zip && this.close()
            this.zip = new StreamZip.async({ file: zipPath })
            this.zipPath = zipPath
            this.ready = false
        }
    }

    async prepareEntries(path: string) {
        // If the user first attempted to open an invalid zip archive
        // then clicks on another zip file, we will keep the same fs
        // so here we re-run setup which will open a new zip stream
        // with the new path if needed.
        this.setup(path)
        if (!this.ready) {
            const entries = await this.zip.entries()
            this.zipEntries = Object.values(entries)
            this.ready = true
        }
    }

    async getEntries(path: string) {
        const pathInZip = this.getRelativePath(path)
        const dirsInRoot: string[] = []
        const entries: ZipEntry[] = []
        const dirPos = !pathInZip.length ? 0 : pathInZip.split('/').length
        this.zipEntries.forEach((entry) => {
            const { name } = entry
            // skip name partially matching pathInZip, for eg.
            // pathInZip === '/foo'
            // name === '/foo.bar'
            if (name.startsWith(pathInZip.length ? `${pathInZip}/` : '')) {
                const paths = name.split('/')
                const dir = paths[dirPos]
                // do not add current path or already added path to the list
                if (dirsInRoot.indexOf(dir) !== -1 || !dir.length) return

                if (paths.length === dirPos + 1) {
                    entries.push(entry)
                } else {
                    dirsInRoot.push(dir)
                    entries.push(this.getFakeDirDescriptor(pathInZip.length ? `${pathInZip}/${dir}` : dir))
                }
            }
        })
        console.log(entries)

        return entries
    }

    isDir(path: string) {
        const pathInZip = this.getRelativePath(path)

        // Will match 'pathInZip/' & 'pathInZip/foo': even though the second one is not necessarily
        // a directory, it means that pathInZip is itself a directory.
        return pathInZip.length === 0 || this.zipEntries.some((entry) => !!entry.name.match(`${pathInZip}/`))
    }

    getFakeDirDescriptor(name: string): ZipEntry {
        const time = new Date().getTime()
        return {
            name,
            size: 0,
            attr: 0,
            isDirectory: true,
            time,
            crc: time,
            offset: time,
            headerOffset: time,
        } as any
    }

    getFileDescriptor(entry: ZipEntry) {
        const name = entry.name.replace(/(\/$)*/g, '')
        const parsed = path.parse(name)
        const extension = parsed.ext.toLowerCase()
        const mDate = new Date(entry.time)
        const mode = entry.attr ? ((entry.attr >>> 0) | 0) >> 16 : 0

        const file = {
            dir: path.parse(`${this.zipPath}/${name}`).dir,
            fullname: parsed.base,
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
    }

    getFileStream(path: string): Promise<NodeJS.ReadableStream> {
        const relativePath = this.getRelativePath(path)
        return this.zip.stream(relativePath)
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
        // gh#44: replace ~ with userpath
        const dir = newPath.replace(/^~/, HOME_DIR)
        return path.resolve(dir)
    }

    async cd(path: string, transferId = -1): Promise<string> {
        const resolvedPath = this.resolve(path)

        try {
            await this.zip.prepareEntries(path)
        } catch (e) {
            console.error('error getting zip file entries', e)
            throw e?.code === 'EACCES' ? e : { code: 'EBADFILE' }
        }

        const isDir = await this.isDir(resolvedPath)
        if (isDir) {
            return resolvedPath
        } else {
            throw { code: 'ENOTDIR' }
        }
    }

    async size(source: string, files: string[], transferId = -1): Promise<number> {
        throw 'FsZip:size not implemented!'
    }

    async isDir(path: string, transferId = -1): Promise<boolean> {
        return this.zip.isDir(path)
    }

    async exists(path: string, transferId = -1): Promise<boolean> {
        throw 'TODO: FsZip.Exists not implemented'
    }

    async stat(fullPath: string, transferId = -1): Promise<FileDescriptor> {
        throw 'TODO: FsZip.stat not implemented'
    }

    login(server?: string, credentials?: Credentials): Promise<void> {
        return Promise.resolve()
    }

    onList(dir: string): void {
        console.warn('FsZop.onList not implemented')
    }

    async list(dir: string, watchDir = false, transferId = -1): Promise<FileDescriptor[]> {
        const entries = await this.zip.getEntries(dir)
        const list = entries.map((entry) => this.zip.getFileDescriptor(entry))
        console.log(list)
        return list
    }

    isRoot(path: string): boolean {
        return !!path.match(isRoot)
    }

    off(): void {
        this.zip.close()
    }

    getStream(path: string, file: string, transferId = -1): Promise<NodeJS.ReadableStream> {
        return this.zip.getFileStream(this.join(path, file))
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
        readonly: true,
        indirect: true,
    },
    canread(basePath: string, subPath: string): boolean {
        const fullPath = path.join(basePath, subPath)
        const matches = fullPath.match(/\.zip/gi)

        return matches && matches.length === 1
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
