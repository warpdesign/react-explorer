import { action, observable, computed } from 'mobx';
import { File, FsApi, getFS, DOWNLOADS_DIR } from '../services/Fs';
import { FileState } from './fileState';
import { Batch } from '../transfers/batch';
import { clipboard } from 'electron';
import { isWin } from '../utils/platform';
import { TabDescriptor } from '../components/TabList';
import { ViewState } from './viewState';

const LINE_ENDING = isWin ? '\r\n' : '\n';

declare var ENV: any;

/**
 * Interface for a clipboard entry
 * 
 * @interface
 */
interface Clipboard {
    srcFs: FsApi;
    srcPath: string;
    files: File[];
}

/**
 * Interface for a transfer
 * 
 * @interface
 */
interface TransferOptions {
    srcFs: FsApi;
    dstFs: FsApi;
    files: File[];
    srcPath: string;
    dstPath: string;
    dstFsName: string;
}


/**
 * Maintains global application state:
 * 
 * - list of ongoing transfers
 * - active view: explorer of file view
 * 
 * Transfers are also starting from appState
 */
export class AppState {
    caches: FileState[] = new Array();
    // @computed get caches() {
    //     const arr: Array<FileState> = [];
    //     this.views.map(view => view.caches).forEach(caches:Array<FileState> => {
    //         for (cache:FileState of caches) {
    //             arr.push(cache);
    //         }
    //     });

    //     return arr;
    // }
    // two view per window now
    // we'll need to extend it if we decide
    // to have multiple windows (which may or may not
    // have several views)
    views: ViewState[] = observable<ViewState>([]);

    @observable
    isExplorer = true;

    /* transfers */
    transfers = observable<Batch>([]);

    // current active transfers
    activeTransfers = observable<Batch>([]);

    /**
     * Creates the application state
     * 
     * @param tabs The initial paths of the caches that we want to create
     */
    constructor(tabs: Array<TabDescriptor>) {
        for (let tab of tabs) {
            console.log('adding cache', tab.viewId, tab.path);
            this.addCache(ENV.CY ? '' : tab.path, tab.viewId);
        }
        this.setViewState();
    }

    @action
    setViewState() {
        this.views[0].isActive = true;
        for (let view of this.views) {
            // get and activate the first cache for now
            // const files = view.caches[0];
            // if (files) {
            //     files.isVisible = true;
            // }
            view.setVisibleCache(0);
        }
    }

    /**
     * Prepares transferring files from clipboard to specified cache
     * The source cache is taken from the clipboard
     * 
     * @param cache file cache to transfer files to
     * 
     * @returns {Promise<FileTransfer[]>}
     */
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

    /**
     * Prepares transferring files from source to destination cache
     * 
     * @param srcCache file cache to transfer files from
     * @param dstCache  file fache to transfer files to
     * @param files the list of files to transfer
     * 
     * @returns {Promise<void>}
     */
    prepareTransferTo(srcCache: FileState, dstCache: FileState, files: File[]) {
        if (!files.length) {
            return;
        }

        const options = {
            files,
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

    /**
     * Prepares transferring files from srcCache to temp location
     * in local filesystem
     * 
     * @param srcCacche: cache to trasnfer files from
     * @param files the list of files to transfer
     * 
     * @returns {Promise<FileTransfer[]>}
     */
    prepareLocalTransfer(srcCache: FileState, files: File[]): Promise<string> {
        if (!files.length) {
            return Promise.resolve('');
        }

        // simply open the file if src is local FS
        if (srcCache.getFS().name === 'local') {
            const api = srcCache.getAPI();
            return Promise.resolve(api.join(files[0].dir, files[0].fullname));
        } else {
            // first we need to get a FS for local
            const fs = getFS(DOWNLOADS_DIR);
            const api = new fs.API(DOWNLOADS_DIR, () => { });

            const options = {
                files,
                srcFs: srcCache.getAPI(),
                srcPath: srcCache.path,
                dstFs: api,
                dstPath: DOWNLOADS_DIR,
                dstFsName: fs.name
            };

            // TODO: use a temporary filename for destination file?
            return this.addTransfer(options).then(() => {
                return api.join(DOWNLOADS_DIR, files[0].fullname);
            }).catch((err) => {
                debugger;
                return Promise.reject(err);
            });
        }
    }

    /**
     * Changes the active file cache
     * 
     * @param active the number of the cache to be the new active one
     */
    @action
    setActiveView(viewId: number) {
        console.log('setting active view', viewId);
        const previous = this.getActiveView(true);
        const next = this.getView(viewId);
        previous.isActive = false;
        next.isActive = true;
    }

    getActiveView(isActive = true): ViewState {
        return this.views.find(view => view.isActive === isActive);
    }

    getViewFromCache(cache: FileState) {
        const viewId = cache.viewId;
        return this.getView(viewId);
    }

    /**
     * Returns the cache that's not active (ie: destination cache)
     * 
     * NOTE: this would have no sense if we had more than two file caches
     */
    getInactiveViewVisibleCache(): FileState {
        const view = this.getActiveView(false);
        return view.caches.find(cache => cache.isVisible === true);
    }

    getViewVisibleCache(viewId: number): FileState {
        const view = this.getView(viewId);
        return view.caches.find(cache => cache.isVisible === true);
    }

    getCachesForView(viewId: number) {
        const view = this.getView(viewId);
        return view.caches;
    }

    /**
     * Sync (reload) caches which points to the same directory as srcCache
     * 
     * @param srcCache the source cache to base the sync upon
     */
    @action
    syncCaches(srcCache: FileState) {
        // get caches that are showing the same path
        console.error('this.caches removed: we may need this one!');
        this.views.map(view => view.caches).forEach(caches => {
            for (let cache of caches) {
                if (cache.status === 'ok' && cache !== srcCache && cache.getFS().name === srcCache.getFS().name && cache.isVisible) {
                    cache.reload();
                }
            }
        });
        // const caches = this.caches.filter((cache) => {
        //     return (cache !== srcCache &&
        //         cache.status === 'ok' &&
        //         cache.path === srcCache.path &&
        //         cache.getFS().name === srcCache.getFS().name
        //     );
        // });

        // for (let cache of caches) {
        //     cache.navHistory(0);
        // };
    }

    @computed
    get totalTransferProgress(): number {
        let totalSize = 0;
        let totalProgress = 0;

        const runningTransfers = this.activeTransfers;
        // .filter(transfer => !transfer.status.match(/error|done/));

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
            const activeTransfers = this.transfers.filter(transfer => !transfer.status.match(/error|done/));
            if (this.activeTransfers.length === 1) {
                this.activeTransfers.clear();
            }
            this.activeTransfers.push(batch);

            return batch.start();
        }).catch((err) => {
            debugger;
        });
    }

    /* /transfers */

    getActiveCache(): FileState {
        const view = this.getActiveView(true);
        return this.isExplorer ? view.caches.find((cache) => cache.isVisible === true) : null;
    }

    @action
    refreshActiveView() {
        const cache = this.getActiveCache();
        // only refresh view that's ready
        if (cache && cache.status === 'ok') {
            cache.reload();
        }
    }

    createView(viewId: number) {
        // return {
        //     caches: new Array(),
        //     viewId: viewId,
        //     isActive: false
        // };
        return new ViewState(viewId);
    }

    getView(viewId: number) {
        return this.views.find(view => view.viewId === viewId);
    }

    @action
    addCache(path: string = '', viewId = -1) {
        let view = this.getView(viewId);

        if (!view) {
            view = this.createView(viewId);
            this.views[viewId] = view;
        }

        // const cache = new FileState(path, viewId);
        view.addCache(path);
        // this.caches.push(cache);
        // this.views[viewId].caches.push(cache);

        // return cache;
    }

    @action
    updateSelection(cache: FileState, newSelection: File[]) {
        console.log('updateSelection', newSelection.length);
        cache.selected.replace(newSelection);
    }

    @action
    clearAllSelections() {
        console.error('this.caches removed: we may need this one too!');
        for (let view of this.views) {
            const visibleCache = view.getVisibleCache();
            visibleCache.clearSelection();
        }
        // for (let cache of this.caches) {
        //     cache.clearSelection();
        // }
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
}
