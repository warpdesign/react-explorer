import { File, FsApi } from '../services/Fs'
import { LocalizedError } from '../locale/error'

export interface FileTransfer {
    file: File
    status: 'started' | 'cancelled' | 'error' | 'done' | 'queued'
    progress: number
    subDirectory: string
    newSub: string
    ready: boolean
    error?: LocalizedError
}

export interface TransferOptions {
    // source data
    files: File[]
    srcFs: FsApi
    srcPath: string

    // destination data
    dstFs: FsApi
    dstPath: string
    // not sure we still need this ?
    dstFsNaame: string
}
