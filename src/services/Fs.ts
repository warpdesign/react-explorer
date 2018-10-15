import * as fs from 'fs';
import * as path from 'path';

const Parent:File = {
    dir: '..',
    fullname: '..',
    name: '..',
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
        // blah9987
    };

    readDirectory(dir: string): Promise<File[]> {
        console.log('calling readDirectory', dir);
        return new Promise((resolve, reject) => {
            fs.readdir(dir, (err, items) => {
                if (err) {
                    reject(`Could not read directy '${path}', reason: err`);
                } else {
                    console.log(items);

                    const files: File[] = [];

                    for (var i = 0; i < items.length; i++) {
                        const fullPath = path.join(path.resolve(dir), items[i]);
                        const format = path.parse(fullPath);
                        const stats = fs.statSync(path.join(path.resolve(dir), items[i]));
                        console.log(items[i]);
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

                    resolve([Parent].concat(files));
                }
            });
        });
    };
}

export const Fs = new FsSingleton();