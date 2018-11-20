import { action, observable } from 'mobx';
import { File, FsApi } from '../services/Fs';
import { FileState } from './fileState';
import { Batch } from '../transfers/batch';

interface Clipboard {
    srcFs: FsApi;
    srcPath: string;
    files: File[];
}

export class AppState {
    caches: FileState[] = new Array();

    /* transfers */
    transfers = observable<Batch>([]);

    prepareTransfer(cache: FileState) {
        return this.addTransfer(this.clipboard.srcFs, cache.getAPI(), this.clipboard.files, this.clipboard.srcPath, cache.path)
            .then(() => {
                // refresh cache
                cache.reload();
            });
    }

    @action
    syncCaches(srcCache: FileState) {
        this.caches.filter((cache) => cache !== srcCache && cache.path === srcCache.path && cache.getFS().name === srcCache.getFS().name).forEach((cache) => cache.reload());
    }

    @action
    addTransfer(srcFs: FsApi, dstFs: FsApi, files: File[], srcPath: string, dstPath: string) {
        console.log('addTransfer', files, srcFs, dstFs, dstPath);
        const batch = new Batch(srcFs, dstFs, srcPath, dstPath);
        this.transfers.unshift(batch);
        return batch.setFileList(files).then(() => {
            batch.calcTotalSize();
            batch.status = 'queued';
            console.log('got file list !');
            // start transfer ?
            // setInterval(() => {
            //     runInAction(() => {
            //         console.log('progress up');
            //         batch.updateProgress();
            //     });
            // }, 1000);
            return batch.start();
        }).catch((err) => {
            debugger;
        });
    }

    /* /transfers */

    @action
    addCache(path: string = '') {
        const cache = new FileState(path);

        this.caches.push(cache);

        return cache;
    }

    @action
    updateSelection(cache: FileState, newSelection: File[]) {
        cache.selected.replace(newSelection);
    }

    // global
    @observable
    clipboard: Clipboard = {
        srcPath: '',
        srcFs: null,
        files: []
    };

    @action
    setClipboard(fileState: FileState): number {
        const files = fileState.selected.slice(0);

        this.clipboard = { srcFs: fileState.getAPI(), srcPath: fileState.path, files };

        return files.length;
    }

    constructor() {
    }
}