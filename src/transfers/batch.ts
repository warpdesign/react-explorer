import { observable, action, runInAction, computed } from "mobx";
import { FsApi, File } from "../services/Fs";
import { FileTransfer } from "./fileTransfer";
import { Deferred } from "../utils/deferred";
import { getLocalizedError } from "../locale/error";
import { Readable } from "stream";
import { getSelectionRange } from "../utils/fileUtils";

const MAX_TRANSFERS = 2;
const MAX_ERRORS = 5;
const RENAME_SUFFIX = '_';

type Status = 'started' | 'queued' | 'error' | 'done' | 'cancelled' | 'calculating';

export class Batch {
    static maxId: number = 1;
    public srcFs: FsApi;
    public dstFs: FsApi;
    public dstPath: string;
    public srcPath: string;
    public id: number;
    public srcName: string;
    public dstName: string;
    public startDate: Date = new Date();
    public errors = 0;

    @observable
    public size: number = 0;

    public files = observable<FileTransfer>([]);

    public streams = new Array<Readable>();

    @observable
    public status: Status = 'queued';

    @observable
    public progress: number = 0;

    get isStarted(): boolean {
        return !this.status.match(/error|done/);
    }

    get hasEnded(): boolean {
        return !!this.status.match(/done|error/);
    }

    get numErrors(): number {
        return this.files.reduce((acc, val) => acc + ((val.error || val.status === 'cancelled') && 1 || 0), 0);
    }

    public isExpanded: boolean = false;

    private transferDef: Deferred<any>;

    private slotsAvailable: number = MAX_TRANSFERS;

    private transfersDone = 0;

    constructor(srcFs: FsApi, dstFs: FsApi, srcPath: string, dstPath: string) {
        this.status = 'calculating';
        this.srcFs = srcFs;
        this.dstFs = dstFs;
        this.dstPath = dstPath;
        this.srcPath = srcPath;
        // build batch src/dst names
        this.srcName = this.getLastPathPart(srcPath);
        this.dstName = this.getLastPathPart(dstPath);
        this.id = Batch.maxId++;
    }

    @action
    onEndTransfer = () => {
        // console.log('transfer ended ! duration=', Math.round((new Date().getTime() - this.startDate.getTime()) / 1000), 'sec(s)');
        // console.log('destroy batch, new maxId', Batch.maxId);
        this.status = 'done';
        return Promise.resolve(this.numErrors === 0);
    }

    @action
    start(): Promise<boolean> {
        console.log('starting batch');
        if (this.status === 'queued') {
            this.slotsAvailable = MAX_TRANSFERS;
            this.status = 'started';
            this.transferDef = new Deferred();

            this.startDate = new Date();
            this.queueNextTransfers();
        }

        // return this.transferDef.promise;
        return this.transferDef.promise.then(
            this.onEndTransfer
        ).catch((err: Error) => {
            console.log('error transfer', err);
            this.status = 'error';
            return Promise.reject(err);
        });
    }

    @action
    updatePendingTransfers(subDir: string, newFilename: string, cancel = false) {
        // TODO: escape '(' & ')' in subDir if needed
        const regExp = new RegExp('^(' + subDir + ')');
        const files = this.files.filter((file) => file.subDirectory.match(regExp) !== null);

        // destination directory for these files could not be created: we cancel these transfers
        if (cancel) {
            for (let file of files) {
                file.status = 'cancelled';
                this.transfersDone++;
            }
        } else {
            let newPrefix = '';
            // need to rename
            if (!subDir.match(new RegExp(newFilename + '$'))) {
                const parts = subDir.split('/');
                parts[parts.length - 1] = newFilename;
                newPrefix = parts.join('/');
            }

            for (let transfer of files) {
                // enable files inside this directory
                if (transfer.subDirectory === subDir) {
                    transfer.ready = true;
                }
                // for all files (ie. this directory & subdirectories)
                // rename this part if needed
                if (newPrefix) {
                    transfer.newSub = transfer.subDirectory.replace(regExp, newPrefix);
                }
            }
        }
    }

    getNextTransfer() {
        return this.files.find((file) => file.ready && file.status === 'queued');
    }

    /**
     * Gets the next transfer(s) and starts them, where:
     * num transfers = min(MAX_TRANSFERS, slotsAvailable)
     * 
     */
    queueNextTransfers() {
        const max = (Math.min(MAX_TRANSFERS, this.slotsAvailable));

        for (let i = 0; i < max; ++i) {
            const transfer = this.getNextTransfer();
            if (transfer) {
                this.startTransfer(transfer);
            }
        }
    }

    @action
    onTransferError = (transfer: FileTransfer, err: any) => {
        // console.log('transfer error', transfer.file.fullname, err);
        transfer.status = 'error';
        transfer.error = getLocalizedError(err);
        this.errors++;
        // return this.transferDef.reject(err);
    }

    removeStream(stream: Readable) {
        const index = this.streams.findIndex(item => item === stream);
        if (index > -1) {
            this.streams.splice(index, 1);
        }
    }

    @action
    /**
     * Immediately initiates a file transfer, queues the next transfer when it's done
     */
    async startTransfer(transfer: FileTransfer) {
        this.slotsAvailable--;
        transfer.status = 'started';

        const dstFs = this.dstFs;
        const srcFs = this.srcFs;
        const fullDstPath = dstFs.join(this.dstPath, transfer.newSub);
        const srcPath = srcFs.join(this.srcPath, transfer.subDirectory);
        const wantedName = transfer.file.fullname;

        let newFilename = '';
        let stream = null;

        try {
            newFilename = await this.renameOrCreateDir(transfer, fullDstPath);
            transfer.status = 'done';
        } catch (err) {
            console.log('error creating directory', err);
            this.onTransferError(transfer, err);
        }

        if (this.status === 'cancelled') {
            console.warn('startTransfer while cancelled (1)');
        }

        if (!transfer.file.isDir) {
            try {
                // console.log('getting stream', srcPath, wantedName);
                stream = await srcFs.getStream(srcPath, wantedName, this.id);

                this.streams.push(stream);
                // console.log('sending to stream', dstFs.join(fullDstPath, newFilename));
                // we have to listen for errors that may appear during the transfer: socket closed, timeout,...
                // and throw an error in this case because the putStream won't throw in this case:
                // it will just stall
                // stream.on('error', (err) => {
                //     console.log('error on read stream');
                //     this.onTransferError(transfer, err);
                //     // destroy stream so that put stream resolves ?
                //     stream.destroy();
                // });

                await dstFs.putStream(stream, dstFs.join(fullDstPath, newFilename), (bytesRead: number) => {
                    this.onData(transfer, bytesRead);
                }, this.id);

                this.removeStream(stream);
                transfer.status = 'done';
            } catch (err) {
                // TODO: catch batch cancel ?
                console.log('error with streams', err);
                this.removeStream(stream);
                // transfer.status = 'error';
                // return Promise.reject(err);
                // generate transfer error, but do not stop transfer unless errors > MAX_TRANSFER_ERRORS
                // TODO: transfer.errors++
                // if (transfer.errors > MAX) {
                // set remaining transfers to cancel
                // return ?
                //}
                this.onTransferError(transfer, err);
                if (this.errors > MAX_ERRORS) {
                    console.warn('maximum errors occurred: cancelling upcoming file transfers');
                    this.status = 'error';
                    this.cancelFiles();
                }
            }

        } else {
            // make transfers with this directory ready
            this.updatePendingTransfers(srcFs.join(transfer.subDirectory, wantedName), newFilename, (transfer as FileTransfer).status !== 'done');
        }

        if (this.status === 'cancelled') {
            console.warn('startTransfer while cancelled (2)');
        }

        this.transfersDone++;
        this.slotsAvailable++;
        // console.log('finished', transfer.file.fullname, 'slotsAvailable', this.slotsAvailable, 'done', this.transfersDone);
        if (this.status !== 'error' && this.transfersDone < this.files.length) {
            this.queueNextTransfers();
        } else {
            for (let transfer of this.files) {
                console.log(transfer.status, transfer);
            }
            // console.log('no more transfers !!');
            if (this.numErrors === this.files.length) {
                for (let transfer of this.files) {
                    console.log(transfer.status, transfer.file.fullname, transfer);
                }

                this.transferDef.reject({
                    code: ''
                });
            } else {
                for (let transfer of this.files) {
                    console.log(transfer.status, transfer.file.fullname, transfer);
                }

                this.transferDef.resolve();
            }
        }
    }

    // TODO: do not infinite loop if directory cannot be created
    // if not, reject and then we should set each file found inside
    // that directory to error
    async renameOrCreateDir(transfer: FileTransfer, dstPath: string): Promise<string> {
        const isDir = transfer.file.isDir;
        const dstFs = this.dstFs;
        // create directory if not exists
        const wantedName = transfer.file.fullname;
        let dirPath = dstFs.join(dstPath, wantedName);
        let newName = wantedName;
        let stats = null;
        let exists = false;

        try {
            stats = await this.dstFs.stat(dirPath, this.id);
            exists = true;
        } catch (err) {
            // TODO: handle permission denied and other errors ?
            exists = false;
        }

        let i = 1;

        // create directory if needed
        if (isDir) {
            // directory already exists: for now, simply use it
            if (!exists) {
                try {
                    const newDir = await dstFs.makedir(dstPath, newName, this.id);
                } catch (err) {
                    return Promise.reject(err);
                }
            } else if (!stats.isDir) {
                // exists but is a file: attempt to create a directory with newName
                let success = false;
                while (!success && this.status !== 'cancelled') {
                    newName = wantedName + RENAME_SUFFIX + i++;
                    try {
                        await dstFs.makedir(dstPath, newName, this.id);
                        success = true;
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }
            }
        } else {
            if (exists) {
                newName = await this.getNewName(wantedName, dstPath);
            }
        }

        return Promise.resolve(newName);
    }

    async getNewName(wantedName: string, path: string): Promise<string> {
        let i = 1;
        let exists = true;
        let newName = wantedName;

        // put suffix before the extension, so foo.txt will be renamed foo_1.txt to preserve the extension
        // TODO: avoid endless loop, give up after max tries
        while (exists) {
            const range = getSelectionRange(wantedName);
            const prefix = wantedName.startsWith('.') ? wantedName : wantedName.substring(range.start, range.length);
            const suffix = wantedName.startsWith('.') ? '' : wantedName.substring(range.length);

            newName = prefix + RENAME_SUFFIX + i++ + suffix;

            const tmpPath = this.dstFs.join(this.dstPath, newName);
            try {
                exists = await this.dstFs.exists(tmpPath, this.id);
            } catch (err) {
                debugger;
                exists = false;
            }
        }

        return Promise.resolve(newName);
    }

    @action
    cancelFiles() {
        const todo = this.files.filter(file => !!file.status.match(/queued/));

        for (let file of todo) {
            file.status = 'cancelled';
        }
    }

    @action
    destroyRunningStreams() {
        for (let stream of this.streams) {
            stream.destroy();
        }
    }

    @action
    cancel() {
        if (this.status !== 'done') {
            this.status = 'cancelled';
            this.cancelFiles();
            this.destroyRunningStreams();
        }
        // otherwise there is nothing to do
    }

    @action
    calcTotalSize() {
        let size = 0;
        for (let fileTransfer of this.files) {
            // directory's length is the space used for dir meta data: we don't need (nor copy) that
            if (!fileTransfer.file.isDir) {
                size += fileTransfer.file.length;
            }
        }
        this.size = size;
    }

    getLastPathPart(path: string) {
        const parts = path.split('/');
        const lastPart = parts[parts.length - 1];
        // return `… / ${lastPart}`;
        return lastPart;
    }

    async getFileList(srcFiles: File[], subDirectory = ''): Promise<FileTransfer[]> {
        // console.log('getting file list');
        const dirs = srcFiles.filter((file) => file.isDir);
        const files = srcFiles.filter((file) => !file.isDir);
        let transfers: FileTransfer[] = [];

        // add files
        for (let file of files) {
            transfers.push({
                file,
                status: 'queued',
                progress: 0,
                subDirectory,
                newSub: subDirectory,
                ready: subDirectory === ''
            });
        }

        // dir: need to call list for each directry to get files
        for (let dir of dirs) {
            const transfer: FileTransfer = {
                file: dir,
                status: 'queued',
                progress: 0,
                subDirectory,
                newSub: subDirectory,
                ready: subDirectory === ''
            };

            transfers.push(transfer);

            // get directory listing
            const currentPath = this.srcFs.join(dir.dir, dir.fullname);
            // note: this is needed for FTP only: since Ftp.list(path) has to ignore the path
            // and lists the contents of the CWD (which is changed by calling Ftp.cd())
            let subFiles: File[] = null;
            // /note
            try {
                await this.srcFs.cd(currentPath);
                subFiles = await this.srcFs.list(currentPath);
                const subDir = this.srcFs.join(subDirectory, dir.fullname);
                transfers = transfers.concat(await this.getFileList(subFiles, subDir));
            } catch (err) {
                // TODO: set the transfer to error/skip
                // then, simply skip it when doing the transfer
                this.onTransferError(transfer, { code: 'ENOENT' });
                this.transfersDone++;
                console.log('could not get directory content for', currentPath);
                console.log('directory was still added to transfer list for consistency');
            }
        }

        return Promise.resolve(transfers);
    }

    @action
    async setFileList(files: File[]) {
        return this.getFileList(files).then((transfers) => {
            console.log('got files', transfers);
            this.files.replace(transfers);
        }).catch((err) => {
            return Promise.reject(err);
        });
    }

    @action
    onData(file: FileTransfer, bytesRead: number) {
        // console.log('dataThrottled', bytesRead);
        const previousProgress = file.progress;
        file.progress = bytesRead;
        this.progress += previousProgress ? (bytesRead - previousProgress) : bytesRead;
        // console.log('progress', this.progress, this.progress === this.size ? -1 : this.progress/this.size);
        // remote.getCurrentWindow().setProgressBar(this.progress === this.size ? -1 : this.progress / this.size);
    }
}