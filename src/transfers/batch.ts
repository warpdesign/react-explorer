import { observable, action, runInAction } from "mobx";
import { FsApi, File } from "../services/Fs";
import { FileTransfer } from "./fileTransfer";
import { remote } from 'electron';

export class Batch {
    static maxId: number = 0;
    public srcFs: FsApi;
    public dstFs: FsApi;
    public dstPath: string;
    public srcPath: string;
    public id: number;
    public srcName: string;
    public dstName: string;

    @observable
    public size: number = 0;

    public files = observable<FileTransfer>([]);

    @observable
    public status: 'started' | 'stopped' | 'error' | 'done' | 'calculating' = 'stopped';

    @observable
    public progress: number = 0;

    public isExpanded: boolean = false;

    constructor(srcFs: FsApi, dstFs: FsApi, srcPath: string, dstPath:string) {
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
    updateProgress() {
        runInAction(() => {
            this.progress += .01;
            remote.getCurrentWindow().setProgressBar(this.progress);
        });
    }

    @action
    calcTotalSize() {
        let size = 0;
        for (let fileTransfer of this.files) {
            size += fileTransfer.file.length;
        }
        this.size = size;
    }

    start() {

    }

    getLastPathPart(path: string) {
        const parts = path.split('/');
        const lastPart = parts[parts.length - 1];
        // return `… / ${lastPart}`;
        return lastPart;
    }

    async getFileList(srcFiles: File[], subDirectory = ''):Promise<FileTransfer[]> {
        console.log('getting file list');
        const dirs = srcFiles.filter((file) => file.isDir);
        const files = srcFiles.filter((file) => !file.isDir);
        let transfers:FileTransfer[] = [];

        // add files
        for (let file of files) {
            transfers.push({
                file,
                status: 'todo',
                progress: 0,
                subDirectory
            });
        }

        // dir: need to call list for each directry to get files
        for (let dir of dirs) {
            transfers.push({
                file: dir,
                status: 'todo',
                progress: 0,
                subDirectory
            });

            // get directory listing
            const currentPath = this.srcFs.join(dir.dir, dir.fullname);
            const subFiles = await this.srcFs.list(currentPath, false);
            const subDir = this.srcFs.join(subDirectory, dir.fullname);
            transfers = transfers.concat(await this.getFileList(subFiles, subDir));
        }

        return Promise.resolve(transfers);
    }

    @action
    async setFileList(files: File[]) {
        return this.getFileList(files).then((transfers) => {
            // get fileStat
            this.files.replace(transfers);
        }).catch((err) => {
            return Promise.reject(err);
        });
    }

    @action
    onData(file: File, bytesRead: number) {

    }
}