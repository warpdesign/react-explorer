import { FsApi, File, ICredentials, Fs, filetype } from '../Fs';
import { Client as FtpClient, FileInfo, FTPResponse } from 'basic-ftp';
import * as fs from 'fs';
import { Transform, Readable, Writable } from 'stream';
import { EventEmitter } from 'events';
import * as nodePath from 'path';
import { isWin } from '../../utils/platform';

// DEBUG !!
declare let window: any;

function join(path1: string, path2: string) {
    let prefix = '';

    if (path1.match(/^ftp:\/\//)) {
        prefix = 'ftp://';
        path1 = path1.replace('ftp://', '');
    }

    // since under Windows path.join will use '\' as separator
    // we replace it with '/'
    if (isWin) {
        return prefix + nodePath.join(path1, path2).replace(/\\/g, '/');
    } else {
        return prefix + nodePath.join(path1, path2);
    }
}

function canTimeout(target: any, key: any, descriptor: any) {
    if (descriptor === undefined) {
        descriptor = Object.getOwnPropertyDescriptor(target, key);
    }
    var originalMethod = descriptor.value;

    descriptor.value = function decorator(...args: any) {
        console.log('canTimeout:', key, '()');
        return originalMethod.apply(this, args).catch(async (err: Error) => {
            console.log('key', key);

            if (this.ftpClient.closed) {
                const isLogin = key === 'login';
                console.warn('timeout detected: attempt to get a new client and reconnect');
                // if we are in the login process, do not attempt to login again, only create a new client
                await this.getNewFtpClient(!isLogin);
                console.log('after new client', this.ftpClient, this.ftpClient.closed);
                // do not recall the login process otherwise we could end up in an infinite loop
                // in case internet is down or EPIPE error
                if (!isLogin) {
                    console.log('calling decorator again');
                    return decorator.apply(this, args);
                } else {
                    return Promise.reject(err);
                }
            } else {
                console.log('caught error but client not closed ?', err);
                return Promise.reject(err);
            }
        });
    }
}

class Client {
    static instances = new Array<Client>();
    static getFreeClient(server: string, api: SimpleFtpApi, transferId = -1) {
        let instance = Client.instances.find((client) => client.server === server && !client.api && client.transferId === transferId);
        if (!instance) {
            instance = new Client(server, api, transferId);
            Client.instances.push(instance);
        } else {
            instance.api = api;
        }

        return instance;
    };
    static freeClient(client: Client) {
        const index = Client.instances.findIndex((c) => client === c);
        if (index > -1) {
            const removed = Client.instances.splice(index, 1);
            // remove ref to api to avoid memory leak
            removed[0].api = null;
        }
    }
    api: SimpleFtpApi;
    server: string;
    transferId: number;
    ftpClient: FtpClient;
    loginOptions: ICredentials;
    connected: boolean;

    constructor(server: string, api: SimpleFtpApi, transferId = -1) {
        this.ftpClient = new FtpClient();
        this.ftpClient.ftp.verbose = true;
        this.server = server;
        this.api = api;
        this.transferId = transferId;
    }

    isConnected() {
        return /*!this.ftpClient.closed && */this.connected;
    }

    @canTimeout
    async login(server: string, loginOptions: ICredentials): Promise<any> {
        const host = this.api.getHostname(server);
        const socketConnected = this.ftpClient.ftp.socket.bytesRead !== 0;
        console.log('canTimeout/login()', server, loginOptions, "socketConnected", socketConnected, "ftp.closed", this.ftpClient.closed);

        // WORKAROUND: FtpError 530 causes any subsequent call to access
        // to throw a ISCONN error, preventing any login to be successful.
        // To avoid that we detect that the client is already connected
        // and only call login()/useDefaultSettings() in that case
        if (!socketConnected) {
            await this.ftpClient.access(Object.assign(loginOptions, { host }));
            await this.onLoggedIn(server, loginOptions);
        } else {
            await this.ftpClient.login(loginOptions.user, loginOptions.password);
            await this.ftpClient.useDefaultSettings();
            await this.onLoggedIn(server, loginOptions);
        }
    }

    onLoggedIn(server: string, loginOptions: ICredentials) {
        this.loginOptions = loginOptions;
        this.connected = true;
        this.server = server;
        // problem: this cannot be called while a task (list/cd/...) is already in progress
        // this.scheduleNoOp();
    }

    // scheduleNoOp() {
    //     this.checkTimeout = window.setTimeout(() => {
    //         this.checkConnection();
    //     })
    // }

    // async checkConnection() {
    //     try {
    //         console.log('sending noop');
    //         await this.ftpClient.send('NOOP');
    //         this.scheduleNoOp();
    //     } catch (err) {
    //         debugger;
    //         // TODO: remove client from the list ?
    //     }
    // }

    close() {
        // if (this.checkTimeout) {
        //     window.clearInterval(this.checkTimeout);
        //     this.checkTimeout = 0;
        // }
        // TODO: remove from the list too ?
    }

    async getNewFtpClient(login = true) {
        console.log('creating new FtpClient');
        this.ftpClient = new FtpClient();
        this.ftpClient.ftp.verbose = true;

        if (login) {
            console.log('calling login');
            return this.login(this.server, this.loginOptions);
        }
    }

    /* API mirror starts here */
    @canTimeout
    list(): Promise<FileInfo[]> {
        console.log('Client.list()');
        return this.ftpClient.list();
    }

    @canTimeout
    cd(path: string) {
        console.log('Client.cd()');
        return this.ftpClient.cd(path);
    }

    @canTimeout
    getStream(path: string, writeStream: Writable): Promise<Readable> {
        this.ftpClient.download(writeStream, path);
        return Promise.resolve(this.ftpClient.ftp.dataSocket);
    }

    @canTimeout
    getFile(path: string, writeStream: Writable): Promise<FTPResponse> {
        return this.ftpClient.download(writeStream, path);
    }
}

class SimpleFtpApi implements FsApi {
    type = 1;
    master: Client;
    loginOptions: ICredentials = null;
    server = '';
    connected = false;

    // events
    eventList = new Array<string>();
    emitter: EventEmitter;

    async getClient(transferId = -1) {
        if (transferId > -1) {
            const client = Client.getFreeClient(this.server || this.master.server, this, transferId);

            await client.login(this.master.server, this.loginOptions || this.master.loginOptions);
            return client;
        } else {
            return this.master;
        }
    }

    constructor(serverUrl: string) {
        const serverpart = FsSimpleFtp.serverpart(serverUrl);

        this.master = Client.getFreeClient(serverpart, this);
        // TODO: get master if available
        // and set connected to true *and* credentials
        this.emitter = new EventEmitter();
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

    getHostname(str: string) {
        const info = new URL(str);

        return info.hostname.toLowerCase();
    }

    isDirectoryNameValid(dirName: string): boolean {
        debugger;
        console.log('GenericFs.isDirectoryNameValid');
        return true;
    }

    resolve(newPath: string): string {
        return newPath;
    }

    join(path: string, path2: string): string {
        return join(path, path2);
    };

    isConnected(): boolean {
        if (!(this.master && this.master.isConnected())) {
            console.log('not connected');
        }
        return this.master && this.master.isConnected();
    }

    cd(path: string, transferId = -1): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const newpath = this.pathpart(path);
            try {
                const client = await this.getClient(transferId);
                const res = await this.master.cd(newpath);

                // if (dir) {
                //     dir = dir.replace(/\\/g, '/');
                // }
                const joint = newpath === '/' ? join(path, newpath) : path;
                resolve(joint);
            } catch (err) {
                reject(err);
            }
        });
    }

    size(source: string, files: string[], transferId = -1): Promise<number> {
        console.log('GenericFs.size');
        return Promise.resolve(10);
    }

    login(server?: string, credentials?: ICredentials): Promise<any> {
        if (!this.connected) {
            // TODO: use existing master ?
            const loginOptions = credentials || this.loginOptions;
            const newServer = server || this.server;
            console.log('connecting to', newServer, 'user=', loginOptions.user, 'password=', '***');

            return this.master.login(newServer, loginOptions).then(() => {
                console.log('connected');
                this.loginOptions = loginOptions;
                this.server = newServer;
            });
        }
    }

    makedir(parent: string, dirName: string, transferId = -1): Promise<string> {
        console.log('FsGeneric.makedir');
        return Promise.resolve('');
    }

    delete(src: string, files: File[], transferId = -1): Promise<number> {
        console.log('FsGeneric.delete');
        return Promise.resolve(files.length);
    }

    rename(source: string, file: File, newName: string, transferId = -1): Promise<string> {
        console.log('FsGeneric.rename');
        return Promise.resolve(newName);
    }

    isDir(path: string, transferId = -1): Promise<boolean> {
        console.log('FsGeneric.isDir');
        return Promise.resolve(true);
    }

    exists(path: string, transferId = -1): Promise<boolean> {
        console.log('FsGeneric.exists');
        return Promise.resolve(true);
    }

    async stat(fullPath: string, transferId = -1): Promise<File> {
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

    list(path: string, transferId = -1): Promise<File[]> {
        return new Promise(async (resolve, reject) => {
            const newpath = this.pathpart(path);

            try {
                const client = await this.getClient(transferId);
                const ftpFiles: FileInfo[] = await client.list();
                const files = ftpFiles.filter((ftpFile) => !ftpFile.name.match(/^[\.]{1,2}$/)).map((ftpFile) => {
                    const format = nodePath.parse(ftpFile.name);
                    const ext = format.ext.toLowerCase();
                    const mDate = new Date(ftpFile.date);

                    const file: File = {
                        dir: path,
                        name: ftpFile.name,
                        fullname: ftpFile.name,
                        isDir: ftpFile.isDirectory,
                        length: ftpFile.size,
                        cDate: mDate,
                        mDate: mDate,
                        bDate: mDate,
                        extension: '',
                        mode: 0,
                        readonly: false,
                        type: !ftpFile.isDirectory && filetype(0, 0, 0, ext) || '',
                        isSym: false,
                        id: {
                            ino: mDate.getTime(),
                            dev: new Date().getTime()
                        }
                    };
                    return file;
                });

                resolve(files);
                // if (appendParent && !this.isRoot(newpath)) {
                //     const parent = { ...Parent, dir: path };

                //     resolve([parent].concat(files));
                // } else {
                //     resolve(files);
                // }
            } catch (err) {
                reject(err);
            }
        });
    }

    isRoot(path: string): boolean {
        try {
            const parsed = new URL(path);
            return parsed.pathname === '/';
        } catch (err) {
            return path === '/';
        }
    }

    async getStream(path: string, file: string, transferId = -1): Promise<Readable> {
        try {
            // create a duplex stream
            const transform = new Transform({
                transform(chunk, encoding, callback) {
                    callback(null, chunk);
                }
            });
            const joint = this.join(path, file);
            const client = await this.getClient(transferId);
            client.getStream(this.pathpart(joint), transform);
            return Promise.resolve(transform);
        } catch (err) {
            console.log('FsSimpleFtp.getStream error', err);
            return Promise.reject(err);
        };
    }

    async putStream(readStream: fs.ReadStream, dstPath: string, progress: (bytesRead: number) => void, transferId = -1): Promise<void> {
        debugger;
        return Promise.resolve();
    }

    getParentTree(dir: string): Array<{ dir: string, fullname: string }> {
        console.error('TODO: implement me');
        const numParts = dir.replace(/^\//, '').split('/').length;
        const folders = [];
        for (let i = 0; i < numParts; ++i) {

        }
        return [];
    }

    sanityze(path: string) {
        return path;
    }

    on(event: string, cb: (data: any) => void): void {
        if (this.eventList.indexOf(event) < 0) {
            this.eventList.push(event);
        }

        this.emitter.on(event, cb);
    }

    off() {
        console.log('*** off');
        // remove all listeners
        for (let event of this.eventList) {
            this.emitter.removeAllListeners(event);
        }

        if (this.master) {
            this.master.api = null;
            // this.master.close();
        }
        // TODO: save this.master + this.loginOptions
        // close any connections ?
        // this.master.close();
    }
};

export const FsSimpleFtp: Fs = {
    icon: 'globe-network',
    name: 'simple-ftp',
    description: 'Fs that implements ft connection on top of simple-ftp',
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
    displaypath(str: string) {
        const info = new URL(str);
        const split = info.pathname.split('/');
        return {
            fullPath: str,
            shortPath: split.slice(-1)[0] || '/'
        };
    },
    API: SimpleFtpApi
}
