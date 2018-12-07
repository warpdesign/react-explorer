import { observable, action, runInAction } from "mobx";
import { FsApi, Fs, getFS, File } from "../services/Fs";
import { Deferred } from '../utils/deferred';

type TStatus = 'blank' | 'busy' | 'ok' | 'login';

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
    status: TStatus;

    @observable
    type: string;

    // history stuff
    history = observable<string>([]);
    @observable
    current: number = -1;

    @action
    setStatus(status: TStatus) {
        this.status = status;
    }

    @action
    addPathToHistory(path: string) {
        const keep = this.history.slice(0, this.current + 1);
        this.history.replace(keep.concat([path]));
        this.current++;
    }

    @action
    navHistory(dir = -1) {
        const history = this.history;
        const current = this.current;
        const length = history.length;
        let newCurrent = current + dir;

        if (newCurrent < 0) {
            newCurrent = 0;
        } else if (newCurrent >= length) {
            newCurrent = length - 1;
        }

        // console.log('nav history', current, '=>', newCurrent);

        this.current = newCurrent;

        const path = history[current + dir];
        console.log('opening path from history', path);
        this.cd(path, '', true);
    }
    // /history

    /* fs API */
    private api: FsApi;
    private fs: Fs;

    private loginDefer: Deferred<any>;

    constructor(path: string) {
        this.path = path;
        this.getNewFS(path);

        if (path) {
            this.cd(path);
        }
    }

    private getNewFS(path: string): Fs {
        let newfs = getFS(path);

        if (newfs) {
            // free exiting api
            if (this.api) {
                this.api.free();
            }

            this.fs = newfs;
            this.api = new newfs.API(path);
        }

        return newfs;
    }

    public getAPI(): FsApi {
        return this.api;
    }

    public getFS(): Fs {
        return this.fs;
    }

    @action
    private updatePath(path: string, skipHistory = false) {
        this.previousPath = this.path;
        this.path = path;

        if (!skipHistory && this.status !== 'login') {
            this.addPathToHistory(path);
        }
    }

    @action
    revertPath() {
        this.navHistory(0);
        this.status = 'ok';
    }

    @action
    waitForConnection() {
        if (!this.api.isConnected()) {
            this.status = 'login';
            this.loginDefer = new Deferred();

            return this.loginDefer.promise;
        } else {
            this.status = 'busy';
            return Promise.resolve();
        }
    }

    @action
    // changes current path and retrieves file list
    async cd(path: string, path2: string = '', skipHistory = false): Promise<string> {
        // first updates fs (eg. was local fs, is now ftp)
        // if (this.path.substr(0, 1) !== path.substr(0, 1)) {
        console.log('cd', path, this.path);

        if (this.path.split('/')[0] !== path.split('/')[0]) {
            if (this.getNewFS(path)) {
                this.server = this.fs.serverpart(path);
            } else {
                this.navHistory(0);
                return Promise.reject(`Cannot open ${path}`);
            }
        }

        try {
            await this.waitForConnection();
        } catch (err) {
            return this.cd(path, path2, skipHistory);
        }

        const joint = path2 ? this.api.join(path, path2) : path;
        return this.api.cd(joint)
            .then((path) => {
                this.updatePath(path, skipHistory);
                return this.list(path).then(() => path);
            })
            .catch((err) => {
                console.log('path not valid ?', joint, 'restoring previous path');
                this.navHistory(0);
                return Promise.reject(err);
            });
    }

    @action
    doLogin(user: string, password: string, port: number) {
        console.log('logging in');
        this.api.login(user, password, port).then(() => {
            runInAction(() => {
                this.status = 'ok';
                this.loginDefer.resolve();
            });
        }).catch((err) => {
            console.log('error while connecting', err);
            this.loginDefer.reject(err);
        });

        return this.loginDefer.promise;
    }

    @action
    async list(path: string, appendParent?:boolean):Promise<File[]> {
        try {
            await this.waitForConnection();
        } catch (err) {
            return this.list(path, appendParent);
        }

        return this.api.list(path, appendParent)
            .then((files: File[]) => {
                runInAction(() => {
                    console.log('run in actions', this.path);
                    this.files.replace(files);
                    // clear lister selection as well
                    this.selected.clear();
                    // TODO: sync caches ?

                    this.status = 'ok';
                });

                return files;
            });
    }

    reload() {
        this.cd(this.path);
    }

    join(path: string, path2: string) {
        return this.api.join(path, path2);
    }

    async rename(source: string, file: File, newName: string): Promise<string> {
        try {
            await this.waitForConnection();
        } catch (err) {
            return this.rename(source, file, newName);
        }

        return this.api.rename(source, file, newName).then((newName:string) => {
            runInAction(() => {
                this.status = 'ok';
            });

            return newName;
        })
    }

    async isDir(path: string): Promise<boolean> {
        await this.waitForConnection();
        return this.api.isDir(path);
    }

    async exists(path: string): Promise<boolean> {
        await this.waitForConnection();
        return this.api.exists(path);
    }

    async makedir(parent: string, dirName: string): Promise<string> {
        try {
            await this.waitForConnection();
        } catch (err) {
            return this.makedir(parent, dirName);
        }

        return this.api.makedir(parent, dirName).then((newDir) => {
            runInAction(() => {
                this.status = 'ok';
            });

            return newDir;
        });
    }

    async delete(source: string, files: File[]): Promise<number> {
        try {
            await this.waitForConnection();
        } catch (err) {
            return this.delete(source, files);
        }

        return this.api.delete(source, files).then((num) => {
            runInAction(() => {
                this.status = 'ok';
            });

            return num;
        });
    }

    // copy(source: string, files: string[], dest: string): Promise<number> & cp.ProgressEmitter {
    //     return this.api.copy(source, files, dest);
    // }

    isDirectoryNameValid = (dirName:string) => {
        return this.api.isDirectoryNameValid(dirName);
    }

    async size(source: string, files: string[]): Promise<number> {
        try {
            await this.waitForConnection();
        } catch (err) {
            return this.size(source, files);
        }

        return this.api.size(source, files);
    }

    async get(path: string, file: string): Promise<string> {
        try {
            await this.waitForConnection();
        } catch (err) {
            return this.get(path, file);
        }

        return this.api.get(path, file).then((path) => {
            this.status = 'ok';
            return path;
        });
    }
}