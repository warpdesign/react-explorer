import React from 'react'
import { Intent } from '@blueprintjs/core'
import { action, observable, computed, makeObservable } from 'mobx'
import type { TFunction } from 'i18next'
import { shell } from 'electron'

import { FileDescriptor, sameID } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { TransferOptions } from '$src/state/transferState'
import { ViewDescriptor } from '$src/types'
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
import { DraggedObject } from '$src/types'
import { SettingsState } from './settingsState'
import { CustomSettings } from '$src/electron/windowSettings'

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

    settingsState = new SettingsState(window.ENV.VERSION as string)

    isExplorer = true
    isPrefsOpen = false
    isShortcutsOpen = false

    options: CustomSettings = {
        splitView: false,
    }

    clipboard = new ClipboardState()

    transferListState = new TransferListState()

    // reference to current i18n's instance translate function
    t: TFunction

    constructor() {
        makeObservable(this, {
            isExplorer: observable,
            isPrefsOpen: observable,
            isShortcutsOpen: observable,
            toggleSplitViewMode: action,
            toggleExplorerTab: action,
            initViewState: action,
            refreshActiveView: action,
            addView: action,
            openDirectory: action,
            options: observable,
            togglePrefsDialog: action,
            toggleShortcutsDialog: action,
            activeView: computed,
        })

        this.t = i18n.i18next.t
    }

    async loadSettingsAndPrepareViews() {
        this.options = await this.settingsState.getWindowSettings()

        const path = this.settingsState.defaultFolder
        const views: Array<ViewDescriptor> = [{ viewId: 0, path }]

        console.log({ views })

        this.options.splitView && views.push({ viewId: 1, path })

        this.addWindow({
            splitView: !!this.options.splitView,
        })

        for (const desc of views) {
            console.log('adding view', desc.viewId, desc.path, window.ENV.CY)
            this.addView(desc.path, desc.viewId)
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

    toggleExplorerTab = (showExplorer = true): void => {
        this.isExplorer = showExplorer
    }

    toggleShortcutsDialog = (open = true) => {
        this.isShortcutsOpen = open
    }

    togglePrefsDialog = (open = true) => {
        this.isPrefsOpen = open
    }

    drop({ dragFiles, fileState }: DraggedObject, destCache: FileState): void {
        // TODO: build files from native urls when we'll support dropping files
        // from a native app
        //
        // const files = srcCache
        //     ? item.dragFiles
        //     : item.files.map((webFile: File) => LocalApi.fileFromPath(webFile.path))
        // const options = this.prepareTransferTo(fileState, destCache, dragFiles)
        // let srcApi = null
        // let srcPath = ''

        // // native drag and drop
        // if (!fileState) {
        //     srcPath = dragFiles[0].dir
        //     const fs = getFS(srcPath)
        //     srcApi = new fs.API(srcPath, () => {
        //         // TODO
        //     })
        // }

        const options = {
            files: dragFiles,
            srcFs: fileState.getAPI(),
            srcPath: fileState.path,
            dstFs: destCache.getAPI(),
            dstPath: destCache.path,
            dstFsName: destCache.getFS().name,
        }
        this.copy(options)
    }

    paste(destCache: FileState): void {
        if (destCache && !destCache.error && this.clipboard.files.length) {
            const options = {
                files: this.clipboard.files,
                srcFs: this.clipboard.srcFs,
                srcPath: this.clipboard.srcPath,
                dstFs: destCache.getAPI(),
                dstPath: destCache.path,
                dstFsName: destCache.getFS().name,
            }
            this.copy(options)
        }
    }

    toggleSplitViewMode() {
        const winState = this.winStates[0]
        winState.toggleSplitViewMode()

        const view = winState.activeView
        if (!view.getVisibleCache()) {
            const { defaultFolder, defaultViewMode } = this.settingsState
            view.addCache(defaultFolder, -1, {
                activateNewCache: true,
                viewmode: defaultViewMode,
            })
        }
    }

    openDirectory(file: { dir: string; fullname: string }, sameView = true) {
        if (sameView) {
            const activeCache = this.getActiveCache()
            if (activeCache && activeCache.status === 'ok') {
                activeCache.openDirectory(file)
            }
        } else {
            const winState = this.winStates[0]

            if (!winState.splitView) {
                winState.toggleSplitViewMode()
            } else {
                winState.setActiveView(winState.inactiveView.viewId)
            }

            const viewState = winState.activeView

            // FIXME this is the only place where we need
            // a path and not dir + fullname
            if (viewState.getVisibleCache()?.path !== file.dir) {
                // use openDirectory
                viewState.addCache(file.dir, -1, {
                    activateNewCache: true,
                    viewmode: this.settingsState.defaultViewMode,
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

    async delete(files?: FileDescriptor[]): Promise<void> {
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
     * Opens a file that has been transfered
     *
     * @param transferId
     * @param file the file to open
     */
    openTransferredFile(transferId: number, file: FileDescriptor): void {
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
    prepareLocalTransfer(srcCache: FileState, files: FileDescriptor[]): Promise<string> {
        if (!files.length) {
            return Promise.resolve('')
        }

        // Simply open the file if src is a local FS
        if (srcCache.getFS().name.startsWith('local')) {
            const api = srcCache.getAPI()
            return Promise.resolve(api.join(files[0].dir, files[0].fullname))
        } else {
            console.error('TODO: prepareLocalTransfer for non-local FS')
            // TODO once we support non local FS

            // first we need to get a FS for local
            // const fs = getFS(DOWNLOADS_DIR)
            // const api = new fs.API(DOWNLOADS_DIR, () => {
            //     //
            // })
            // const options = {
            //     files,
            //     srcFs: srcCache.getAPI(),
            //     srcPath: srcCache.path,
            //     dstFs: api,
            //     dstPath: DOWNLOADS_DIR,
            //     dstFsName: fs.name,
            // }

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

    get activeView(): ViewState {
        const winState = this.winStates[0]
        return winState.activeView
    }

    /**
     * Returns the cache that's not active (ie: destination cache)
     *
     * NOTE: this would have no sense if we had more than two file caches
     */
    getInactiveViewVisibleCache(): FileState {
        const winState = this.winStates[0]
        const view = winState.inactiveView
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
                debugger
                console.log(err, err.files)
                const successCount = err.files - err.errors
                AppToaster.show({
                    message: this.t('COMMON.COPY_WARNING', {
                        count: successCount,
                    }),
                    icon: 'warning-sign',
                    intent: !successCount ? Intent.DANGER : Intent.WARNING,
                    timeout: ERROR_MESSAGE_TIMEOUT,
                })
            } else {
                // TODOCOPY
                debugger
            }
        }
    }

    async renameEditingFile(cache: FileState, newName: string) {
        try {
            const file = cache.allFiles.find((file) => sameID(file.id, cache.editingId))
            if (file && file.fullname !== newName) {
                await cache.rename(file.dir, file, newName)
            }
        } catch (e) {
            console.log('error renaming file', e)
        } finally {
            cache.reload()
            cache.setEditingFile(null)
        }
    }

    startEditingFile(cache: FileState, file?: FileDescriptor) {
        if (cache) {
            const fileToEdit = file || (cache.selected.length === 1 && cache.selected[0])
            fileToEdit && cache.setEditingFile(fileToEdit)
        }
    }

    getActiveCache(): FileState {
        const view = this.activeView
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
        view.addCache(path, -1, {
            viewmode: this.settingsState.defaultViewMode,
        })
    }

    removeView(viewId: number): void {
        const winState = this.winStates[0]
        winState.removeView(viewId)
    }

    getWinStateFromViewId(viewId: number) {
        return this.winStates.find((win) => !!win.getView(viewId))
    }
}
