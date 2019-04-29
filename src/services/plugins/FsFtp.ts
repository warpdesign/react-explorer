import { FsApi, File, ICredentials, Fs, Parent, filetype } from '../Fs';
import * as ftp from 'ftp';
import * as path from 'path';
import * as fs from 'fs';
import { Transform } from 'stream';
import { remote } from 'electron';
import { throttle } from '../../utils/throttle';
import { Logger, JSObject } from "../../components/Log";
import { EventEmitter } from 'events';
import { isWin } from '../../utils/platform';
import * as nodePath from 'path';

const FtpUrl = /^(ftp\:\/\/)*(ftp\.[a-z]+\.[a-z]{2,3}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/i;
const ServerPart = /^(ftp\:\/\/)*(ftp\.[a-z]+\.[a-z]{2,3}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i;
const invalidChars = /^[\.]+$/ig;
const TMP_DIR = remote.app.getPath('downloads');

function join(path1: string, path2: string) {
    let prefix = '';

    if (path1.match(/^ftp:\/\//)) {
        prefix = 'ftp://';
        path1 = path1.replace('ftp://', '');
    }

    // since under Windows path.join will use '\' as separator
    // we replace it with '/'
    if (isWin) {
        return prefix + path.join(path1, path2).replace(/\\/g, '/');
    } else {
        return prefix + path.join(path1, path2);
    }
}

class Client {
    private client: any;
    public connected: boolean;
    public host: string;
    public status: 'busy' | 'ready' | 'offline' = 'offline';
    public api: FtpAPI = null;
    public options: ICredentials;

    private readyResolve: () => any;
    private readyReject: (err: any) => any;
    private readyPromise: Promise<any>;
    private previousError: any;

    static clients: Array<Client> = [];

    static addClient(hostname: string, options: any = {}) {
        const client = new Client(hostname, options);

        Client.clients.push(client);

        return client;
    }

    private instanceId = 0;
    static id = 0;

    // TODO: return promise if client is not connected ??
    static getFreeClient(hostname: string) {
        let client = Client.clients.find((client) => client.host === hostname && !client.api
            && client.status === 'ready');

        if (!client) {
            client = Client.addClient(hostname, {});
        } else {
            console.log('using existing client');
        }

        return client;
    }

    constructor(host: string, options: any = {}) {
        console.log('creating ftp client');
        this.instanceId = Client.id++;
        this.host = host;
        this.connected = false;
        this.client = new ftp();
        this.bindEvents();
    }

    getLoggerArgs(params: (string | number | boolean | JSObject)[]): (string | number | boolean | JSObject)[] {
        // append host and client instance
        return [`[${this.host}:${this.instanceId}]`, ...params];
    }

    success(...params: (string | number | boolean | JSObject)[]) {
        Logger.success(...this.getLoggerArgs(params));
    }

    log(...params: (string | number | boolean | JSObject)[]) {
        Logger.log(...this.getLoggerArgs(params));
    }

    warn(...params: (string | number | boolean | JSObject)[]) {
        Logger.warn(...this.getLoggerArgs(params));
    }

    error(...params: (string | number | boolean | JSObject)[]) {
        Logger.error(...this.getLoggerArgs(params));
    }

    public login(options: ICredentials): Promise<any> {
        if (!this.connected) {
            this.log('connecting to', this.host, 'with options', Object.assign({ host: this.host, ...options }, { password: '****' }));
            this.options = options;
            this.readyPromise = new Promise((resolve, reject) => {
                this.readyResolve = resolve;
                this.readyReject = reject;
                this.client.connect({ host: this.host, ...options, debug: window.console.log });
            });
        }

        return this.readyPromise;
    }

    private bindEvents() {
        this.client.on('ready', this.onReady.bind(this));
        this.client.on('error', this.onError.bind(this));
        this.client.on('close', this.onClose.bind(this));
        this.client.on('greeting', this.onGreeting.bind(this));
    }

    private onReady() {
        this.success('ready, setting transfer mode to binary');
        this.client.binary((err: Error) => {
            if (err) {
                this.warn('could not set transfer mode to binary');
            }
            this.readyResolve();
            this.status = 'ready';
            this.connected = true;
        });
    }

    private onClose() {
        this.warn('close');
        this.connected = false;
        this.status = 'offline';

        if (this.api) {
            this.api.onClose();
        }
    }

    private goOffline(error: any) {
        this.status = 'offline';
        if (this.readyReject) {
            this.readyReject(error);
        }
    }

    private onError(error: any) {
        this.log(typeof error.code);
        this.error('onError', `${error.code}: ${error.message}`);
        switch (error.code) {
            // 500 series: command not accepted
            // user not logged in (user limit may be reached too)
            case 530:
            case 'ENOTFOUND':
            case 'ECONNREFUSED':
                this.goOffline(error);
                break;

            case 550:
                // is also returned when attempting to get the size of a directory
                console.error('Requested action not taken. File unavailable, not found, not accessible');
                break;

            case 421:
                // service not available: control connection closed
                console.error('Service not available, closing connection');
                this.client.close();
                this.goOffline(error);
                break;

            case 'ETIMEDOUT':
                debugger;
                break;

            default:
                // sometimes error.code is undefined or is a string (!!)
                this.warn('unhandled error code:', error.code);
                if (error && error.match(/Timeout/)) {
                    this.warn('Connection timeout ?');
                }
                break;
        }

        this.previousError = error;
    }

    private onGreeting(greeting: string) {
        for (let line of greeting.split('\n')) {
            this.log(line);
        }
    }

    public list(path: string, appendParent = true): Promise<File[]> {
        this.status = 'busy';

        this.log('list', path);
        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);
            // Note: since node-ftp only supports the LIST cmd and
            // some servers do not implement "LIST path" when path
            // contains a space we send an empty path so list uses
            // the CWD (and "CWD path") has no problems with a path
            // containing a space
            //
            // We could also use MLSD instead but unfortunately it's
            // not implemented in node-ftp
            // see: https://github.com/warpdesign/react-ftp/wiki/FTP-LIST-command
            this.client.list("", (err: Error, list: any[]) => {
                this.status = 'ready';

                if (err) {
                    this.error('error calling list for', newpath);
                    reject(err);
                } else {
                    const files: File[] = list.filter((ftpFile) => !ftpFile.name.match(/^[\.]{1,2}$/)).map((ftpFile) => {
                        const format = nodePath.parse(ftpFile.name);
                        const ext = format.ext.toLowerCase();

                        const file: File = {
                            dir: path,
                            name: ftpFile.name,
                            fullname: ftpFile.name,
                            isDir: ftpFile.type === 'd',
                            length: parseInt(ftpFile.size, 10),
                            cDate: new Date(ftpFile.date),
                            mDate: new Date(ftpFile.date),
                            extension: '',
                            mode: 0,
                            readonly: false,
                            type: ftpFile.type !== 'd' && filetype(0, ext) || '',
                            isSym: false
                        };
                        return file;
                    });
                    // TODO: build list of files
                    /*
                        dir: string;
                        name: string;
                        fullname: string;
                        extension: string;
                        cDate: Date;
                        mDate: Date;
                        length: number;
                        mode: number;
                        isDir: boolean;
                        readonly: boolean;
                        */
                    if (appendParent && !this.api.isRoot(newpath)) {
                        const parent = { ...Parent, dir: path };

                        resolve([parent].concat(files));
                    } else {
                        resolve(files);
                    }
                }
            });
        });
    }

    public cd(path: string): Promise<string> {
        this.log('cd', path);
        return new Promise((resolve, reject) => {
            const oldPath = path;
            const newpath = this.pathpart(path);

            this.client.cwd(newpath, (err: any, dir: string) => {
                if (!err) {
                    // some ftp servers return windows-like paths
                    // when ran in windows
                    if (dir) {
                        dir = dir.replace(/\\/g, '/');
                    }
                    // const joint = join(this.host, (dir || newpath));
                    const joint = newpath === '/' ? join(oldPath, (dir || newpath)) : oldPath;
                    resolve(joint);
                } else {
                    reject(err);
                }
            });
        });
    }

    public pathpart(path: string): string {
        // we have to encode any % character other they may be
        // lost when calling decodeURIComponent
        try {
            const info = new URL(path.replace(/%/g, '%25'));
            return decodeURIComponent(info.pathname);
        } catch (err) {
            console.error('error getting pathpart for', path);
            return '';
        }

        // const pathPart = path.replace(ServerPart, '');
        // return pathPart;
    }

    public get(path: string, dest: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);
            this.log('downloading file', newpath, dest);
            this.client.get(newpath, (err: Error, readStream: fs.ReadStream) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('creating stream');
                    const writeStream = fs.createWriteStream(dest);
                    readStream.once('close', function () { resolve(dest); });
                    readStream.pipe(writeStream);
                    readStream.on('data', (chunk) => console.log('data', chunk.length));
                }
            });
        });
    }

    public getStream(path: string): Promise<fs.ReadStream> {
        this.status = 'busy';

        console.log('getting stream', path);

        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);

            this.client.get(newpath, (err: Error, readStream: fs.ReadStream) => {
                this.status = 'ready';

                if (err) {
                    reject(err);
                } else {
                    resolve(readStream);
                }
            });
        })
    }

    public putStream(readStream: fs.ReadStream, path: string, progress: (pourcent: number) => void): Promise<void> {
        this.status = 'busy';

        let bytesRead = 0;
        const throttledProgress = throttle(() => { progress(bytesRead) }, 800);

        readStream.once('close', function () { console.log('get ended!'); });
        const reportProgress = new Transform({
            transform(chunk, encoding, callback) {
                bytesRead += chunk.length;
                throttledProgress();
                console.log('data', bytesRead / 1024, 'Ko');
                callback(null, chunk);
            },
            highWaterMark: 16384 * 31
        });

        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);
            this.client.put(readStream.pipe(reportProgress), newpath, (err: Error) => {
                this.status = 'ready';

                if (err) {
                    reject(err);
                } else {
                    // readStream.once('close', () => resolve());
                    resolve();
                }
            });
        });
    }

    public rename(serverPath: string, oldName: string, newName: string): Promise<string> {
        const path = this.pathpart(serverPath);
        const oldPath = join(path, oldName);
        const newPath = join(path, newName);

        this.log('rename', oldPath, newPath);
        return new Promise((resolve, reject) => {
            return this.client.rename(oldPath, newPath, (err: any) => {
                if (!err) {
                    resolve(newName);
                } else {
                    reject({
                        oldName: oldName,
                        newName: newName,
                        code: err.code,
                        message: err.message
                    });
                }
            });
        });
    }

    public mkdir(parent: string, name: string): Promise<string> {
        const path = this.pathpart(parent);
        const newPath = join(path, name);

        this.log('mkdir', path, newPath);
        return new Promise((resolve, reject) => {
            this.client.mkdir(newPath, true, (err: Error) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(join(parent, name));
                }
            });
        });
    }

    public delete(ftpPath: string, isDir: boolean) {
        debugger;
        const path = this.pathpart(ftpPath);
        return new Promise((resolve, reject) => {
            if (isDir) {
                return this.client.rmdir(path, false, (err: Error) => {
                    if (err) {
                        debugger;
                        reject(err);
                    } else {
                        debugger;
                        resolve();
                    }
                });
            } else {
                this.client.delete(path, (err: Error) => {
                    if (err) {
                        debugger;
                        reject(err);
                    } else {
                        debugger;
                        resolve();
                    }
                });
            }
        });
    }

    // TODO: implement it using stat
    public stat(ftpPath: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                this.list(ftpPath);
                debugger;
                resolve(true);
            } catch (err) {
                debugger;
                reject(err);
            }
        });
    }

    public size(ftpPath: string): Promise<number> {
        const path = this.pathpart(ftpPath);
        return new Promise((resolve, reject) => {
            this.client.size(path, (err: Error, bytes: number) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(bytes)
                }
            });
        });
    }
}

class FtpAPI implements FsApi {
    type = 1;
    hostname = '';
    connected = false;
    // main client: the one which will issue list/cd commands *only*
    master: Client = null;
    loginOptions: ICredentials = null;

    eventList = new Array<string>();
    emitter: EventEmitter;

    constructor(serverUrl: string) {
        this.emitter = new EventEmitter();
        this.updateServer(serverUrl);
    }

    updateServer(url: string) {
        this.hostname = this.getHostname(url);

        this.master = Client.getFreeClient(this.hostname);

        this.master.api = this;

        this.connected = this.master.connected;

        // retrieve options that were used to connect the client
        if (this.master.options) {
            this.loginOptions = this.master.options;
        }
    }

    isDirectoryNameValid(dirName: string): boolean {
        console.log('FTP.isDirectoryNameValid');
        return !invalidChars.test(dirName);
    };

    resolve(newPath: string): string {
        return newPath.replace(/\/\.\.$/, '');
    };

    join(path: string, path2: string): string {
        return join(path, path2);
    };

    size(source: string, files: string[]): Promise<number> {
        console.warn('FTP.size not implemented');
        return Promise.resolve(0);
    };

    // copy(source: string, files: string[], dest: string): Promise<any> & cp.ProgressEmitter {
    //     console.log('TODO: FsFtp.copy');
    //     const prom: Promise<void> & cp.ProgressEmitter = new Promise((resolve, reject) => {
    //         resolve();
    //     }) as Promise<void> & cp.ProgressEmitter;

    //     prom.on = (name, handler): Promise<void> => {
    //         return prom;
    //     }

    //     return prom;
    // };

    makedir(parent: string, name: string): Promise<string> {
        console.log('FsFtp.makedir');
        return this.master.mkdir(parent, name);
    };

    delete(source: string, files: File[]): Promise<number> {
        debugger;
        return new Promise(async (resolve, reject) => {
            const fileList = files.filter(file => !file.isDir);
            const dirList = files.filter(file => file.isDir);

            debugger;

            for (let file of fileList) {
                try {
                    debugger;
                    const fullPath = this.join(source, file.fullname);
                    await this.master.delete(fullPath, false);
                } catch (err) {
                    debugger;
                    reject(err);
                }
            }

            for (let dir of dirList) {
                try {
                    debugger;
                    const fullPath = this.join(dir.dir, dir.fullname)
                    await this.master.cd(fullPath);
                    debugger;
                    const files = await this.master.list(fullPath, false);
                    debugger;
                    // first delete files found inside the folder
                    await this.delete(fullPath, files);
                    // then delete the folder itself
                    await this.master.delete(fullPath, true);
                } catch (err) {
                    debugger;
                    // list
                    // delete()
                    reject(err);
                }
            }

            debugger;
            resolve(fileList.length + dirList.length);
        });
    };

    rename(source: string, file: File, newName: string): Promise<string> {
        console.log('FsFtp.rename');
        return this.master.rename(source, file.fullname, newName);
    };

    isDir(path: string): Promise<boolean> {
        console.warn('FsFtp.isDir not implemented: always returns true');
        return Promise.resolve(true);
    };

    exists(path: string): Promise<boolean> {
        console.warn('FsFtp.exists not implemented: always returns true');
        return this.master.stat(path);
        // return Promise.resolve(false);
    }

    list(dir: string, appendParent = true): Promise<File[]> {
        console.log('FsFtp.readDirectory', dir);
        return this.master.list(dir, appendParent);
    };

    async stat(fullPath: string): Promise<File> {
        console.warn('FsFtp.stat: TODO');
        return Promise.resolve({
            dir: '',
            fullname: '',
            name: '',
            extension: '',
            cDate: new Date(),
            mDate: new Date(),
            length: 0,
            mode: 777,
            isDir: false,
            readonly: false,
            type: ''
        } as File);
    }

    cd(path: string): Promise<string> {
        console.log('FsFtp.cd', path);
        const resolved = this.resolve(path);
        console.log('FsFtp.cd resolved', resolved);
        return this.master.cd(resolved);
    };

    get(file_path: string, file: string): Promise<string> {
        const dest = path.join(TMP_DIR, file);
        console.log('need to get file', this.join(file_path, file), 'to', dest);
        return this.master.get(this.join(file_path, file), dest);
    }

    login(server?: string, credentials?: ICredentials): Promise<void> {
        if (server) {
            this.updateServer(server);
            // user: string, password: string, port: number

            this.loginOptions = { ...credentials };
            this.loginOptions.user = this.loginOptions.user || 'anonymous';
            //     user: credentials.user || 'anonymous',
            //     password: credentials.password,
            //     port
            // };
        } else {
            console.log('FsFtp: attempt to relogin: connection closed ?');
        }

        if (!this.master) {
            return Promise.reject('calling login but no master client set');
        } else if (this.connected) {
            console.warn('login: already connected');
            return Promise.resolve();
        } else {
            return this.master.login(this.loginOptions).then(() => {
                this.connected = true;
            });
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    isRoot(path: string): boolean {
        try {
            const parsed = new URL(path);
            return parsed.pathname === '/';
        } catch (err) {
            return path === '/';
        }
    }

    off() {
        console.log('*** free');
        // free client
        this.master.api = null;
        // remove all listeners
        for (let event of this.eventList) {
            this.emitter.removeAllListeners(event);
        }
        // close any connections ?
        // this.master.close();
    }

    async getStream(path: string, file: string): Promise<fs.ReadStream> {
        console.log('FsFtp.getStream');
        try {
            console.log('*** connecting', this.hostname, Object.assign({ ...this.loginOptions }, { password: '***' }));
            // 1. get ready client
            // 2. if not, add one (or wait ?) => use limit connection
            console.log('getting client');
            const client = Client.getFreeClient(this.hostname);
            console.log('connecting new client');
            await client.login(this.loginOptions);
            console.log('client logged in, creating read stream');
            const stream = client.getStream(this.join(path, file));
            return Promise.resolve(stream);
        } catch (err) {
            console.log('FsLocal.getStream error', err);
            return Promise.reject(err);
        };
    }

    async putStream(readStream: fs.ReadStream, dstPath: string, progress: (bytesRead: number) => void): Promise<void> {
        console.log('FsFtp.putStream');
        try {
            // 1. get ready client
            // 2. if not, add one (or wait ?) => use limit connection
            console.log('getting client');
            const client = Client.getFreeClient(this.hostname);
            console.log('connecting new client');
            await client.login(this.loginOptions);
            console.log('client logged in, creating read stream');
            return client.putStream(readStream, dstPath, progress);
        } catch (err) {
            console.log('FsFtp.putStream error', err);
            return Promise.reject(err);
        };
    }

    getHostname(str: string) {
        const info = new URL(str);

        return info.hostname.toLowerCase();
    }

    sanityze(path: string) {
        // first remove credentials from here
        const info = new URL(path);
        if (info.username) {
            let str = info.username;
            if (info.password) {
                str += `:${info.password}`;
            }
            path = path.replace(`${str}@`, '');
        }

        return path;
    }

    on(event: string, cb: (data: any) => void): void {
        if (this.eventList.indexOf(event) < 0) {
            this.eventList.push(event);
        }

        this.emitter.on(event, cb);
    }

    onClose() {
        this.connected = false;
        this.emitter.emit('close');
    }
};

export const FsFtp: Fs = {
    icon: 'globe-network',
    name: 'ftp',
    description: 'Fs that just implements fs over ftp',
    canread(str: string): boolean {
        const info = new URL(str);
        console.log('FsFtp.canread', str, info.protocol, info.protocol === 'ftp:');
        return info.protocol === 'ftp:';
    },
    serverpart(str: string, lowerCase = true): string {
        const info = new URL(str);
        return `${info.protocol}//${info.hostname}`;
    },
    credentials(str: string): ICredentials {
        const info = new URL(str);

        return {
            port: parseInt(info.port, 10) || 21,
            password: info.password,
            user: info.username
        };
    },
    API: FtpAPI
}
