import { FsApi, File } from './Fs';
import * as ftp from 'ftp';
import * as cp from 'cpy';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { Server } from 'net';

const FtpUrl = /^(ftp\:\/\/)*(ftp\.[a-z]+\.[a-z]{2,3}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/i;
const ServerPart = /^(ftp\:\/\/)*(ftp\.[a-z]+\.[a-z]{2,3}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i;
const invalidChars = /^[\.]+$/ig;
const TMP_DIR = os.tmpdir();

function join(path:string, path2:string) {
    let sep = '';

    if (!path.endsWith('/') && !path2.startsWith('/')) {
        sep = '/';
    }

    return path + sep + path2;
}

class Client{
    private client: any;
    public connected: boolean;
    public host: string;
    public status: 'busy' | 'ready' | 'offline' = 'offline';
    public api:FtpAPI = null;

    private readyResolve: () => any;
    private readyReject: (err: any) => any;

    static clients: Array<Client> = [];

    static addClient(server:string, options: any = {}) {
        const client = new Client(server, options);

        Client.clients.push(client);
        return client;
    }

    // TODO: return promise if client is not connected ??
    static getFreeClient(server: string, options = {}) {
        let client = Client.clients.find((client) => client.host === server && !client.api && client.status === 'ready');
        if (!client) {
            client = Client.addClient(server, options);
        }

        return client;
    }

    constructor(host: string, options: any = {}) {
        console.log('creating ftp client');
        this.host = host;
        this.connected = false;
        this.client = new ftp();
        this.bindEvents();
    }

    public login(options: any = {}):Promise<any> {
        console.log('connecting to', this.host, 'with options', Object.assign({ host: this.host, ...options }, { password: '****' }));
        return new Promise((resolve, reject) => {
            this.readyResolve = resolve;
            this.readyReject = reject;
            this.client.connect({ host: this.host, ...options });
        });
    }

    private bindEvents() {
        this.client.on('ready', this.onReady.bind(this));
        this.client.on('error', this.onError.bind(this));
        this.client.on('close', this.onClose.bind(this));
        this.client.on('greeting', this.onGreeting.bind(this));
    }

    private onReady() {
        console.log(`[${this.host}] ready`);
        this.readyResolve();
        this.status = 'ready';
        this.connected = true;
    }

    private onClose() {
        console.log(`[${this.host}] close`);
        this.connected = false;
        this.status = 'offline';
        if (this.api) {
            this.api.connected = false;
        }
    }

    private onError(error: any) {
        console.error(`[${this.host}] error: ${error}`);
        switch(error.code) {
            // 500 series: command not accepted
            // user not logged in (user limit may be reached too)
            case 530:
                this.status = 'offline';
                this.readyReject('530');
                break;

            case 550:
                // is also returned when attempting to get the size of a directory
                console.error('Requested action not taken. File unavailable, not found, not accessible');
                break;

            case 421:
                // service not available: control connection closed
                console.error('Service not available, closing connection');
                this.client.close();
                break;

            default:
                console.log('unhandled error code:', error.code);
                // sometimes error.code is undefined
                if (error && error.match(/Timeout/)) {
                    console.log('Connection timeout ?');
                }
                break;
        }
    }

    private onGreeting(greeting: string) {
        console.log(`[${this.host}] greeting`)
        console.log(greeting);
    }

    public list(path: string): Promise<File[]> {
        this.status = 'busy';

        console.log('ftp.client: list', path);
        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);
            this.client.list(newpath, (err: Error, list: any[]) => {
                this.status = 'ready';
                if (err) {
                    reject(err);
                } else {
                    const files: File[] = list.filter((ftpFile) => !ftpFile.name.match(/^[\.]{1,2}$/)).map((ftpFile) => ({
                        dir: path,
                        name: ftpFile.name,
                        fullname: ftpFile.name,
                        isDir: ftpFile.type === 'd',
                        length: parseInt(ftpFile.size, 10),
                        cDate: new Date(ftpFile.date),
                        mDate: new Date(ftpFile.date),
                        extension: '',
                        mode: 0,
                        readonly: false
                    }));
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
                    resolve(files);
                }
            });
        });
    }

    public cd(path: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);
            this.client.cwd(newpath, (err:any, dir:string) => {
                if (!err) {
                    const joint = join(this.host, (dir || newpath));
                    resolve(joint);
                } else {
                    reject(err);
                }
            });
        });
    }

    public pathpart(path: string): string {
        const server = path.replace(ServerPart, '');
        return server;
    }

    public get(path: string, dest: string):Promise<string> {
        return new Promise((resolve, reject) => {
            const newpath = this.pathpart(path);
            console.log('downloading file', newpath, dest);
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

    public rename(serverPath: string, oldName: string, newName: string): Promise<string> {
        const path = this.pathpart(serverPath);
        const oldPath = join(path, oldName);
        const newPath = join(path, newName);

        console.log('renaming', oldPath, newPath);
        return new Promise((resolve, reject) => {
            return this.client.rename(oldPath, newPath, (err: Error) => {
                if (!err) {
                    resolve(newName);
                } else {
                    reject(oldName);
                }
            });
        });
    }

    public mkdir(parent: string, name: string): Promise<string> {
        const path = this.pathpart(parent);
        const newPath = join(path, name);

        return new Promise((resolve, reject) => {
            this.client.mkdir(newPath, true, (err: Error) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(join(path, name));
                }
            });
        })
    }
}

class FtpAPI implements FsApi {
    type = 1;
    server = '';
    connected = false;
    // main client: the one which will issue list/cd commands *only*
    master: Client = null;

    constructor(path: string) {
        this.server = FsFtp.serverpart(path);

        this.master = Client.getFreeClient(this.server);

        this.master.api = this;

        this.connected = this.master.connected;
    }

    isDirectoryNameValid (dirName: string): boolean {
        console.log('FTP.isDirectoryNameValid');
        return !invalidChars.test(dirName);
    };

    resolve(newPath: string): string {
        console.warn('TODO: implement resolve');
        return newPath;
    };

    join(path:string, path2:string): string {
        return join(path, path2);
    };

    size(source: string, files: string[]): Promise<number> {
        console.log('TODO: FtpFs.size');
        return Promise.resolve(10);
    };

    copy(source: string, files: string[], dest: string): Promise<any> & cp.ProgressEmitter {
        console.log('TODO: FsFtp.copy');
        const prom: Promise<void> & cp.ProgressEmitter = new Promise((resolve, reject) => {
            resolve();
        }) as Promise<void> & cp.ProgressEmitter;

        prom.on = (name, handler): Promise<void> => {
            return prom;
        }

        return prom;
    };

    makedir(parent: string, name: string): Promise<string> {
        console.log('FsFtp.makedir');
        return this.master.mkdir(parent, name);
    };

    delete(src: string, files: File[]): Promise<number> {
        console.log('TODO: FsFtp.delete');
        return Promise.resolve(0);
    };

    rename(source: string, file: File, newName: string): Promise<string> {
        console.log('FsFtp.rename');
        return this.master.rename(source, file.fullname, newName);
    };

    exists(path: string): Promise<boolean> {
        console.warn('FsFtp.pathExists not implemented: always returns true');
        return Promise.resolve(true);
    };

    list(dir: string): Promise<File[]> {
        // TODO: strip server from here too ?
        console.log('FsFtp.readDirectory');
        return this.master.list(dir);
    };

    cd(path: string): Promise<string> {
        console.log('FsFtp.cd', path);
        return this.master.cd(path);
    };

    get(file_path: string, file: string): Promise<string> {
        const dest = path.join(TMP_DIR, file);
        console.log('need to get file', this.join(file_path, file), 'to', dest);
        return this.master.get(this.join(file_path, file), dest);
    }

    login(username: string, password: string):Promise<void> {
        if (!this.master) {
            return Promise.reject('calling login but no master client set');
        } else if (this.connected) {
            console.warn('login: already connected');
            return Promise.resolve();
        } else {
            return this.master.login({ user: username, password }).then(() => {
                this.connected = true;
            });
        }
    }

    isConnected():boolean {
        return this.connected;
    }

    free() {
        // free client
        this.master.api = null;
        // close any connections ?
        // this.master.close();
    }
};

export const FsFtp = {
    name: 'ftp',
    description: 'Fs that just implements fs over ftp',
    canread(str: string): boolean {
        return !!this.serverpart(str).match(FtpUrl);
    },
    serverpart(str: string, lowerCase = true): string {
        const server = lowerCase ? str.replace(/^ftp\:\/\//i, '').toLowerCase() : str.replace(/^ftp\:\/\//i, '');
        return server.split('/')[0];
    },
    API: FtpAPI
}