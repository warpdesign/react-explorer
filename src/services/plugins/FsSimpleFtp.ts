import { FsApi, File, ICredentials, Fs, Parent, filetype } from '../Fs';
import { Client as FtpClient, FileInfo } from 'basic-ftp';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import * as nodePath from 'path';
import { isWin } from '../../utils/platform';

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

class Client {
    static instances = new Array<Client>();
    static getFreeClient(server: string, api: FsApi) {
        let instance = Client.instances.find((client) => client.server === server && !client.api);
        if (!instance) {
            instance = new Client(server, api);
            Client.instances.push(instance);
        } else {
            instance.api = api;
        }

        return instance;
    };
    static freeClient(client: Client) {
        const index = Client.instances.findIndex((c) => client === c);
        if (index > -1) {
            Client.instances.splice(index, 1);
        }
    }
    api: FsApi;
    server: string;
    ftpClient: FtpClient;
    loginOptions: ICredentials;
    connected: boolean;

    constructor(server: string, api: FsApi) {
        this.ftpClient = new FtpClient(0);
        this.server = server;
        this.api = api;
    }

    login(server: string, loginOptions: ICredentials): Promise<any> {
        debugger;
        if (!this.ftpClient.closed) {
            debugger;
        }
        return this.ftpClient.access(loginOptions).then(() => {
            debugger;
            this.loginOptions = loginOptions;
            this.connected = true;
            this.server = server;
        });
    }

    close() {

    }
}

class SimpleFtpApi implements FsApi {
    type = 1;
    master: Client;
    loginOptions: ICredentials = null;
    host = '';
    connected = false;

    // events
    eventList = new Array<string>();
    emitter: EventEmitter;

    constructor(serverUrl: string) {
        const serverpart = FsSimpleFtp.serverpart(serverUrl);
        debugger;
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
        return this.master && this.master.connected;
    }

    cd(path: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const newpath = this.pathpart(path);
            try {
                const res = await this.master.ftpClient.cd(newpath);

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

    size(source: string, files: string[]): Promise<number> {
        console.log('GenericFs.size');
        return Promise.resolve(10);
    }

    async login(server?: string, credentials?: ICredentials): Promise<any> {
        if (!this.connected) {
            // TODO: use existing master ?
            this.host = this.getHostname(server);
            const loginOptions = Object.assign(credentials, { host: this.host });
            console.log('connecting to', this.host, 'user=', loginOptions.user, 'password=', '***');

            debugger;
            // if (!this.master) {
            // this.master = new Client();
            // this.master.ftp.verbose = true;
            // }

            return this.master.login(server, loginOptions);
        }
    }

    makedir(parent: string, dirName: string): Promise<string> {
        console.log('FsGeneric.makedir');
        return Promise.resolve('');
    }

    delete(src: string, files: File[]): Promise<number> {
        console.log('FsGeneric.delete');
        return Promise.resolve(files.length);
    }

    rename(source: string, file: File, newName: string): Promise<string> {
        console.log('FsGeneric.rename');
        return Promise.resolve(newName);
    }

    isDir(path: string): Promise<boolean> {
        console.log('FsGeneric.isDir');
        return Promise.resolve(true);
    }

    exists(path: string): Promise<boolean> {
        console.log('FsGeneric.exists');
        return Promise.resolve(true);
    }

    async stat(fullPath: string): Promise<File> {
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

    list(path: string, appendParent = true): Promise<File[]> {
        return new Promise(async (resolve, reject) => {
            const newpath = this.pathpart(path);
            try {
                const ftpFiles: FileInfo[] = await this.master.ftpClient.list();
                const files = ftpFiles.filter((ftpFile) => !ftpFile.name.match(/^[\.]{1,2}$/)).map((ftpFile) => {
                    const format = nodePath.parse(ftpFile.name);
                    const ext = format.ext.toLowerCase();

                    const file: File = {
                        dir: path,
                        name: ftpFile.name,
                        fullname: ftpFile.name,
                        isDir: ftpFile.isDirectory,
                        length: ftpFile.size,
                        cDate: new Date(ftpFile.date),
                        mDate: new Date(ftpFile.date),
                        extension: '',
                        mode: 0,
                        readonly: false,
                        type: !ftpFile.isDirectory && filetype(0, ext) || '',
                        isSym: false
                    };
                    return file;
                });

                if (appendParent && !this.isRoot(newpath)) {
                    const parent = { ...Parent, dir: path };

                    resolve([parent].concat(files));
                } else {
                    resolve(files);
                }
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

    get(path: string): Promise<string> {
        return Promise.resolve(path);
    }

    async getStream(path: string, file: string): Promise<fs.ReadStream> {
        debugger;
        try {
            const stream = fs.createReadStream(this.join(path, file));
            return Promise.resolve(stream);
        } catch (err) {
            console.log('FsLocal.getStream error', err);
            return Promise.reject(err);
        };
    }

    async putStream(readStream: fs.ReadStream, dstPath: string, progress: (bytesRead: number) => void): Promise<void> {
        debugger;
        return Promise.resolve();
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
            this.master.close();
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
            user: info.username,
            host: info.host
        };
    },
    API: SimpleFtpApi
}
