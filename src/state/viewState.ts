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
    addCache(path: string) {
        console.log('viewState/addCache', path);
        const cache = new FileState(path, this.viewId);

        this.caches.push(cache);

        return cache;
    }

    getVisibleCache() {
        return this.caches.find(cache => cache.isVisible);
    }

    @action
    setVisibleCache(index: number) {
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
    closeTab(index: number) {
        console.log('closeTab', this.viewId, index);
        const removed = this.removeCache(index);

        // only activate next cache if the one removed was the visible one
        if (removed.isVisible) {
            this.activateNextTab(index);
        }
    }
}