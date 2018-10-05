import * as fs from 'fs';

interface File {
    path: string;
    name: string;
    extension: string;
    cDate: Date;
    mDate: Date;
    length: number;
    permissions: number;
    isDir: boolean;
}

interface Cache {
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

    readDirectory(path: string): Promise<File[]> {
        console.log('calling readDirectory', path);
        return new Promise((resolve, reject) => {
            fs.readdir(path, (err, items) => {
                if (err) {
                    reject(`Could not read directy '${path}', reason: err`);
                } else {
                    console.log(items);

                    const files: File[] = new Array();

                    for (var i = 0; i < items.length; i++) {
                        console.log(items[i]);
                        const file =
                        {
                            path: items[i],
                            name: items[i],
                            extension: items[i],
                            cDate: new Date(),
                            mDate: new Date(),
                            length: 0,
                            permissions: 0,
                            isDir: false
                        };

                        files.push(file);
                    }
                    this.updateCache(path, files);

                    resolve(files);
                }
            });
        });
    };
}

export const Fs = new FsSingleton();