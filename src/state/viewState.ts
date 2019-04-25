import { FileState } from "./fileState";
import { observable, action } from "mobx";
import { getNextId } from "mobx/lib/utils/utils";

export class ViewState {
    viewId: number;

    caches: FileState[] = observable<FileState>([]);

    @observable
    isActive: boolean;

    constructor(viewId: number) {
        this.viewId = viewId;
    }

    addCache(path: string) {
        console.log('viewState/addCache', path);
        const cache = new FileState(path, this.viewId);

        this.caches.push(cache);

        return cache;
    }

    getVisibleCache() {
        return this.caches.find(cache => cache.isVisible);
    }

    setVisibleCache(index: number) {
        const previous = this.getVisibleCache();
        const next = this.caches[index];
        if (previous) {
            previous.isVisible = false;
        }
        next.isVisible = true;
    }

    removeCache(index: number) {
        // const toDelete = this.caches.splice(index, 1)[0];

        this.caches.splice(index, 1);
    }

    activateNextTab(index: number) {
        const newActive = this.caches.length >= index ? this.caches[index] : this.caches[0];
        newActive.isVisible = true;
        newActive.cd(newActive.path);
    }

    @action
    closeTab(index: number) {
        console.log('closeTab', this.viewId, index);
        this.removeCache(index);

        // activate next cache
        this.activateNextTab(index);
    }
}