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
    public files = observable<FileTransfer>([]);

    @observable
    public status: 'started' | 'stopped' | 'error' | 'done' | 'calculating' = 'stopped';

    @observable
    public progress: number = 0;

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
    setProgress() {
        runInAction(() => {
            this.progress += .01;
            remote.getCurrentWindow().setProgressBar(this.progress);
        });
    }

    getLastPathPart(path: string) {
        const parts = path.split('/');
        const lastPart = parts[parts.length - 1];
        // return `… / ${lastPart}`;
        return lastPart;
    }

    async getFileList(srcFiles: File[]):Promise<FileTransfer[]> {
        console.log('getting file list');
        const dirs = srcFiles.filter((file) => file.isDir);
        const files = srcFiles.filter((file) => !file.isDir);
        let transfers:FileTransfer[] = [];

        // add files
        for (let file of files) {
            transfers.push({
                file, status: 'todo', progress: 0
            });
        }

        // dir: need to call list for each directry to get files
        for (let dir of dirs) {
            transfers.push({
                file: dir, status: 'todo', progress: 0
            });

            // get directory listing
            // TODO: join directory ??
            debugger;
            const currentPath = this.srcFs.join(dir.dir, dir.fullname);
            const subFiles = await this.srcFs.list(currentPath, false);

            transfers = transfers.concat(await this.getFileList(subFiles));
        }

        return Promise.resolve(transfers);
    }

    @action
    async setFileList(files: File[]) {
        return this.getFileList(files).then((transfers) => {
            debugger;
            // get fileStat
            this.files.replace(transfers);
        }).catch((err) => {
            debugger;
            return Promise.reject(err);
        });
    }

    @action
    onData(file: File, bytesRead: number) {

    }
}