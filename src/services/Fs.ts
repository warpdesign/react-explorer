import { FsLocal } from './FsLocal';
import { FsGeneric } from './FsGeneric';
import { FsFtp } from './FsFtp';
import * as fs from 'fs';

declare var ENV: any;

export interface File {
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
    type: FileType;
}

export interface Fs {
    // runtime api
    API: (new (path:string) => FsApi);
    // static members
    canread(str: string): boolean;
    serverpart(str: string): string;
    credentials(str: string): ICredentials;
    name: string;
    description: string;
    icon: string;
}

export const Parent: File = {
    dir: '..',
    fullname: '..',
    name: '',
    extension: '',
    cDate: new Date(),
    mDate: new Date(),
    length: 0,
    mode: 1,
    isDir: true,
    readonly: true,
    type: ''
};

const Extensions = {
    'exe': /\.(exe|bat|com|msi|mui|cmd)$/,
    'img': /\.(png|jpeg|jpg|gif|pcx|tiff|raw|webp|svg|heif|bmp|ilbm|iff|lbm|ppm|pgw|pbm|pnm|psd)$/,
    'arc': /\.(zip|tar|rar|7zip|dmg|shar|ar|bz2|lz|gz|tgz|lha|lzh|lzx|sz|xz|z|s7z|ace|apk|arp|arj|cab|car|cfs|cso|dar|iso|ice|jar|pak|sea|sfx|sit|sitx|lzma|war|xar|zoo|zipx|img|adf|dms|dmz)$/,
    'snd': /\.(mp3|wav|mp2|ogg|aac|aiff|mod|flac|m4a|mpc|oga|opus|ra|rm|vox|wma|8svx)$/,
    'vid': /\.(webm|avi|mpeg|mpg|mp4|mov|mkv|qt|wmv|vob|ogb|m4v|m4p|asf|mts|m2ts|3gp|flv|anim)$/,
    'cod': /\.(json|js|cpp|c|cxx|java|rb|s|tsx|ts|jsx|lua|as|coffee|ps1|py|r|rexx|spt|sptd|go|rs|sh|bash|vbs|cljs)$/,
    'doc': /\.(log|last|css|htm|html|rtf|doc|pdf|docx|txt|md|1st|asc|epub|xhtml|xml|amigaguide|info)$/
};
const ExeMaskAll = 0o0001;
const ExeMaskGroup = 0o0010;
const ExeMaskUser = 0o0100;

export type FileType = 'exe'|'img'|'arc'|'snd'|'vid'|'doc'|'cod'|'';

function isModeExe(mode:number):Boolean {
    return !!((mode & ExeMaskAll) || (mode & ExeMaskUser) || (mode & ExeMaskGroup));
}

export function filetype(mode:number, extension:string): FileType {
    if (isModeExe(mode) || extension.match(Extensions.exe)) {
        return 'exe';
    } else if (extension.match(Extensions.img)) {
        return 'img';
    } else if (extension.match(Extensions.arc)) {
        return 'arc';
    } else if (extension.match(Extensions.snd)) {
        return 'snd';
    } else if (extension.match(Extensions.vid)) {
        return 'vid';
    } else if (extension.match(Extensions.doc)) {
        return 'doc';
    } else if (extension.match(Extensions.cod)) {
        return 'cod';
    } else {
        return ''
    }
}

export interface FsApi {
    // public API
    list(dir: string, appendParent?: boolean): Promise<File[]>;
    cd(path:string): Promise<string>;
    delete(parent: string, files: File[]): Promise<number>;
    // copy(parent: string, files: string[], dest: string): Promise<number> & cp.ProgressEmitter;
    join(...paths: string[]): string;
    makedir(parent: string, name: string): Promise<string>;
    rename(parent: string, file: File, name: string): Promise<string>;
    stat(path: string): Promise<File>;
    isDir(path: string): Promise<boolean>;
    exists(path: string): Promise<boolean>;
    resolve(path: string): string;
    sanityze(path: string): string;
    size(source: string, files: string[]): Promise<number>;
    login(server?: string, credentials?:ICredentials): Promise<void>;
    isConnected(): boolean;
    isDirectoryNameValid(dirName: string): boolean;
    get(path: string, file: string): Promise<string>;
    getStream(path: string, file: string): Promise<fs.ReadStream>;
    putStream(readStream: fs.ReadStream, dstPath: string, progress: (bytesRead: number) => void): Promise<void>;
    isRoot(path: string): boolean;
    free(): void;
    on(event: string, cb: (data: any) => void): void;
    loginOptions: ICredentials;
}

const interfaces: Array<Fs> = new Array();

export interface ICredentials {
    user?: string;
    password?: string;
    port?: number;
}

export function registerFs(fs: Fs): void {
    console.log('Registring Fs', fs.name);
    interfaces.push(fs);
};

export function getFS(path: string):Fs {
    let newfs = interfaces.find((filesystem) => filesystem.canread(path));

    // if (!newfs) {
    //     newfs = FsGeneric;
    // }

    return newfs;
}

// in test environment, load the generic fs as first one
// if (ENV.CY) {
//     registerFs(FsGeneric);
// }
registerFs(FsLocal);
registerFs(FsFtp);
