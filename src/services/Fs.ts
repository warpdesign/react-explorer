/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Readable } from 'stream'

import { isWin } from '$src/utils/platform'
import { BigIntStats } from 'fs'

const interfaces: Array<Fs> = []

export interface Credentials {
    user?: string
    password?: string
    port?: number
}

export function registerFs(fs: Fs): void {
    interfaces.push(fs)
}

export type FileID = string

export interface FileDescriptor {
    dir: string
    name: string
    fullname: string
    extension: string
    target: string | Buffer
    cDate: Date
    mDate: Date
    bDate: Date
    length: number
    mode: number
    isDir: boolean
    readonly: boolean
    type: FileType
    isSym: boolean
    id: FileID
}

export interface FsOptions {
    needsRefresh: boolean
}

export interface Fs {
    // runtime api
    API: new (path: string, onFsChange: (filename: string) => void) => FsApi
    // static members
    canread(str: string): boolean
    serverpart(str: string): string
    credentials(str: string): Credentials
    displaypath(str: string): { fullPath: string; shortPath: string }
    name: string
    description: string
    icon: string
    options: FsOptions
}

export const Extensions: { [index: string]: RegExp } = {
    exe: /\.([\.]*(exe|bat|com|msi|mui|cmd|sh))+$/,
    img: /\.([\.]*(png|jpeg|jpg|gif|pcx|tiff|raw|webp|svg|heif|bmp|ilbm|iff|lbm|ppm|pgw|pbm|pnm|psd))+$/,
    arc: /\.([\.]*(zip|tar|rar|7zip|7z|dmg|shar|ar|bz2|lz|gz|tgz|lha|lzh|lzx|sz|xz|z|s7z|ace|apk|arp|arj|cab|car|cfs|cso|dar|iso|ice|jar|pak|sea|sfx|sit|sitx|lzma|war|xar|zoo|zipx|img|adf|dms|dmz))+$/,
    snd: /\.([\.]*(mp3|wav|mp2|ogg|aac|aiff|mod|flac|m4a|mpc|oga|opus|ra|rm|vox|wma|8svx))+$/,
    vid: /\.([\.]*(webm|avi|mpeg|mpg|mp4|mov|mkv|qt|wmv|vob|ogb|m4v|m4p|asf|mts|m2ts|3gp|flv|anim))+$/,
    cod: /\.([\.]*(json|js|cpp|c|cxx|java|rb|s|tsx|ts|jsx|lua|as|coffee|ps1|py|r|rexx|spt|sptd|go|rs|sh|bash|vbs|cljs))+$/,
    doc: /\.([\.]*(log|last|css|htm|html|rtf|doc|pdf|docx|txt|md|1st|asc|epub|xhtml|xml|amigaguide|info))+$/,
}
export const ExeMaskAll = 0o0001
export const ExeMaskGroup = 0o0010
export const ExeMaskUser = 0o0100

export type FileType = 'exe' | 'img' | 'arc' | 'snd' | 'vid' | 'doc' | 'cod' | ''

export function MakeId(stats: Partial<BigIntStats>, fullpath: string): FileID {
    return stats.ino > 1n ? `${stats.ino}-${stats.dev}` : `${stats.ino}-${stats.dev}-${fullpath}`
}

function isModeExe(mode: number, gid: number, uid: number): boolean {
    if (isWin || mode === -1) {
        return false
    }

    const isGroup = gid ? process.getgid && gid === process.getgid() : false
    const isUser = uid ? process.getuid && uid === process.getuid() : false

    return !!(mode & ExeMaskAll || (mode & ExeMaskUser && isGroup) || (mode & ExeMaskGroup && isUser))
}

export function filetype(mode: number, gid: number, uid: number, extension: string): FileType {
    if (isModeExe(mode, gid, uid) || extension.match(Extensions.exe)) {
        return 'exe'
    } else if (extension.match(Extensions.img)) {
        return 'img'
    } else if (extension.match(Extensions.arc)) {
        return 'arc'
    } else if (extension.match(Extensions.snd)) {
        return 'snd'
    } else if (extension.match(Extensions.vid)) {
        return 'vid'
    } else if (extension.match(Extensions.doc)) {
        return 'doc'
    } else if (extension.match(Extensions.cod)) {
        return 'cod'
    } else {
        return ''
    }
}

export interface FsApi {
    // public API
    // async methods that may require server access
    list(dir: string, watchDir?: boolean, transferId?: number): Promise<FileDescriptor[]>
    cd(path: string, transferId?: number): Promise<string>
    delete(parent: string, files: FileDescriptor[], transferId?: number): Promise<number>
    makedir(parent: string, name: string, transferId?: number): Promise<string>
    rename(parent: string, file: FileDescriptor, name: string, transferId?: number): Promise<string>
    stat(path: string, transferId?: number): Promise<FileDescriptor>
    isDir(path: string, transferId?: number): Promise<boolean>
    exists(path: string, transferId?: number): Promise<boolean>
    size(source: string, files: string[], transferId?: number): Promise<number>
    makeSymlink(targetPath: string, path: string, transferId?: number): Promise<boolean>
    getStream(path: string, file: string, transferId?: number): Promise<Readable>
    putStream(
        readStream: Readable,
        dstPath: string,
        progress: (bytesRead: number) => void,
        transferId?: number,
    ): Promise<void>
    getParentTree(dir: string): Array<{ dir: string; fullname: string }>
    resolve(path: string): string
    sanityze(path: string): string
    join(...paths: string[]): string
    login(server?: string, credentials?: Credentials): Promise<void>
    isConnected(): boolean
    isDirectoryNameValid(dirName: string): boolean
    isRoot(path: string): boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: (data: any) => void): void
    off(): void
    loginOptions: Credentials
}

export function getFS(path: string): Fs {
    const newfs = interfaces.find((filesystem) => filesystem.canread(path))
    // if (!newfs) {
    //     newfs = FsGeneric;
    // `

    return newfs
}

export const withConnection = (method: (...args: any[]) => any, waitForConnection: () => any, retries = 2) => {
    const retry_fn = async (...args: any[]) => {
        try {
            await waitForConnection()
            return method(...args)
        } catch (e) {
            debugger
            console.log('withConnection error', { e })
        }
    }

    return retry_fn
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function needsConnection(target: any, key: any, descriptor: any) {
    // save a reference to the original method this way we keep the values currently in the
    // descriptor and don't overwrite what another decorator might have done to the descriptor.
    if (descriptor === undefined) {
        descriptor = Object.getOwnPropertyDescriptor(target, key)
    }
    const originalMethod = descriptor.value

    //editing the descriptor/value parameter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function decorator(...args: any) {
        try {
            await this.waitForConnection()
        } catch (err) {
            console.log(err)
            // TODO: do not recall decorator if no internet
            debugger
            return decorator.apply(this, args)
        }

        return originalMethod.apply(this, args)
    }

    // return edited descriptor as opposed to overwriting the descriptor
    return descriptor
}

export function sameID(id1: FileID, id2: FileID): boolean {
    return id1 === id2
}

// in test environment, load the generic fs as first one
// registerFs(FsFtp);
// registerFs(FsSimpleFtp);
