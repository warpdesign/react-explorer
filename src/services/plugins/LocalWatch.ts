import { FSWatcher, watch } from "fs";
import { debounce } from "../../utils/debounce";
import { ipcRenderer } from 'electron';

export type WatcherCB = (filename: string) => void;

export interface IWatcher {
    path: string;
    callbacks: WatcherCB[];
    ref: FSWatcher;
}

// only fire change callback each 2 seconds: should be more than enough
// and will avoid locking the app if two many changes are fired rapidly
const CB_FIRE_RATE = 2000;

export const LocalWatch = {
    watchers: new Array<IWatcher>(),
    getWatcher(path: string, createIfNull = false): IWatcher | null {
        console.log('LocalWatch.getWatcher', path, createIfNull);
        const watcher = this.watchers.find((watcher: IWatcher) => watcher.path === path);
        if (!watcher) {
            return createIfNull ? this.addWatcher(path) : null;
        } else {
            return watcher;
        }
    },
    getCallbacks(path: string): WatcherCB[] {
        const watcher = this.getWatcher(path, false);
        return watcher.callbacks;
    },
    createCallback(path: string) {
        console.log('LocalWatch.createCallback', path);
        return debounce((eventType: string, filename: string | Buffer) => {
            console.log('changeCallback');
            const callbacks = this.getCallbacks(path);
            for (let cb of callbacks) {
                cb(filename);
            }
        }, CB_FIRE_RATE);
    },
    addWatcher(path: string): IWatcher {
        console.log('LocalWatch.addWatcher', path);
        const watcher = {
            path,
            callbacks: new Array<WatcherCB>(),
            ref: watch(path, { recursive: false }, this.createCallback(path))
        };

        this.watchers.push(watcher);

        return watcher;
    },
    watchPath(path: string, callback: WatcherCB) {
        console.log('LocalWatch.watchPath', path);
        const watcher = this.getWatcher(path, true);
        watcher.callbacks.push(callback);
    },
    stopWatchingPath(path: string, callback: WatcherCB) {
        console.log('LocalWatch.stopWatchingPath', path);
        const watcher = this.getWatcher(path);
        if (watcher) {
            console.log('LocalWatch.stopWatchingPath avant', watcher.callbacks.length);
            watcher.callbacks = watcher.callbacks.filter((cb: WatcherCB) => cb !== callback);
            console.log('LocalWatch.stopWatchingPath apres', watcher.callbacks.length);
            if (!watcher.callbacks.length) {
                console.log('no more callbacks: closing watch and removing watcher');
                watcher.ref.close();
                this.watchers = this.watchers.filter((w: IWatcher) => w !== watcher);
            }
        } else {
            console.log('LocalWatch.noWatcher');
        }
    },
    closeAll() {
        console.log('LocalWatch.closeAall', this.watchers.length);
        for (let watcher of this.watchers) {
            watcher.ref.close();
        }
    }
};

ipcRenderer.send('needsCleanup');
ipcRenderer.on('cleanup', () => {
    LocalWatch.closeAll();
    ipcRenderer.send('cleanedUp');
});
