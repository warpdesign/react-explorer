import { FileState } from "./fileState";
import { observable, action } from "mobx";

export class ViewState {
    viewId: number;

    caches: FileState[] = observable<FileState>([]);

    @observable
    isActive: boolean = false;

    constructor(viewId: number) {
        this.viewId = viewId;
    }

    @action
    addCache(path: string, index = -1, activateNewCache = false) {
        console.log('viewState/addCache', path);
        const cache = new FileState(path, this.viewId);

        if (index === -1) {
            this.caches.push(cache);
        } else {
            this.caches.splice(index, 0, cache);
        }

        if (activateNewCache) {
            this.setVisibleCache(index);
            // setTimeout(() => (document.querySelector('.sideview.active input') as HTMLInputElement).focus());
        }

        return cache;
    }

    getVisibleCache() {
        return this.caches.find(cache => cache.isVisible);
    }

    getVisibleCacheIndex() {
        return this.caches.findIndex(cache => cache.isVisible);
    }

    @action
    setVisibleCache(index: number, activateInput = false) {
        const previous = this.getVisibleCache();
        const next = this.caches[index];
        // do nothing if previous === next
        if (previous !== next) {
            if (previous) {
                previous.isVisible = false;
            }
            next.isVisible = true;
            if (!next.history.length) {
                next.cd(next.path);
            }
        }
    }

    @action
    removeCache(index: number) {
        // const toDelete = this.caches.splice(index, 1)[0];

        return this.caches.splice(index, 1)[0];
    }

    @action
    activateNextTab(index: number) {
        const newActive = this.caches.length > index ? this.caches[index] : this.caches[0];
        newActive.isVisible = true;
        if (!newActive.history.length) {
            newActive.cd(newActive.path);
        }
    }

    @action
    cycleTab(direction: 1 | -1) {
        const max = this.caches.length - 1;

        // only one tab: do nothing
        if (!max) {
            return;
        }

        let index = this.getVisibleCacheIndex() + direction;

        if (index < 0) {
            index = max;
        } else if (index > max) {
            index = 0;
        }

        this.setVisibleCache(index);
    }

    @action
    closeTab(index: number) {
        console.log('closeTab', this.viewId, index);
        // keep at least one tab for now ?
        if (this.caches.length < 2) {
            return;
        }
        const removed = this.removeCache(index);

        // only activate next cache if the one removed was the visible one
        if (removed.isVisible) {
            this.activateNextTab(index);
        }
    }
}
