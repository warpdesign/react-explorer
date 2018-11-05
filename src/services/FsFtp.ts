import { FsInterface, File } from './Fs';
import * as ftp from 'ftp';
import * as cp from 'cpy';

const FtpUrl = /^(ftp|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;
const invalidChars = /^[\.]+$/ig;

class Client{
    private client: any;
    public connected: boolean;
    public server: string;
    public status: 'busy' | 'ready' | 'offline';

    constructor(server: string, options: any = {}) {
        this.server = server;
        this.connected = false;
        this.client = new ftp();
        this.client.connect(options);

        this.bindEvents();
    }

    private bindEvents() {
        this.client.on('ready', () => this.onReady.bind(this));
        this.client.on('error', () => this.onError.bind(this));
        this.client.on('close', () => this.onClose.bind(this));
        this.client.on('greeting', () => this.onGreeting.bind(this));
    }

    private onReady() {
        console.log(`[FTP ${this.server}] close`);
        this.status = 'ready';
    }

    private onClose() {
        console.log(`[FTP ${this.server}] close`);
        this.connected = false;
    }

    private onError(error: any) {
        console.error(`[FTP ${this.server}] error: ${error}`);
    }

    private onGreeting(greeting: string) {
        console.log(`[FTP ${this.server}] greeting`, greeting);
    }
}

const clients:Array<Client> = [];

function addClient(server: string, options: any = {}) {
    const client = new Client(server, options);
    clients.push(client, options);
}

function getFreeClient(server: string) {
    const client = clients.find((client) => client.server === server);
    return client || null;
}

export const FsFtp: FsInterface = {
    name: 'ftp',
    description: 'Fs that just implements fs over ftp',
    type: 1,

    guess: (str: string): boolean => {
        return !!str.match(FtpUrl);
    },

    isDirectoryNameValid: (dirName: string): boolean => {
        console.log('FTP.isDirectoryNameValid');
        return !invalidChars.test(dirName);
    },

    resolve: (newPath: string): string => {
        console.warn('TODO: implement resolve');
        return newPath;
    },

    size: (source: string, files: string[]): Promise<number> => {
        console.log('FtpFs.size');
        return Promise.resolve(10);
    },

    copy: (source: string, files: string[], dest: string): Promise<void> & cp.ProgressEmitter => {
        console.log('Generic.copy');
        const prom: Promise<void> & cp.ProgressEmitter = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 2000);
        }) as Promise<void> & cp.ProgressEmitter;

        prom.on = (name, handler): Promise<void> => {
            return this;
        }

        return prom;
    },

    makedir: (parent: string, dirName: string): Promise<string> => {
        console.log('FsGeneric.makedir');
        return Promise.resolve('');
    },

    delete: (src: string, files: File[]): Promise<boolean> => {
        console.log('FsGeneric.delete');
        return Promise.resolve(true);
    },

    rename: (src: File, newName: string): Promise<string> => {
        console.log('FsGeneric.rename');
        return Promise.resolve(newName);
    },

    pathExists: (path: string): Promise<boolean> => {
        console.log('FsGeneric.pathExists');
        return Promise.resolve(true);
    },

    readDirectory: (dir: string): Promise<File[]> => {
        console.log('FsGeneric.readDirectory');
        return Promise.resolve([

        ]);
    }
};