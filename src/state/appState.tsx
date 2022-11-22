import React from 'react'
import { Intent } from '@blueprintjs/core'
import { action, observable, makeObservable } from 'mobx'
import type { TFunction } from 'i18next'
import { shell } from 'electron'

import { File, getFS } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { TransferOptions } from '$src/state/transferState'
import { DOWNLOADS_DIR } from '$src/utils/platform'
import { ViewDescriptor } from '$src/components/TabList'
import { WinState, WindowSettings } from '$src/state/winState'
import { FavoritesState } from '$src/state/favoritesState'
import { ViewState } from '$src/state/viewState'
import { ClipboardState } from '$src/state/clipboardState'
import { i18n } from '$src/locale/i18n'
import { AppToaster } from '$src/components/AppToaster'
import { LocalizedError } from '$src/locale/error'
import { DeleteConfirmDialog } from '$src/components/dialogs/deleteConfirm'
import { AppAlert } from '$src/components/AppAlert'
import { TransferListState } from '$src/state/transferListState'

// wait 1 sec before showing badge: this avoids
// flashing (1) badge when the transfer is very fast
const ERROR_MESSAGE_TIMEOUT = 3500
const SUCCESS_COPY_TIMEOUT = 3000

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

    clipboard = new ClipboardState()

    transferListState = new TransferListState()

    // reference to current i18n's instance translate function
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
            refreshActiveView: action,
            addView: action,
            updateSelection: action,
        })

        this.t = i18n.i18next.t

        this.addWindow(options)

        for (const desc of views) {
            console.log('adding view', desc.viewId, desc.path, window.ENV.CY)
            this.addView(window.ENV.CY ? '' : desc.path, desc.viewId)
        }
        this.initViewState()
    }

    /**
     * initialize each window's state: hardcoded to first window since we only have
     * one window now
     */
    initViewState(): void {
        const winState = this.winStates[0]
        winState.initState()
    }

    showDownloadsTab = (): void => {
        this.isExplorer = false
    }

    showExplorerTab = (): void => {
        this.isExplorer = true
    }

    async paste(destCache: FileState): Promise<void> {
        if (destCache && !destCache.error && this.clipboard.files.length) {
            this.copy(this.prepareClipboardTransferTo(destCache))
            // TODO: use copy instead
            // try {
            //     await this.addTransfer(options)
            //     .then((res) => {

            //         return res
            //     })
            //     const noErrors = await this.(destCache)
            //     if (noErrors) {
            //         AppToaster.show({
            //             message: this.t('COMMON.COPY_FINISHED'),
            //             icon: 'tick',
            //             intent: Intent.SUCCESS,
            //             timeout: 3000,
            //         })
            //     } else {
            //         AppToaster.show({
            //             message: this.t('COMMON.COPY_WARNING'),
            //             icon: 'warning-sign',
            //             intent: Intent.WARNING,
            //             timeout: 5000,
            //         })
            //     }
            // } catch (err) {
            //     const localizedError = getLocalizedError(err)
            //     const message = err.code
            //         ? this.t('ERRORS.COPY_ERROR', {
            //               message: localizedError.message,
            //           })
            //         : this.t('ERRORS.COPY_UNKNOWN_ERROR')

            //     AppToaster.show({
            //         message: message,
            //         icon: 'error',
            //         intent: Intent.DANGER,
            //         timeout: 5000,
            //     })
            // }
        }
    }

    // copy = async (options: TransferOptions) => {
    //     try {
    //         // const options = this.prepareTransferTo(srcCache, dstCache, files)
    //         const batch = await this.addTransfer(options)
    //         const success = await batch.start()
    //         // this.refreshAfterCopy()
    //         // if (success) {
    //         //     if (
    //         //         options.dstPath === cache.path &&
    //         //         options.dstFsName === cache.getFS().name &&
    //         //         cache.getFS().options.needsRefresh
    //         //     ) {
    //         //         cache.reload()
    //         //     }
    //         // }
    //         debugger
    //         console.log('success: show toast ?')
    //     } catch (e) {
    //         console.log(e)
    //         debugger
    //     }

    //     // .then((noErrors: boolean) => {
    //     //     const { t } = this.injected
    //     //     if (noErrors) {
    //     //         AppToaster.show({
    //     //             message: t('COMMON.COPY_FINISHED'),
    //     //             icon: 'tick',
    //     //             intent: Intent.SUCCESS,
    //     //             timeout: 3000,
    //     //         })
    //     //     } else {
    //     //         AppToaster.show({
    //     //             message: t('COMMON.COPY_WARNING'),
    //     //             icon: 'warning-sign',
    //     //             intent: Intent.WARNING,
    //     //             timeout: 5000,
    //     //         })
    //     //     }
    //     // })
    //     // .catch((err: { code: number | string }): void => {
    //     //     const { t } = this.injected
    //     //     const localizedError = getLocalizedError(err)
    //     //     const message = err.code
    //     //         ? t('ERRORS.COPY_ERROR', { message: localizedError.message })
    //     //         : t('ERRORS.COPY_UNKNOWN_ERROR')

    //     //     AppToaster.show({
    //     //         message: message,
    //     //         icon: 'error',
    //     //         intent: Intent.DANGER,
    //     //         timeout: 5000,
    //     //     })
    //     // })
    // }

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
        const cache = this.getActiveCache()
        const toDelete = files || cache.selected

        if (!toDelete.length) {
            return
        }

        const confirmed = await AppAlert.show(<DeleteConfirmDialog count={toDelete.length} />, {
            cancelButtonText: this.t('COMMON.CANCEL'),
            confirmButtonText: this.t('APP_MENUS.DELETE'),
            icon: 'trash',
            intent: Intent.DANGER,
        })

        if (confirmed) {
            try {
                const deleted = await cache.delete(cache.path, toDelete)

                if (!deleted) {
                    this.onDeleteError()
                } else {
                    if (deleted !== toDelete.length) {
                        // show warning
                        this.onDeleteError()
                    } else {
                        AppToaster.show({
                            message: this.t('COMMON.DELETE_SUCCESS', { count: deleted }),
                            icon: 'tick',
                            intent: Intent.SUCCESS,
                        })
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
     * @returns {TransferOptions}
     */
    prepareClipboardTransferTo(cache: FileState): TransferOptions {
        const options = {
            files: this.clipboard.files,
            srcFs: this.clipboard.srcFs,
            srcPath: this.clipboard.srcPath,
            dstFs: cache.getAPI(),
            dstPath: cache.path,
            dstFsName: cache.getFS().name,
        }

        return options

        // return this.addTransfer(options)
        //     .then((res) => {
        //         if (
        //             options.dstPath === cache.path &&
        //             options.dstFsName === cache.getFS().name &&
        //             cache.getFS().options.needsRefresh
        //         ) {
        //             cache.reload()
        //         }

        //         return res
        //     })
    }

    /**
     * Prepares transferring files from source to destination cache
     *
     * @param srcCache file cache to transfer files from
     * @param dstCache  file fache to transfer files to
     * @param files the list of files to transfer
     *
     * @returns {TransferOptions}
     */
    prepareTransferTo(srcCache: FileState, dstCache: FileState, files: File[]): TransferOptions {
        let srcApi = null
        let srcPath = ''

        // native drag and drop
        if (!srcCache) {
            srcPath = files[0].dir
            const fs = getFS(srcPath)
            srcApi = new fs.API(srcPath, () => {
                // TODO
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

        return options
        // return this.addTransfer(options)
        //     .then((res) => {
        //         const fs = dstCache.getFS()
        //         if (fs.options.needsRefresh && options.dstPath === dstCache.path && options.dstFsName === fs.name) {
        //             dstCache.reload()
        //         }

        //         return res
        //     })
        //     .catch((/*err*/) => {
        //         debugger
        //     })
    }

    /**
     * Opens a file that has been transfered
     *
     * @param transferId
     * @param file the file to open
     */
    openTransferedFile(transferId: number, file: File): void {
        // TODO: this is duplicate code from appState/prepareLocalTransfer and fileState.openFile()
        // because we don't have a reference to the destination cache
        const { dstFs: api } = this.transferListState.getTransfer(transferId)
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

            // TODOCOPY
            debugger
            // // TODO: use a temporary filename for destination file?
            // return this.addTransfer(options)
            //     .then(() => {
            //         return api.join(DOWNLOADS_DIR, files[0].fullname)
            //     })
            //     .catch((err) => {
            //         return Promise.reject(err)
            //     })
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

    async copy(options: TransferOptions) {
        try {
            const transfer = await this.transferListState.addTransfer(options)
            await transfer.start()

            AppToaster.show({
                message: this.t('COMMON.COPY_FINISHED'),
                icon: 'tick',
                intent: Intent.SUCCESS,
                timeout: SUCCESS_COPY_TIMEOUT,
            })

            // get visible caches: the ones that are not visible will be automatically refreshed
            // when set visible
            const cacheToRefresh = this.winStates[0].getVisibleViewByPath(options.dstPath)
            for (const cache of cacheToRefresh) {
                cache.reload()
            }
        } catch (err) {
            if (err.files) {
                // TODOCOPY: change message if there was only errors
                AppToaster.show({
                    message: this.t('COMMON.COPY_WARNING'),
                    icon: 'warning-sign',
                    intent: Intent.WARNING,
                    timeout: ERROR_MESSAGE_TIMEOUT,
                })
            }
        }
        debugger
    }

    // async addTransfer(options: TransferOptions): Promise<Batch> {
    //     let isDir = false

    //     try {
    //         isDir = await options.dstFs.isDir(options.dstPath)
    //     } catch (err) {
    //         isDir = false
    //     }

    //     if (!isDir) {
    //         throw {
    //             code: 'NODEST',
    //         }
    //     }

    //     console.log('addTransfer', options.files, options.srcFs, options.dstFs, options.dstPath)

    //     const batch = new Batch(options.srcFs, options.dstFs, options.srcPath, options.dstPath)
    //     runInAction(() => this.transfers.unshift(batch))
    //     await batch.prepare(options.files)

    //     // CHECKME
    //     runInAction(() => {
    //         if (this.activeTransfers.length === 1) {
    //             this.activeTransfers.clear()
    //         }
    //         this.activeTransfers.push(batch)
    //     })

    //     return batch
    // }

    /* /transfers */

    getActiveCache(): FileState {
        const winState = this.winStates[0]
        const view = winState.getActiveView()
        return this.isExplorer ? view.caches.find((cache) => cache.isVisible === true) : null
    }

    refreshActiveView(): void {
        const cache = this.getActiveCache()

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

        view.addCache(path)
    }

    // TODO: this should be moved into FileState (!)
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
    }
}
