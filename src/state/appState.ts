import { action, observable, computed } from 'mobx';
import { File, FsApi } from '../services/Fs';
import { FileState } from './fileState';
import { Batch } from '../transfers/batch';

interface Clipboard {
    srcFs: FsApi;
    srcPath: string;
    files: File[];
}

interface TransferOptions {
    clipboard: Clipboard;
    dstFs: FsApi;
    dstPath: string;
    dstFsName: string;
}

export class AppState {
    caches: FileState[] = new Array();

    /* transfers */
    transfers = observable<Batch>([]);

    prepareClipboardTransferTo(cache: FileState) {
        if (!this.clipboard.files.length) {
            return;
        }

        const options = {
            clipboard: { ...this.clipboard },
            dstFs: cache.getAPI(),
            dstPath: cache.path,
            dstFsName: cache.getFS().name
        };

        return this.addTransfer(options)
            .then(() => {
                // refresh cache: only if same directory ?
                if (options.dstPath === cache.path && options.dstFsName === cache.getFS().name) {
                    cache.navHistory(0);
                } else {
                    debugger;
                }
            });
    }

    @action
    syncCaches(srcCache: FileState) {
        // get caches that are showing the same path
        const caches = this.caches.filter((cache) => {
            return (cache !== srcCache &&
                cache.status === 'ok' &&
                cache.path === srcCache.path &&
                cache.getFS().name === srcCache.getFS().name);
        });

        for (let cache of caches) {
            cache.navHistory(0);
        };
    }

    @computed
    get totalTransferProgress(): number {
        let totalSize = 0;
        let totalProgress = 0;

        for (let transfer of this.transfers) {
            totalSize += transfer.size;
            totalProgress += transfer.progress;
        }

        return totalSize && (totalProgress / totalSize) || 0;
    }

    @computed
    get pendingTransfers(): number {
        const num = this.transfers.filter((transfer) => transfer.isStarted).length;
        console.log('++++ pending transfers', num);
        return num;
    }

    @action
    // addTransfer(srcFs: FsApi, dstFs: FsApi, files: File[], srcPath: string, dstPath: string) {
    addTransfer(options: TransferOptions) {
        const clipboard = options.clipboard;
        console.log('addTransfer', options.clipboard.files, options.clipboard.srcFs, options.dstFs, options.dstPath);
        const batch = new Batch(clipboard.srcFs, options.dstFs, clipboard.srcPath, options.dstPath);
        this.transfers.unshift(batch);
        return batch.setFileList(clipboard.files).then(() => {
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
    refreshView(viewId:number) {
        const cache = this.caches[viewId];
        // only refresh view that's ready
        if (cache && cache.status === 'ok') {
            cache.navHistory(0);
            this.syncCaches(cache);
        }
    }

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