import * as fs from 'fs';
import * as path from 'path';

const Parent:File = {
    dir: '..',
    fullname: '..',
    name: '',
    extension: '',
    cDate: new Date(),
    mDate: new Date(),
    length: 0,
    mode: 0,
    isDir: true
};

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
}

export interface Cache {
    path: string;
    files: File[];
}

interface Watcher {
    path: string,
    ref: fs.FSWatcher
};

class FsSingleton {
    cachedContents: Cache[] = new Array();
    watchers: Watcher[] = new Array();

    updateCache(path:string, files: File[]) {
        const cache = this.cachedContents.find((cache) => cache.path === path);

        if (!cache) {
            const cache = {
                path: path,
                files
            };

            this.cachedContents.push(cache);
        } else {
            cache.files = files;
        }
    }

    getWatcher(path: string): Watcher | null {
        return this.watchers.find((watcher) => watcher.path === path);
    };

    watch(path:string, fn: any) {
        if (!this.getWatcher(path)) {
            const watcher = fs.watch(path, {
                recursive: false
            }, fn);

            this.watchers.push({
                path: path,
                ref: watcher
            });
        }
    };

    stopWatching(path:string) {
        const watcher = this.getWatcher(path);
        if (watcher) {
            watcher.ref.close();
            const index = this.watchers.findIndex((w) => w === watcher);
            if (index > -1) {
                this.watchers.splice(index, 1);
            }
        }
    };

    pathExists(path:string):boolean {
        try {
            const stat = fs.statSync(path);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    readDirectory(dir: string): Promise<File[]> {
        console.log('calling readDirectory', dir);
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (err, items) => {
                if (err) {
                    debugger;
                    reject(`Could not read directory '${path}', reason: ${err}`);
                } else {
                    const dirPath = path.resolve(dir);
                    // console.log(items);

                    const files: File[] = [];

                    for (var i = 0; i < items.length; i++) {
                        const fullPath = path.join(dirPath, items[i]);
                        const format = path.parse(fullPath);
                        const stats = fs.statSync(path.join(dirPath, items[i]));
                        // console.log(items[i]);
                        const file =
                        {
                            dir: format.dir,
                            fullname: items[i],
                            name: format.name,
                            extension: format.ext,
                            cDate: stats.ctime,
                            mDate: stats.mtime,
                            length: stats.size,
                            mode: stats.mode,
                            isDir: stats.isDirectory()
                        };

                        files.push(file);
                    }
                    this.updateCache(dir, files);

                    // add parent
                    const parent = { ...Parent, dir: dirPath };

                    resolve([parent].concat(files));
                }
            });
        });
    };
}

export const Fs = new FsSingleton();