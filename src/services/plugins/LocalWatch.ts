import { FSWatcher, watch } from 'fs';
import { debounce } from '../../utils/debounce';
import { ipcRenderer } from 'electron';

export type WatcherCB = (filename: string) => void;

export interface Watcher {
    path: string;
    callbacks: WatcherCB[];
    ref: FSWatcher;
}

// only fire change callback each 2 seconds: should be more than enough
// and will avoid locking the app if two many changes are fired rapidly
const CB_FIRE_RATE = 500;

export const LocalWatch = {
    watchers: new Array<Watcher>(),
    getWatcher(path: string, createIfNull = false): Watcher | null {
        // console.log('LocalWatch.getWatcher', path, createIfNull);
        const watcher = this.watchers.find((watcher: Watcher) => watcher.path === path);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createCallback(path: string): () => any {
        // console.log('LocalWatch.createCallback', path);
        return debounce((_: string, filename: string): void => {
            // console.log('changeCallback', eventType, filename);
            const callbacks = this.getCallbacks(path);
            for (const cb of callbacks) {
                cb(filename);
            }
        }, CB_FIRE_RATE);
    },
    addWatcher(path: string): Watcher {
        // console.log('LocalWatch.addWatcher', path);
        const watcher = {
            path,
            callbacks: new Array<WatcherCB>(),
            ref: watch(path, { recursive: false }, this.createCallback(path)),
        };

        this.watchers.push(watcher);

        return watcher;
    },
    watchPath(path: string, callback: WatcherCB): void {
        console.log('LocalWatch.watchPath', path);
        const watcher = this.getWatcher(path, true);
        watcher.callbacks.push(callback);
    },
    stopWatchingPath(path: string, callback: WatcherCB): void {
        console.log('LocalWatch.stopWatchingPath', path);
        const watcher = this.getWatcher(path);
        if (watcher) {
            console.log('LocalWatch.stopWatchingPath avant', watcher.callbacks.length);
            watcher.callbacks = watcher.callbacks.filter((cb: WatcherCB) => cb !== callback);
            console.log('LocalWatch.stopWatchingPath apres', watcher.callbacks.length);
            if (!watcher.callbacks.length) {
                console.log('no more callbacks: closing watch and removing watcher');
                watcher.ref.close();
                this.watchers = this.watchers.filter((w: Watcher) => w !== watcher);
            }
        } else {
            console.log('LocalWatch.noWatcher');
        }
    },
    closeAll(): void {
        console.log('LocalWatch.closeAall', this.watchers.length);
        for (const watcher of this.watchers) {
            watcher.ref.close();
        }
    },
};

if (ipcRenderer) {
    ipcRenderer.invoke('needsCleanup');
    ipcRenderer.on('cleanup', () => {
        console.log('cleanup received, closing watchers');
        LocalWatch.closeAll();
        console.log('cleanup received, sending cleanedUp');
        ipcRenderer.invoke('cleanedUp');
    });
}
