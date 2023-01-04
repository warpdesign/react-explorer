import { observable, action, makeObservable } from 'mobx'

import { FileState } from '$src/state/fileState'

export class ViewState {
    viewId: number

    caches = observable<FileState>([])

    isActive = false

    constructor(viewId: number) {
        makeObservable(this, {
            isActive: observable,
            addCache: action,
            setVisibleCache: action,
            removeCache: action,
            activateNextTab: action,
            cycleTab: action,
            closeOthers: action,
            closeTab: action,
        })

        this.viewId = viewId
    }

    addCache(path: string, index = -1, activateNewCache = false): FileState {
        console.log('viewState/addCache', path)
        const cache = new FileState(path, this.viewId)

        if (index === -1) {
            this.caches.push(cache)
        } else {
            this.caches.splice(index, 0, cache)
        }

        if (activateNewCache) {
            this.setVisibleCache(index > -1 ? index : this.caches.length - 1)
        }

        return cache
    }

    getVisibleCache(): FileState {
        return this.caches.find((cache) => cache.isVisible)
    }

    getVisibleCacheIndex(): number {
        return this.caches.findIndex((cache) => cache.isVisible)
    }

    setVisibleCache(index: number): void {
        const previous = this.getVisibleCache()
        const next = this.caches[index]

        // do nothing if previous === next
        if (next && previous !== next) {
            if (previous) {
                previous.isVisible = false
            }
            next.isVisible = true
            if (!next.history.length && next.path.length) {
                next.openDirectory({ dir: next.path, fullname: '' })
            }
        }
    }

    removeCache(index: number): FileState {
        const cache = this.caches.splice(index, 1)[0]
        cache.getAPI().off()
        return cache
    }

    activateNextTab(index: number): void {
        const length = this.caches.length
        const newActive = length > index ? this.caches[index] : this.caches[length - 1]

        newActive.isVisible = true

        if (!newActive.history.length) {
            newActive.cd(newActive.path)
        }
    }

    cycleTab(direction: 1 | -1): void {
        const max = this.caches.length - 1

        // only one tab: do nothing
        if (!max) {
            return
        }

        let index = this.getVisibleCacheIndex() + direction

        if (index < 0) {
            index = max
        } else if (index > max) {
            index = 0
        }

        this.setVisibleCache(index)
    }

    closeOthers(keepIndex: number): void {
        console.log('close others', keepIndex)
        if (this.caches.length > 1) {
            const keepCache = this.getVisibleCache()
            const newArray = this.caches.filter((cache, index) => index === keepIndex)
            this.caches.replace(newArray)

            if (keepCache.isVisible) {
                this.activateNextTab(keepIndex)
            }
        }
    }

    closeTab(index: number): void {
        // keep at least one tab for now ?
        if (this.caches.length < 2) {
            return
        }
        const removed = this.removeCache(index)

        // only activate next cache if the one removed was the visible one
        if (removed.isVisible) {
            this.activateNextTab(index)
        }
    }
}
