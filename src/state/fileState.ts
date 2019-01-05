import { observable, action, runInAction } from "mobx";
import { FsApi, Fs, getFS, File, ICredentials } from "../services/Fs";
import { Deferred } from '../utils/deferred';
import i18next from '../locale/i18n';

type TStatus = 'blank' | 'busy' | 'ok' | 'login' | 'offline';

export class FileState {
    /* observable properties start here */
    @observable
    path: string = '';

    previousPath: string;

    readonly files = observable<File>([]);

    readonly selected = observable<File>([]);

    @observable
    server: string = '';

    credentials: ICredentials;

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

        this.current = newCurrent;

        const path = history[current + dir];
        console.log('opening path from history', path);

        this.cd(path, '', true);
    }
    // /history

    /* fs API */
    private api: FsApi;
    private fs: Fs;
    private prevFs: Fs;
    private prevApi: FsApi;
    private prevServer: string;

    private loginDefer: Deferred<any>;

    constructor(path: string) {
        this.path = path;
        this.getNewFS(path);

        if (path) {
            this.cd(path);
        }
    }

    private saveContext() {
        this.prevServer = this.server;
        this.prevApi = this.api;
        this.prevFs = this.fs;
    }

    private restoreContext() {
        this.api = this.prevApi;
        this.fs = this.prevFs;
        this.server = this.prevServer;
    }

    private getNewFS(path: string, skipContext = false): Fs {
        let newfs = getFS(path);

        if (newfs) {
            // free exiting api
            if (this.api) {
                this.api.free();
            }

            !skipContext && this.saveContext();

            this.fs = newfs;
            this.api = new newfs.API(path);
            this.api.on('close', () => this.setStatus('offline'))
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
        // first revert fs/path
        this.restoreContext();
        // only reload directory if connection hasn't been lost otherwise we enter
        // into an infinite loop
        if (this.api.isConnected()) {
            this.navHistory(0);
            this.status = 'ok';
        }
    }

    @action
    waitForConnection() {
        if (!this.api.isConnected()) {
            this.loginDefer = new Deferred();

            // automatially reconnect if we got credentials
            if (this.api.loginOptions) {
                this.doLogin();
            } else {
                // otherwise show login dialog
                this.status = 'login';
            }

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
        console.log('cd', path, this.path);

        if (this.path !== path) {
            if (this.getNewFS(path, skipHistory)) {
                this.server = this.fs.serverpart(path);
                this.credentials = this.fs.credentials(path);
            } else {
                this.navHistory(0);
                return Promise.reject({
                    message: i18next.t('ERRORS.CANNOT_READ_FOLDER', { folder: path }),
                    code: 'NO_FS'
                });
            }
        }

        try {
            await this.waitForConnection();
        } catch (err) {
            return this.cd(path, path2, true);
        }

        const joint = path2 ? this.api.join(path, path2) : this.api.sanityze(path);
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
    onLoginSuccess() {
        this.status = 'ok';
        this.loginDefer.resolve();
    }

    @action
    doLogin(server?:string, credentials?:ICredentials) {
        console.log('logging in');
        // this.status = 'busy';
        if (server) {
            this.server = this.fs.serverpart(server);
        }

        this.api.login(server, credentials).then(() => this.onLoginSuccess()).catch((err) => {
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
        // this.cd(this.path);
        this.navHistory(0);
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