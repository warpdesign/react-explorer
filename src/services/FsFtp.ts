import { FsApi, File } from './Fs';
import * as ftp from 'ftp';
import * as cp from 'cpy';

const FtpUrl = /^(ftp\.[a-z]+\.[a-z]{2}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/;
const invalidChars = /^[\.]+$/ig;

class Client{
    private client: any;
    public connected: boolean;
    public host: string;
    public status: 'busy' | 'ready' | 'offline' = 'offline';

    constructor(host: string, options: any = {}) {
        console.log('creating ftp client');
        this.host = host;
        this.connected = false;
        this.client = new ftp();
        // this.client.on('error', (error:any) => {
        //     console.log('error', error);
        // });
        this.bindEvents();
        console.log('connecting to', host, 'with options', options);
        this.client.connect({host, ...options});
    }

    private bindEvents() {
        this.client.on('ready', this.onReady.bind(this));
        this.client.on('error', this.onError.bind(this));
        this.client.on('close', this.onClose.bind(this));
        this.client.on('greeting', this.onGreeting.bind(this));
    }

    private onReady() {
        console.log(`[${this.host}] close`);
        this.status = 'ready';
    }

    private onClose() {
        console.log(`[${this.host}] close`);
        this.connected = false;
        this.status = 'offline';
    }

    private onError(error: any) {
        console.error(`[${this.host}] error: ${error}`);
        switch(error.code) {
            // 500 series: command not accepted
            // user not logged in (user limit may be reached too)
            case 530:
                this.status = 'offline';
                break;

            case 550:
                // is also returned when attempting to get the size of a directory
                console.error('Requested action not taken. File unavailable, not found, not accessible');
                break;

            default:
                console.log('unhandled error code:', error.code);
                break;
        }
    }

    private onGreeting(greeting: string) {
        console.log(`[${this.host}] greeting`)
        console.log(greeting);
    }

    public list(path: string):File[] {
        return [];
    }

    public get(path: string) {

    }
}

class FtpAPI implements FsApi {
    type = 1;
    server = '';
    connected = false;

    static clients: Array<Client> = [];

    constructor(path:string) {

    }

    serverpart = FsFtp.serverpart;

    addClient(server: string, options: any = {}) {
        const client = new Client(server, options);
        FtpAPI.clients.push(client, options);
        return client;
    }

    getFreeClient(server: string) {
        let client = FtpAPI.clients.find((client) => client.host === server);
        if (!client) {
            client = this.addClient(server);
        }
        return client;
    }

    isDirectoryNameValid (dirName: string): boolean {
        console.log('FTP.isDirectoryNameValid');
        return !invalidChars.test(dirName);
    };

    resolve(newPath: string): string {
        console.warn('TODO: implement resolve');
        return newPath;
    };

    join(...paths:string[]): string {
        return this.join(...paths);
    };

    size(source: string, files: string[]): Promise<number> {
        console.log('FtpFs.size');
        return Promise.resolve(10);
    };

    copy(source: string, files: string[], dest: string): Promise<any> & cp.ProgressEmitter {
        console.log('FsFtp.copy');
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
        return Promise.resolve('');
    };

    delete(src: string, files: File[]): Promise<number> {
        console.log('FsFtp.delete');
        return Promise.resolve(0);
    };

    rename(source: string, file: File, newName: string): Promise<string> {
        console.log('FsFtp.rename');
        return Promise.resolve(newName);
    };

    exists(path: string): Promise<boolean> {
        console.log('FsFtp.pathExists');
        return Promise.resolve(true);
    };

    list(dir: string): Promise<File[]> {
        console.log('FsFtp.readDirectory');
        const server = FsFtp.serverpart(dir);

        // get avaiable client
        console.log('getting free client');

        const client = this.getFreeClient(server);
        return Promise.resolve([

        ]);
    };

    cd(path: string): Promise<string> {
        return Promise.resolve('');
    };

    isConnected():boolean {
        return this.connected;
    }
};

export const FsFtp = {
    name: 'ftp',
    description: 'Fs that just implements fs over ftp',
    canread(str: string): boolean {
        return !!this.serverpart(str).match(FtpUrl);
    },
    serverpart(str: string): string {
        const server = str.replace(/^ftp\:\/\//, '');
        return server.split('/')[0];
    },
    API: FtpAPI
}