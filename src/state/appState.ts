import { action, observable, computed, makeObservable, runInAction, toJS } from 'mobx'
import { shell } from 'electron'
import { File, FsApi, getFS } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { Batch } from '$src/transfers/batch'
import { DOWNLOADS_DIR } from '$src/utils/platform'
import { ViewDescriptor } from '$src/components/TabList'
import { WinState, WindowSettings } from '$src/state/winState'
import { FavoritesState } from '$src/state/favoritesState'
import { ViewState } from '$src/state/viewState'
import { ClipboardState } from './clipboardState'
import type { TFunction } from 'i18next'
import { i18n } from '$src/locale/i18n'
import { AppToaster } from '$src/components/AppToaster'
import { Intent } from '@blueprintjs/core'
import { getLocalizedError, LocalizedError } from '$src/locale/error'
import { showDeleteConfirmDialog } from '$src/components/dialogs/deleteConfirm'

declare const ENV: { [key: string]: string | boolean | number | Record<string, unknown> }

// wait 1 sec before showing badge: this avoids
// flashing (1) badge when the transfer is very fast
const SHOW_BADGE_DELAY = 600
const ERROR_MESSAGE_TIMEOUT = 3500

/**
 * Interface for a transfer
 *
 * @interface
 */
interface TransferOptions {
    srcFs: FsApi
    dstFs: FsApi
    files: File[]
    srcPath: string
    dstPath: string
    dstFsName: string
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
    winStates: WinState[] = observable<WinState>([])

    favoritesState: FavoritesState = new FavoritesState()

    isExplorer = true

    isPrefsOpen = false

    isShortcutsOpen = false

    isExitDialogOpen = false

    toggleSplitViewMode(): void {
        const winState = this.winStates[0]
        winState.toggleSplitViewMode()
    }

    /* transfers */
    transfers = observable<Batch>([])

    // current active transfers
    activeTransfers = observable<Batch>([])

    clipboard: ClipboardState = new ClipboardState()

    t: TFunction

    /**
     * Creates the application state
     *
     * @param views The initial paths of the caches that we want to create
     */
    constructor(views: Array<ViewDescriptor>, options: WindowSettings) {
        makeObservable(this, {
            isExplorer: observable,
            isPrefsOpen: observable,
            isShortcutsOpen: observable,
            isExitDialogOpen: observable,
            toggleSplitViewMode: action,
            showDownloadsTab: action,
            showExplorerTab: action,
            initViewState: action,
            totalTransferProgress: computed,
            pendingTransfers: computed,
            addTransfer: action,
            refreshActiveView: action,
            addView: action,
            updateSelection: action,
        })

        this.t = i18n.i18next.t

        this.addWindow(options)

        for (const desc of views) {
            console.log('adding view', desc.viewId, desc.path)
            this.addView(ENV.CY ? '' : desc.path, desc.viewId)
        }
        this.initViewState()
    }

    showDownloadsTab = (): void => {
        this.isExplorer = false
    }

    showExplorerTab = (): void => {
        this.isExplorer = true
    }

    /**
     * initialize each window's state: hardcoded to first window since we only have
     * one window now
     */
    initViewState(): void {
        const winState = this.winStates[0]
        winState.initState()
    }

    async paste(destCache: FileState): Promise<void> {
        if (destCache && !destCache.error && this.clipboard.files.length) {
            try {
                const noErrors = await this.prepareClipboardTransferTo(destCache)
                if (noErrors) {
                    AppToaster.show({
                        message: this.t('COMMON.COPY_FINISHED'),
                        icon: 'tick',
                        intent: Intent.SUCCESS,
                        timeout: 3000,
                    })
                } else {
                    AppToaster.show({
                        message: this.t('COMMON.COPY_WARNING'),
                        icon: 'warning-sign',
                        intent: Intent.WARNING,
                        timeout: 5000,
                    })
                }
            } catch (err) {
                const localizedError = getLocalizedError(err)
                const message = err.code
                    ? this.t('ERRORS.COPY_ERROR', {
                          message: localizedError.message,
                      })
                    : this.t('ERRORS.COPY_UNKNOWN_ERROR')

                AppToaster.show({
                    message: message,
                    icon: 'error',
                    intent: Intent.DANGER,
                    timeout: 5000,
                })
            }
        }
    }

    onDeleteError = (err?: LocalizedError) => {
        if (err) {
            AppToaster.show({
                message: this.t('ERRORS.DELETE', { message: err.message }),
                icon: 'error',
                intent: Intent.DANGER,
                timeout: ERROR_MESSAGE_TIMEOUT,
            })
        } else {
            AppToaster.show({
                message: this.t('ERRORS.DELETE_WARN'),
                icon: 'warning-sign',
                intent: Intent.WARNING,
                timeout: ERROR_MESSAGE_TIMEOUT,
            })
        }
    }

    async delete(files?: File[]): Promise<void> {
        const confirmed = await showDeleteConfirmDialog({
            cancelButtonText: this.t('COMMON.CANCEL'),
            confirmButtonText: this.t('APP_MENUS.DELETE'),
        })

        if (confirmed) {
            try {
                const cache = this.getActiveCache()
                const toDelete = files || cache.selected
                const deleted = await cache.delete(cache.path, toDelete)

                console.log('should delete')
                toDelete.forEach((file) => console.log('** ', toJS(file)))
                // cache.selected

                if (!deleted) {
                    this.onDeleteError()
                } else {
                    if (deleted !== cache.selected.length) {
                        // show warning
                        this.onDeleteError()
                    }
                    if (cache.getFS().options.needsRefresh) {
                        cache.reload()
                    }
                }
            } catch (err) {
                this.onDeleteError(err)
            }
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
    prepareClipboardTransferTo(cache: FileState): Promise<boolean | void> {
        const options = {
            files: this.clipboard.files,
            srcFs: this.clipboard.srcFs,
            srcPath: this.clipboard.srcPath,
            dstFs: cache.getAPI(),
            dstPath: cache.path,
            dstFsName: cache.getFS().name,
        }

        return this.addTransfer(options)
            .then((res) => {
                debugger
                if (
                    options.dstPath === cache.path &&
                    options.dstFsName === cache.getFS().name &&
                    cache.getFS().options.needsRefresh
                ) {
                    cache.reload()
                }

                return res
            })
            .catch((/*err: LocalizedError*/) => {
                debugger
            })
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
    prepareTransferTo(srcCache: FileState, dstCache: FileState, files: File[]): Promise<boolean | void> {
        if (!files.length) {
            return
        }

        let srcApi = null
        let srcPath = ''

        // native drag and drop
        if (!srcCache) {
            srcPath = files[0].dir
            const fs = getFS(srcPath)
            srcApi = new fs.API(srcPath, () => {
                //
            })
        }

        const options = {
            files,
            srcFs: (srcCache && srcCache.getAPI()) || srcApi,
            srcPath: (srcCache && srcCache.path) || srcPath,
            dstFs: dstCache.getAPI(),
            dstPath: dstCache.path,
            dstFsName: dstCache.getFS().name,
        }

        return this.addTransfer(options)
            .then((res) => {
                const fs = dstCache.getFS()
                if (fs.options.needsRefresh && options.dstPath === dstCache.path && options.dstFsName === fs.name) {
                    dstCache.reload()
                }

                return res
            })
            .catch((/*err*/) => {
                debugger
            })
    }

    /**
     * Opens a file that has been transfered
     *
     * @param file the file to open
     */
    openTransferedFile(batchId: number, file: File): void {
        // TODO: this is duplicate code from appState/prepareLocalTransfer and fileState.openFile()
        // because we don't have a reference to the destination cache
        const batch = this.transfers.find((transfer) => transfer.id === batchId)
        const api = batch.dstFs
        const path = api.join(file.dir, file.fullname)
        shell.openPath(path)
    }

    /**
     * Prepares transferring files from srcCache to temp location
     * in local filesystem
     *
     * @param srcCache: cache to trasnfer files from
     * @param files the list of files to transfer
     *
     * @returns {Promise<FileTransfer[]>}
     */
    prepareLocalTransfer(srcCache: FileState, files: File[]): Promise<string> {
        if (!files.length) {
            return Promise.resolve('')
        }

        // simply open the file if src is local FS
        if (srcCache.getFS().name === 'local') {
            const api = srcCache.getAPI()
            return Promise.resolve(api.join(files[0].dir, files[0].fullname))
        } else {
            // first we need to get a FS for local
            const fs = getFS(DOWNLOADS_DIR)
            const api = new fs.API(DOWNLOADS_DIR, () => {
                //
            })

            const options = {
                files,
                srcFs: srcCache.getAPI(),
                srcPath: srcCache.path,
                dstFs: api,
                dstPath: DOWNLOADS_DIR,
                dstFsName: fs.name,
            }

            // TODO: use a temporary filename for destination file?
            return this.addTransfer(options)
                .then(() => {
                    return api.join(DOWNLOADS_DIR, files[0].fullname)
                })
                .catch((err) => {
                    return Promise.reject(err)
                })
        }
    }

    getViewFromCache(cache: FileState): ViewState {
        const winState = this.winStates[0]
        const viewId = cache.viewId
        return winState.getView(viewId)
    }

    /**
     * Returns the cache that's not active (ie: destination cache)
     *
     * NOTE: this would have no sense if we had more than two file caches
     */
    getInactiveViewVisibleCache(): FileState {
        const winState = this.winStates[0]
        const view = winState.getInactiveView()
        return view.caches.find((cache) => cache.isVisible === true)
    }

    getViewVisibleCache(viewId: number): FileState {
        const winState = this.winStates[0]
        const view = winState.getView(viewId)
        return view.caches.find((cache) => cache.isVisible === true)
    }

    getCachesForView(viewId: number): FileState[] {
        const winState = this.winStates[0]
        const view = winState.getView(viewId)
        return view.caches
    }

    get totalTransferProgress(): number {
        let totalSize = 0
        let totalProgress = 0

        const runningTransfers = this.activeTransfers
        // .filter(transfer => !transfer.status.match(/error|done/));

        for (const transfer of runningTransfers) {
            totalSize += transfer.size
            totalProgress += transfer.progress
        }

        return (totalSize && totalProgress / totalSize) || 0
    }

    getTransfer(transferId: number): Batch {
        return this.transfers.find((transfer) => transferId === transfer.id)
    }

    get pendingTransfers(): number {
        const now = new Date()
        const num = this.transfers.filter(
            (transfer) =>
                transfer.progress &&
                transfer.isStarted &&
                now.getTime() - transfer.startDate.getTime() >= SHOW_BADGE_DELAY,
        ).length
        return num
    }

    async addTransfer(options: TransferOptions): Promise<boolean | void> {
        let isDir = false

        try {
            isDir = await options.dstFs.isDir(options.dstPath)
        } catch (err) {
            isDir = false
        }

        if (!isDir) {
            return Promise.reject({
                code: 'NODEST',
            })
        }

        console.log('addTransfer', options.files, options.srcFs, options.dstFs, options.dstPath)

        const batch = new Batch(options.srcFs, options.dstFs, options.srcPath, options.dstPath)
        runInAction(() => this.transfers.unshift(batch))
        return batch.setFileList(options.files).then(() => {
            batch.calcTotalSize()
            batch.status = 'queued'
            const activeTransfers = this.transfers.filter((transfer) => !transfer.status.match(/error|done/))
            // CHECKME
            runInAction(() => {
                if (this.activeTransfers.length === 1) {
                    this.activeTransfers.clear()
                }
                this.activeTransfers.push(batch)
            })

            return batch.start()
        })
    }

    removeTransfer(transferId: number): void {
        const batch = this.transfers.find((transfer) => transfer.id === transferId)
        if (batch) {
            batch.cancel()
            this.transfers.remove(batch)
        }
    }

    /* /transfers */

    getActiveCache(): FileState {
        const winState = this.winStates[0]
        const view = winState.getActiveView()
        return this.isExplorer ? view.caches.find((cache) => cache.isVisible === true) : null
    }

    refreshActiveView(): void {
        const cache = this.getActiveCache()
        // only refresh view that's ready
        if (cache) {
            cache.reload()
        }
    }

    addWindow(options: WindowSettings): void {
        const winState = new WinState(options)
        this.winStates.push(winState)
    }

    addView(path = '', viewId = -1): void {
        const winState = this.winStates[0]
        const view = winState.getOrCreateView(viewId)
        // let view = this.getView(viewId);

        // if (!view) {
        //     view = this.createView(viewId);
        //     this.views[viewId] = view;
        // }

        view.addCache(path)
    }

    updateSelection(cache: FileState, newSelection: File[]): void {
        console.log('updateSelection', newSelection.length)
        cache.selected.replace(newSelection)
        for (const selected of cache.selected) {
            console.log(selected.fullname, selected.id.dev, selected.id.ino)
        }

        if (newSelection.length) {
            const file = newSelection.slice(-1)[0]
            cache.setSelectedFile(file)
        } else {
            cache.setSelectedFile(null)
        }
        // for (let selected of cache.selected) {
        //     console.log(selected.fullname, selected.id.dev, selected.id.ino);
        // }
    }
}
