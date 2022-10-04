// import { FSWatcher, watch } from 'fs';
import { watchWSLFolder } from '../../utils/wsl';
import { ipcRenderer } from 'electron';

export type WatcherCB = (filename: string) => void;

interface Watcher {
    path: string;
    callbacks: WatcherCB[];
    ref: { close: () => void };
}

export const WslWatch = {
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
    addWatcher(path: string): Watcher {
        // console.log('LocalWatch.addWatcher', path);
        const watcher = {
            path,
            callbacks: new Array<WatcherCB>(),
            ref: watchWSLFolder(path, 'distrib', (): void => {
                const callbacks = this.getCallbacks(path);
                for (const cb of callbacks) {
                    cb();
                }
            }),
        };

        this.watchers.push(watcher);

        return watcher;
    },
    watchPath(path: string, callback: WatcherCB): void {
        const watcher = this.getWatcher(path, true);
        watcher.callbacks.push(callback);
    },
    stopWatchingPath(path: string, callback: WatcherCB): void {
        // console.log('LocalWatch.stopWatchingPath', path);
        const watcher = this.getWatcher(path);
        if (watcher) {
            // console.log('LocalWatch.stopWatchingPath avant', watcher.callbacks.length);
            watcher.callbacks = watcher.callbacks.filter((cb: WatcherCB) => cb !== callback);
            // console.log('LocalWatch.stopWatchingPath apres', watcher.callbacks.length);
            if (!watcher.callbacks.length) {
                // console.log('no more callbacks: closing watch and removing watcher');
                watcher.ref.close();
                this.watchers = this.watchers.filter((w: Watcher) => w !== watcher);
            }
        } else {
            // console.log('LocalWatch.noWatcher');
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
