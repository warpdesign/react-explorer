import { FsApi, File, Credentials, Fs, filetype } from '../Fs';
import * as ftp from 'ftp';
import * as path from 'path';
import * as fs from 'fs';
import { Transform } from 'stream';
import { throttle } from '../../utils/throttle';
import { Logger, JSObject } from '../../components/Log';
import { EventEmitter } from 'events';
import { isWin, DOWNLOADS_DIR } from '../../utils/platform';
import * as nodePath from 'path';
import { LocalizedError } from '../../locale/error';

const invalidChars = /^[\.]+$/gi;

function join(path1: string, path2: string): string {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private client: any;
    public connected: boolean;
    public host: string;
    public status: 'busy' | 'ready' | 'offline' = 'offline';
    public api: FtpAPI = null;
    public options: Credentials;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readyResolve: () => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readyReject: (err: any) => any;
    private readyPromise: Promise<void>;
    private previousError: LocalizedError = null;

    static clients: Array<Client> = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static addClient(hostname: string, options: any = {}): Client {
        const client = new Client(hostname, options);

        Client.clients.push(client);

        return client;
    }

    private instanceId = 0;
    static id = 0;

    // TODO: return promise if client is not connected ??
    static getFreeClient(hostname: string): Client {
        let client = Client.clients.find(
            (client) => client.host === hostname && !client.api && client.status === 'ready',
        );

        if (!client) {
            client = Client.addClient(hostname, {});
        } else {
            console.log('using existing client');
        }

        return client;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    success(...params: (string | number | boolean | JSObject)[]): void {
        Logger.success(...this.getLoggerArgs(params));
    }

    log(...params: (string | number | boolean | JSObject)[]): void {
        Logger.log(...this.getLoggerArgs(params));
    }

    warn(...params: (string | number | boolean | JSObject)[]): void {
        Logger.warn(...this.getLoggerArgs(params));
    }

    error(...params: (string | number | boolean | JSObject)[]): void {
        Logger.error(...this.getLoggerArgs(params));
    }

    public login(options: Credentials): Promise<void> {
        if (!this.connected) {
            this.log(
                'connecting to',
                this.host,
                'with options',
                Object.assign({ host: this.host, ...options }, { password: '****' }),
            );
            this.options = options;
            this.readyPromise = new Promise((resolve, reject) => {
                this.readyResolve = resolve;
                this.readyReject = reject;
                this.client.connect({ host: this.host, ...options, debug: window.console.log });
            });
        }

        return this.readyPromise;
    }

    private bindEvents(): void {
        this.client.on('ready', this.onReady.bind(this));
        this.client.on('error', this.onError.bind(this));
        this.client.on('close', this.onClose.bind(this));
        this.client.on('greeting', this.onGreeting.bind(this));
    }

    private onReady(): void {
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

    private onClose(): void {
        this.warn('close');
        this.connected = false;
        this.status = 'offline';

        if (this.api) {
            this.api.onClose();
        }
    }

    private goOffline(error: LocalizedError): void {
        this.status = 'offline';
        if (this.readyReject) {
            this.readyReject(error);
        }
    }

    private onError(error: LocalizedError): void {
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
                if (error && (error as string).match(/Timeout/)) {
                    this.warn('Connection timeout ?');
                }
                break;
        }

        this.previousError = error;
    }

    private onGreeting(greeting: string): void {
        for (const line of greeting.split('\n')) {
            this.log(line);
        }
    }

    public list(path: string): Promise<File[]> {
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.client.list('', (err: Error, list: any[]) => {
                this.status = 'ready';

                if (err) {
                    this.error('error calling list for', newpath);
                    reject(err);
                } else {
                    const files: File[] = list
                        .filter((ftpFile) => !ftpFile.name.match(/^[\.]{1,2}$/))
                        .map((ftpFile) => {
                            const format = nodePath.parse(ftpFile.name);
                            const ext = format.ext.toLowerCase();
                            const mDate = new Date(ftpFile.date);

                            const file: File = {
                                dir: path,
                                name: ftpFile.name,
                                fullname: ftpFile.name,
                                isDir: ftpFile.type === 'd',
                                length: parseInt(ftpFile.size, 10),
                                cDate: mDate,
                                mDate: mDate,
                                bDate: mDate,
                                extension: '',
                                mode: 0,
                                readonly: false,
                                type: (ftpFile.type !== 'd' && filetype(0, 0, 0, ext)) || '',
                                isSym: false,
                                target: null,
                                id: {
                                    ino: mDate.getTime(),
                                    dev: new Date().getTime(),
                                },
                            };
                            return file;
                        });

                    resolve(files);
                }
            });
        });
    }

    public cd(path: string): Promise<string> {
        this.log('cd', path);
        return new Promise((resolve, reject) => {
            const oldPath = path;
            const newpath = this.pathpart(path);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.client.cwd(newpath, (err: any, dir: string) => {
                if (!err) {
                    // some ftp servers return windows-like paths
                    // when ran in windows
                    if (dir) {
                        dir = dir.replace(/\\/g, '/');
                    }
                    // const joint = join(this.host, (dir || newpath));
                    const joint = newpath === '/' ? join(oldPath, dir || newpath) : oldPath;
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
                    readStream.once('close', function (): void {
                        resolve(dest);
                    });
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
        });
    }

    public putStream(readStream: fs.ReadStream, path: string, progress: (pourcent: number) => void): Promise<void> {
        this.status = 'busy';

        let bytesRead = 0;
        const throttledProgress = throttle((): void => {
            progress(bytesRead);
        }, 800);

        readStream.once('close', function () {
            console.log('get ended!');
        });
        const reportProgress = new Transform({
            transform(chunk, encoding, callback) {
                bytesRead += chunk.length;
                throttledProgress();
                console.log('data', bytesRead / 1024, 'Ko');
                callback(null, chunk);
            },
            highWaterMark: 16384 * 31,
        });

        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newpath = this.pathpart(path);
            this.client.put(readStream.pipe(reportProgress), newpath, (err: Error): void => {
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return this.client.rename(oldPath, newPath, (err: any) => {
                if (!err) {
                    resolve(newName);
                } else {
                    reject({
                        oldName: oldName,
                        newName: newName,
                        code: err.code,
                        message: err.message,
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
            this.client.mkdir(newPath, true, (err: Error): void => {
                if (err) {
                    reject(err);
                } else {
                    resolve(join(parent, name));
                }
            });
        });
    }

    public delete(ftpPath: string, isDir: boolean): Promise<void> {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public size(ftpPath: string): Promise<number> {
        const path = this.pathpart(ftpPath);
        return new Promise((resolve, reject) => {
            this.client.size(path, (err: Error, bytes: number): void => {
                if (err) {
                    reject(err);
                } else {
                    resolve(bytes);
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
    loginOptions: Credentials = null;

    eventList = new Array<string>();
    emitter: EventEmitter;

    constructor(serverUrl: string) {
        this.emitter = new EventEmitter();
        this.updateServer(serverUrl);
    }

    updateServer(url: string): void {
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
    }

    resolve(newPath: string): string {
        return newPath.replace(/\/\.\.$/, '');
    }

    join(path: string, path2: string): string {
        return join(path, path2);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    size(source: string, files: string[]): Promise<number> {
        console.warn('FTP.size not implemented');
        return Promise.resolve(0);
    }

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
    }

    delete(source: string, files: File[]): Promise<number> {
        debugger;
        return new Promise(async (resolve, reject) => {
            const fileList = files.filter((file) => !file.isDir);
            const dirList = files.filter((file) => file.isDir);

            debugger;

            for (const file of fileList) {
                try {
                    debugger;
                    const fullPath = this.join(source, file.fullname);
                    await this.master.delete(fullPath, false);
                } catch (err) {
                    debugger;
                    reject(err);
                }
            }

            for (const dir of dirList) {
                try {
                    debugger;
                    const fullPath = this.join(dir.dir, dir.fullname);
                    await this.master.cd(fullPath);
                    debugger;
                    const files = await this.master.list(fullPath);
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
    }

    rename(source: string, file: File, newName: string): Promise<string> {
        console.log('FsFtp.rename');
        return this.master.rename(source, file.fullname, newName);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isDir(path: string): Promise<boolean> {
        console.warn('FsFtp.isDir not implemented: always returns true');
        return Promise.resolve(true);
    }

    exists(path: string): Promise<boolean> {
        console.warn('FsFtp.exists not implemented: always returns true');
        return this.master.stat(path);
        // return Promise.resolve(false);
    }

    list(dir: string): Promise<File[]> {
        console.log('FsFtp.readDirectory', dir);
        return this.master.list(dir);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async makeSymlink(targetPath: string, path: string, transferId?: number): Promise<boolean> {
        console.log('FsFtp.makeSymlink');
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            type: '',
        } as File);
    }

    cd(path: string): Promise<string> {
        console.log('FsFtp.cd', path);
        const resolved = this.resolve(path);
        console.log('FsFtp.cd resolved', resolved);
        return this.master.cd(resolved);
    }

    get(file_path: string, file: string): Promise<string> {
        const dest = path.join(DOWNLOADS_DIR, file);
        console.log('need to get file', this.join(file_path, file), 'to', dest);
        return this.master.get(this.join(file_path, file), dest);
    }

    login(server?: string, credentials?: Credentials): Promise<void> {
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

    off(): void {
        console.log('*** free');
        // free client
        this.master.api = null;
        // remove all listeners
        for (const event of this.eventList) {
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
        }
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
        }
    }

    getHostname(str: string): string {
        const info = new URL(str);

        return info.hostname.toLowerCase();
    }

    getParentTree(dir: string): Array<{ dir: string; fullname: string }> {
        console.error('TODO: implement me');
        const numParts = dir.replace(/^\//, '').split('/').length;
        for (let i = 0; i < numParts; ++i) {}
        return [];
    }

    sanityze(path: string): string {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, cb: (data: any) => void): void {
        if (this.eventList.indexOf(event) < 0) {
            this.eventList.push(event);
        }

        this.emitter.on(event, cb);
    }

    onClose(): void {
        this.connected = false;
        this.emitter.emit('close');
    }
}

export const FsFtp: Fs = {
    icon: 'globe-network',
    name: 'ftp',
    description: 'Fs that just implements fs over ftp',
    options: {
        needsRefresh: true,
    },
    canread(str: string): boolean {
        const info = new URL(str);
        console.log('FsFtp.canread', str, info.protocol, info.protocol === 'ftp:');
        return info.protocol === 'ftp:';
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    serverpart(str: string, lowerCase = true): string {
        const info = new URL(str);
        return `${info.protocol}//${info.hostname}`;
    },
    credentials(str: string): Credentials {
        const info = new URL(str);

        return {
            port: parseInt(info.port, 10) || 21,
            password: info.password,
            user: info.username,
        };
    },
    displaypath(str: string) {
        const info = new URL(str);
        const split = info.pathname.split('/');
        return {
            fullPath: str,
            shortPath: split.slice(-1)[0] || '/',
        };
    },
    API: FtpAPI,
};
