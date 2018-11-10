import { observable, action, runInAction } from "mobx";
import { FsApi, Fs, getFS, File } from "../services/Fs";
import * as cp from 'cpy';

export class FileState {
    /* observable properties start here */
    @observable
    path: string = '';

    previousPath: string;

    readonly files = observable<File>([]);

    readonly selected = observable<File>([]);

    @observable
    server: string = '';

    @observable
    status: 'blank' | 'busy' | 'ok' | 'login';

    @observable
    type: string;

    /* fs API */
    private api: FsApi;
    private fs: Fs;

    constructor(path: string) {
        this.path = path;
        this.getNewFS(path);
    }

    private getNewFS(path: string): void{
        let newfs = getFS(path);

        // free exiting api
        if (this.api) {
            this.api.free();
        }

        this.fs = newfs;
        this.api = new newfs.API(path);
    }

    @action
    private updatePath(path: string) {
        this.previousPath = this.path;
        this.path = path;
    }

    @action
    revertPath() {
        this.path = this.previousPath;
        this.status = 'ok';
    }

    @action
    // changes current path and retrieves file list
    cd(path: string, path2: string = '') {
        // first updates fs (eg. was local fs, is now ftp)
        if (this.path.substr(0, 1) !== path.substr(0, 1)) {
            this.getNewFS(path);
            this.server = this.fs.serverpart(path);
        }

        // then attempt to read directory ?
        if (!this.api.isConnected()) {
            this.status = 'login';

            this.updatePath(path);
        } else {
            const joint = path2 ? this.api.join(path, path2) : path;
            return this.api.cd(joint)
                .then((path) => {
                    this.updatePath(path);
                    return this.list(path);
                });
        }
    }

    @action
    login(user: string, password: string) {
        console.log('logging in');
        return this.api.login(user, password).then(() => {
            runInAction(() => {
                this.status = 'ok';
            })
        }).catch((err) => {
            console.log('error while connecting', err);
        });
    }

    @action
    list(path:string) {
        return this.api.list(path)
            .then((files: File[]) => {
                runInAction(() => {
                    console.log('run in actions', this.path);
                    this.files.replace(files);
                    // clear lister selection as well
                    this.selected.clear();
                });
            });
    }

    reload() {
        this.cd(this.path);
    }

    join(path: string, path2: string) {
        return this.api.join(path, path2);
    }

    rename(source: string, file: File, newName: string): Promise<string> {
        return this.api.rename(source, file, newName);
    }

    exists(path: string): Promise<boolean> {
        return this.api.exists(path);
    }

    makedir(parent: string, dirName: string): Promise<string> {
        return this.api.makedir(parent, dirName);
    }

    delete(source: string, files: File[]): Promise<number> {
        return this.api.delete(source, files);
    }

    copy(source: string, files: string[], dest: string): Promise<number> & cp.ProgressEmitter {
        return this.api.copy(source, files, dest);
    }

    isDirectoryNameValid = (dirName:string) => {
        return this.api.isDirectoryNameValid(dirName);
    }

    size(source: string, files: string[]): Promise<number> {
        return this.api.size(source, files);
    }

    get(path: string, file: string): Promise<string> {
        return this.api.get(path, file);
    }
}