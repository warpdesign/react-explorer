import { action, observable, computed } from 'mobx';
import { File, FsApi } from '../services/Fs';
import { FileState } from './fileState';
import { Batch } from '../transfers/batch';
import { clipboard } from 'electron';
import { isWin } from '../utils/platform';

const LINE_ENDING = isWin ? '\r\n' : '\n';

declare var ENV: any;

interface Clipboard {
    srcFs: FsApi;
    srcPath: string;
    files: File[];
}

interface TransferOptions {
    srcFs: FsApi;
    dstFs: FsApi;
    files: File[];
    srcPath: string;
    dstPath: string;
    dstFsName: string;
}

export class AppState {
    caches: FileState[] = new Array();

    @observable
    isExplorer = true;

    /* transfers */
    transfers = observable<Batch>([]);

    prepareClipboardTransferTo(cache: FileState) {
        if (!this.clipboard.files.length) {
            return;
        }

        const options = {
            files: this.clipboard.files,
            srcFs: this.clipboard.srcFs,
            srcPath: this.clipboard.srcPath,
            dstFs: cache.getAPI(),
            dstPath: cache.path,
            dstFsName: cache.getFS().name
        };

        return this.addTransfer(options)
            .then(() => {
                if (options.dstPath === cache.path && options.dstFsName === cache.getFS().name) {
                    cache.reload();
                }
            });
    }

    prepareDragDropTransferTo(srcCache: FileState, dstCache: FileState, files: File[]) {
        if (!files.length) {
            return;
        }

        const options = {
            files: files,
            srcFs: srcCache.getAPI(),
            srcPath: srcCache.path,
            dstFs: dstCache.getAPI(),
            dstPath: dstCache.path,
            dstFsName: dstCache.getFS().name
        };

        return this.addTransfer(options)
            .then(() => {
                if (options.dstPath === dstCache.path && options.dstFsName === dstCache.getFS().name) {
                    dstCache.reload();
                }
            });
    }

    @action setActiveCache(active: number) {
        for (let i = 0; i < this.caches.length; ++i) {
            this.caches[i].active = i === active ? true : false;
        }
    }

    getInactiveCache(): FileState {
        return this.caches[0].active ? this.caches[1] : this.caches[0];
    }

    @action
    syncCaches(srcCache: FileState) {
        // get caches that are showing the same path
        const caches = this.caches.filter((cache) => {
            return (cache !== srcCache &&
                cache.status === 'ok' &&
                cache.path === srcCache.path &&
                cache.getFS().name === srcCache.getFS().name
            );
        });

        for (let cache of caches) {
            cache.navHistory(0);
        };
    }

    @computed
    get totalTransferProgress(): number {
        let totalSize = 0;
        let totalProgress = 0;

        const runningTransfers = this.transfers.filter(transfer => !transfer.status.match(/error|done/));

        for (let transfer of runningTransfers) {
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
        console.log('addTransfer', options.files, options.srcFs, options.dstFs, options.dstPath);
        const batch = new Batch(options.srcFs, options.dstFs, options.srcPath, options.dstPath);
        this.transfers.unshift(batch);
        return batch.setFileList(options.files).then(() => {
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

    getActiveCache(): FileState {
        return this.isExplorer ? this.caches.find((view) => view.active === true) : null;
    }

    @action
    refreshActiveView() {
        const cache = this.getActiveCache();
        // only refresh view that's ready
        if (cache && cache.status === 'ok') {
            cache.reload();
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
        console.log('updateSelection', newSelection.length);
        cache.selected.replace(newSelection);
    }

    @action
    clearSelections() {
        for (let cache of this.caches) {
            cache.clearSelection();
        }
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

    @action
    copySelectedItemsPath(fileState: FileState, filenameOnly = false): string {
        const files = fileState.selected;
        let text = '';

        if (files.length) {
            const pathnames = files.map((file) => fileState.join(!filenameOnly && file.dir || '', file.fullname));
            text = pathnames.join(LINE_ENDING);
            clipboard.writeText(text);
        }

        return text;
    }

    constructor(caches: Array<string>) {
        for (let path of caches) {
            this.addCache(ENV.CY ? '' : path);
        }
        this.caches[0].active = true;

        // // TODO: pass start path as prop ?
        // const cache: FileState = appState.addCache();

        // this.state = {
        //     fileCache: cache
        // };
    }
}
