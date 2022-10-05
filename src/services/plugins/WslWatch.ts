import { watchWSLFolder } from '../../utils/wsl';
import { ipcRenderer } from 'electron';

export type WatcherCB = (filename: string) => void;

interface Watcher {
    path: string;
    distributionId: string;
    callbacks: WatcherCB[];
    ref: { close: () => void };
}

export const WslWatch = {
    watchers: new Array<Watcher>(),
    getWatcher(path: string, distributionId: string, createIfNull = false): Watcher | null {
        const watcher = this.watchers.find(
            (watcher: Watcher) => watcher.path === path && watcher.distributionId === distributionId,
        );
        if (!watcher) {
            return createIfNull ? this.addWatcher(path, distributionId) : null;
        } else {
            return watcher;
        }
    },
    getCallbacks(path: string, distributionId: string): WatcherCB[] {
        const watcher = this.getWatcher(path, distributionId, false);
        return watcher.callbacks;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addWatcher(path: string, distributionId: string): Watcher {
        const watcher = {
            path,
            distributionId,
            callbacks: new Array<WatcherCB>(),
            ref: watchWSLFolder(path, distributionId, (): void => {
                const callbacks = this.getCallbacks(path, distributionId);
                for (const cb of callbacks) {
                    cb();
                }
            }),
        };

        this.watchers.push(watcher);

        return watcher;
    },
    watchPath(path: string, distributionId: string, callback: WatcherCB): void {
        console.log('Wsl.watchPath', path, distributionId);
        const watcher = this.getWatcher(path, distributionId, true);
        watcher.callbacks.push(callback);
    },
    stopWatchingPath(path: string, distributionId: string, callback: WatcherCB): void {
        console.log('WslWatch.stopWatchingPath', path, distributionId);
        const watcher = this.getWatcher(path, distributionId);
        if (watcher) {
            console.log('WslWatch.stopWatchingPath avant', watcher.callbacks.length);
            watcher.callbacks = watcher.callbacks.filter((cb: WatcherCB) => cb !== callback);
            console.log('WslWatch.stopWatchingPath apres', watcher.callbacks.length);
            if (!watcher.callbacks.length) {
                console.log('no more callbacks: closing watch and removing watcher');
                watcher.ref.close();
                this.watchers = this.watchers.filter((w: Watcher) => w !== watcher);
            }
        }
    },
    closeAll(): void {
        console.log('WslWatch.closeAall', this.watchers.length);
        for (const watcher of this.watchers) {
            watcher.ref.close();
        }
    },
};

if (ipcRenderer) {
    ipcRenderer.invoke('needsCleanup');
    ipcRenderer.on('cleanup', () => {
        console.log('cleanup received, closing watchers');
        WslWatch.closeAll();
        console.log('cleanup received, sending cleanedUp');
        ipcRenderer.invoke('cleanedUp');
    });
}
