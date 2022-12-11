import { fs } from 'memfs'
import { ipcRenderer } from 'electron'

import { debounce } from '$src/utils/debounce'
import { FSWatcher } from 'fs'

export type WatcherCB = (filename: string) => void

export interface Watcher {
    path: string
    callbacks: WatcherCB[]
    ref: FSWatcher
}

// only fire change callback each 2 seconds: should be more than enough
// and will avoid locking the app if two many changes are fired rapidly
const CB_FIRE_RATE = 500

export const VirtualWatch = {
    watchers: new Array<Watcher>(),
    getWatcher(path: string, createIfNull = false): Watcher | null {
        const watcher = this.watchers.find((watcher: Watcher) => watcher.path === path)
        if (!watcher) {
            return createIfNull ? this.addWatcher(path) : null
        } else {
            return watcher
        }
    },
    getCallbacks(path: string): WatcherCB[] {
        const watcher = this.getWatcher(path, false)
        return watcher.callbacks
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createCallback(path: string): () => any {
        return debounce((_: string, filename: string): void => {
            const callbacks = this.getCallbacks(path)
            for (const cb of callbacks) {
                cb(filename)
            }
        }, CB_FIRE_RATE)
    },
    addWatcher(path: string): Watcher {
        const watcher = {
            path,
            callbacks: new Array<WatcherCB>(),
            ref: fs.watch(path, { recursive: false }, this.createCallback(path)),
        }

        this.watchers.push(watcher)

        return watcher
    },
    watchPath(path: string, callback: WatcherCB): void {
        const watcher = this.getWatcher(path, true)
        watcher.callbacks.push(callback)
    },
    stopWatchingPath(path: string, callback: WatcherCB): void {
        const watcher = this.getWatcher(path)
        if (watcher) {
            watcher.callbacks = watcher.callbacks.filter((cb: WatcherCB) => cb !== callback)
            if (!watcher.callbacks.length) {
                watcher.ref.close()
                this.watchers = this.watchers.filter((w: Watcher) => w !== watcher)
            }
        }
    },
    closeAll(): void {
        for (const watcher of this.watchers) {
            watcher.ref.close()
        }
    },
}

if (ipcRenderer) {
    ipcRenderer.invoke('needsCleanup')
    ipcRenderer.on('cleanup', () => {
        VirtualWatch.closeAll()
        ipcRenderer.invoke('cleanedUp')
    })
}
