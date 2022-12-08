import { observable, action, runInAction, makeObservable } from 'mobx'
import { shell, ipcRenderer } from 'electron'

import { FsApi, Fs, getFS, File, Credentials, withConnection, FileID } from '$src/services/Fs'
import { Deferred } from '$src/utils/deferred'
import { i18n } from '$src/locale/i18n'
import { getLocalizedError } from '$src/locale/error'
import { AppState } from '$src/state/appState'
import { TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'
import { AppAlert } from '$src/components/AppAlert'

export type TStatus = 'busy' | 'ok' | 'login' | 'offline'

export class FileState {
    /* observable properties start here */
    path = ''

    previousPath: string

    readonly files = observable<File>([])

    readonly selected = observable<File>([])

    // scroll position of fileCache: we need to restore it on
    // cache reload
    scrollTop = -1

    // last element that was selected (ie: cursor position)
    selectedId: FileID = null
    // element that's being edited
    editingId: FileID = null

    sortMethod: TSORT_METHOD_NAME = 'name'

    sortOrder: TSORT_ORDER = 'asc'

    server = ''

    credentials: Credentials

    status: TStatus = 'ok'

    error = false

    cmd = ''

    showHiddenFiles = false

    // @observable
    // active = false;

    isVisible = false

    viewId = -1

    // history stuff
    history = observable<string>([])
    current = -1

    waitForConnection = async () => {
        if (!this.api) {
            debugger
        }
        if (!this.api.isConnected()) {
            this.loginDefer = new Deferred()

            // automatially reconnect if we got credentials
            if (this.api.loginOptions) {
                this.doLogin()
            } else {
                // otherwise show login dialog
                this.setStatus('login')
            }

            return this.loginDefer.promise
        } else {
            this.setStatus('busy')
            return Promise.resolve()
        }
    }

    setStatus(status: TStatus, error = false): void {
        this.status = status
        this.error = error
    }

    addPathToHistory(path: string): void {
        const keep = this.history.slice(0, this.current + 1)
        this.history.replace(keep.concat([path]))
        this.current++
    }

    navHistory(dir = -1, force = false): Promise<string | void> {
        if (!this.history.length) {
            debugger
            console.warn('attempting to nav in empty history')
            return
        }

        if (force) {
            debugger
        }

        const history = this.history
        const current = this.current
        const length = history.length
        let newCurrent = current + dir

        if (newCurrent < 0) {
            newCurrent = 0
        } else if (newCurrent >= length) {
            newCurrent = length - 1
        }

        if (newCurrent === this.current) {
            return
        }

        this.current = newCurrent

        const path = history[newCurrent]

        return this.cd(path, '', true, true).catch(() => {
            // whatever happens, we want switch to that folder
            this.updatePath(path, true)
            this.emptyCache()
        })
        // if (path !== this.path || force) {
        //     // console.log('opening path from history', path);
        //     this.cd(path, '', true, true);
        // } else {
        //     console.warn('preventing endless loop');
        // }
    }
    // /history

    /* fs API */
    private api: FsApi
    private fs: Fs
    private prevFs: Fs
    private prevApi: FsApi
    private prevServer: string

    private loginDefer: Deferred<void>

    constructor(path: string, viewId = -1) {
        makeObservable(this, {
            cwd: action,
            list: action,
            rename: action,
            exists: action,
            makedir: action,
            delete: action,
        })

        makeObservable<FileState, 'updatePath'>(this, {
            path: observable,
            sortMethod: observable,
            sortOrder: observable,
            server: observable,
            status: observable,
            error: observable,
            isVisible: observable,
            viewId: observable,
            current: observable,
            showHiddenFiles: observable,
            setStatus: action,
            addPathToHistory: action,
            navHistory: action,
            updatePath: action,
            revertPath: action,
            waitForConnection: action,
            onLoginSuccess: action,
            doLogin: action,
            clearSelection: action,
            reset: action,
            setSort: action,
            updateSelection: action,
            setSelectedFile: action,
            setEditingFile: action,
            emptyCache: action,
            cd: action,
            toggleHiddenFiles: action,
        })

        this.viewId = viewId
        this.path = path
        this.getNewFS(path)
    }

    private saveContext(): void {
        this.prevServer = this.server
        this.prevApi = this.api
        this.prevFs = this.fs
    }

    private restoreContext(): void {
        this.freeFsEvents()
        this.api = this.prevApi
        this.bindFsEvents()
        this.fs = this.prevFs
        this.server = this.prevServer
    }

    private bindFsEvents(): void {
        this.api.on('close', () => this.setStatus('offline'))
        // this.api.on('connect', () => this.setStatus('ok'));
    }

    private freeFsEvents(): void {
        if (this.api) {
            this.api.off()
        }
    }

    onFSChange = (filename: string): void => {
        this.reload()
    }

    private getNewFS(path: string, skipContext = false): Fs {
        const newfs = getFS(path)

        if (newfs) {
            !skipContext && this.api && this.saveContext()

            // we need to free events in any case
            this.freeFsEvents()
            this.fs = newfs
            this.api = new newfs.API(path, this.onFSChange)
            this.bindFsEvents()
        }

        return newfs
    }

    public getAPI(): FsApi {
        return this.api
    }

    public getFS(): Fs {
        return this.fs
    }

    private updatePath(path: string, skipHistory = false): void {
        this.previousPath = this.path
        this.path = path

        if (!skipHistory && this.status !== 'login') {
            this.addPathToHistory(path)
            this.scrollTop = 0
            this.selectedId = null
            this.editingId = null
        }
    }

    revertPath(): void {
        // first revert fs/path
        this.restoreContext()
        // only reload directory if connection hasn't been lost otherwise we enter
        // into an infinite loop
        if (this.api.isConnected()) {
            debugger
            this.navHistory(0)
            this.setStatus('ok')
        }
    }

    onLoginSuccess(): void {
        this.setStatus('ok')
        this.loginDefer.resolve()
    }

    async doLogin(server?: string, credentials?: Credentials): Promise<void> {
        // this.status = 'busy';
        if (server) {
            this.server = this.fs.serverpart(server)
        }

        try {
            await this.api.login(server, credentials)
            this.onLoginSuccess()
        } catch (err) {
            const error = getLocalizedError(err)
            this.loginDefer.reject(error)
        }
        // .then(() => ).catch((err) => {
        //     console.log('error while connecting', err);

        // });

        return this.loginDefer.promise
    }

    clearSelection(): void {
        this.selected.clear()
    }

    reset(): void {
        this.clearSelection()
        this.scrollTop = -1
        this.selectedId = null
        this.editingId = null
    }

    setSort(sortMethod: TSORT_METHOD_NAME, sortOrder: TSORT_ORDER): void {
        this.sortMethod = sortMethod
        this.sortOrder = sortOrder
    }

    updateSelection(isSameDir: boolean): void {
        if (isSameDir) {
            const newSelection = []
            // cache.selected contains files that can be outdated:
            // files may have been removed on reload
            // so we filter the list and remove outdated files.
            for (const selection of this.selected) {
                // use inode/dev to retrieve files that were selected before reload:
                // we cannot use fullname anymore since files may have been renamed
                const newFile = this.files.find(
                    (file) => file.id.dev === selection.id.dev && file.id.ino === selection.id.ino,
                )
                // don't add file to selection list if it is supposed to be hidden and we don't
                // want to show hidden files
                if (newFile && (this.showHiddenFiles || !newFile.fullname.startsWith('.'))) {
                    newSelection.push(newFile)
                }
            }

            if (
                this.selectedId &&
                !this.files.find((file) => file.id.dev === this.selectedId.dev && file.id.ino === this.selectedId.ino)
            ) {
                this.selectedId = null
            }

            // Do not change the selectedId here, we want to keep it
            if (newSelection.length) {
                const selectedFile = newSelection[newSelection.length - 1]
                this.selected.replace(newSelection)
                this.selectedId = {
                    ...selectedFile.id,
                }
            } else {
                this.selected.clear()
                this.selectedId = null
            }
        } else {
            this.selected.clear()
            this.selectedId = null
            this.scrollTop = 0
        }
    }

    setSelectedFile(file: File): void {
        if (file) {
            this.selectedId = {
                ...file.id,
            }
        } else {
            this.selectedId = null
        }
    }

    setEditingFile(file: File): void {
        if (file) {
            this.editingId = {
                ...file.id,
            }
        } else {
            this.editingId = null
        }
    }

    reload(): void {
        if (this.status !== 'busy') {
            this.cd(this.path, '', true, true).catch(this.emptyCache)
        }
    }

    emptyCache = (): void => {
        this.files.clear()
        this.clearSelection()
        this.setStatus('ok', true)
        console.log('emptycache')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleError = (error: any): Promise<void> => {
        console.log('handleError', error)
        // we want to show the error on first nav
        // otherwise we keep previous
        this.setStatus('ok', this.history.length === 0 || this.error)
        const niceError = getLocalizedError(error)
        console.log('orignalCode', error.code, 'newCode', niceError.code)
        AppAlert.show(i18n.i18next.t('ERRORS.GENERIC', { error }), {
            intent: 'danger',
        })
        return Promise.reject(niceError)
    }

    cd(path: string, path2 = '', skipHistory = false, skipContext = false): Promise<string> {
        // first updates fs (eg. was local fs, is now ftp)
        if (this.path !== path) {
            if (this.getNewFS(path, skipContext)) {
                this.server = this.fs.serverpart(path)
                this.credentials = this.fs.credentials(path)
            } else {
                // this.navHistory(0);
                return Promise.reject({
                    message: i18n.i18next.t('ERRORS.CANNOT_READ_FOLDER', { folder: path }),
                    code: 'NO_FS',
                })
            }
        }

        return this.cwd(path, path2, skipHistory)
    }

    // changes current path and retrieves file list
    cwd = withConnection((path: string, path2 = '', skipHistory = false): Promise<string> => {
        const joint = path2 ? this.join(path, path2) : this.api.sanityze(path)
        this.cmd = 'cwd'

        return this.api
            .cd(joint)
            .then((path) => {
                return this.list(path).then((files) => {
                    runInAction(() => {
                        const isSameDir = this.path === path

                        this.files.replace(files as File[])

                        this.updatePath(path, skipHistory)
                        this.cmd = ''

                        // update the cache's selection, keeping files that were previously selected
                        this.updateSelection(isSameDir)

                        this.setStatus('ok')
                    })

                    return path
                })
            })
            .catch((error) => {
                this.cmd = ''
                console.log('error cd/list for path', joint, 'error was', error)
                this.setStatus('ok', true)
                const localizedError = getLocalizedError(error)
                throw localizedError
            })
    }, this.waitForConnection)

    list = withConnection((path: string): Promise<File[] | void> => {
        return this.api.list(path, true).catch(this.handleError)
    }, this.waitForConnection)

    rename = withConnection((source: string, file: File, newName: string): Promise<string | void> => {
        return this.api
            .rename(source, file, newName)
            .then((newName: string) => {
                runInAction(() => {
                    file.fullname = newName
                    this.setStatus('ok')
                })

                return newName
            })
            .catch(this.handleError)
    }, this.waitForConnection)

    exists = withConnection((path: string): Promise<boolean | void> => {
        return this.api
            .exists(path)
            .then((exists) => {
                runInAction(() => {
                    this.setStatus('ok')
                })
                return exists
            })
            .catch(this.handleError)
    }, this.waitForConnection)

    makedir = withConnection((parent: string, dirName: string): Promise<string | void> => {
        return this.api
            .makedir(parent, dirName)
            .then((newDir) => {
                runInAction(() => {
                    this.setStatus('ok')
                })

                return newDir
            })
            .catch(this.handleError)
    }, this.waitForConnection)

    delete = withConnection((source: string, files: File[]): Promise<number | void> => {
        return this.api
            .delete(source, files)
            .then((num) => {
                runInAction(() => {
                    this.setStatus('ok')
                })

                return num
            })
            .catch(this.handleError)
    }, this.waitForConnection)

    size = withConnection((source: string, files: string[]): Promise<number | void> => {
        return this.api.size(source, files).catch(this.handleError)
    }, this.waitForConnection)

    isDir = withConnection((path: string): Promise<boolean> => {
        return this.api.isDir(path)
    }, this.waitForConnection)

    isDirectoryNameValid = (dirName: string): boolean => {
        return this.api.isDirectoryNameValid(dirName)
    }

    join(path: string, path2: string): string {
        return this.api.join(path, path2)
    }

    async openFile(appState: AppState, cache: FileState, file: File): Promise<void> {
        try {
            const path = await appState.prepareLocalTransfer(cache, [file])
            const error = await this.shellOpenFile(path)
            if (error !== false) {
                throw {
                    message: i18n.i18next.t('ERRORS.SHELL_OPEN_FAILED', { path }),
                    code: 'NO_CODE',
                }
            }
        } catch (err) {
            return Promise.reject(err)
        }
    }

    async shellOpenFile(path: string): Promise<boolean> {
        const error = await shell.openPath(path)
        return !!error
    }

    openDirectory(file: { dir: string; fullname: string }): Promise<string | void> {
        return this.cd(file.dir, file.fullname).catch(this.handleError)
    }

    openTerminal(path: string): Promise<void> {
        if (this.getFS().name === 'local') {
            return ipcRenderer.invoke('openTerminal', path)
        }
    }

    openParentDirectory(): void {
        if (!this.isRoot()) {
            const parent = { dir: this.path, fullname: '..' }
            this.openDirectory(parent).catch(() => {
                this.updatePath(this.join(this.path, '..'), true)
                this.emptyCache()
            })
        }
    }

    isRoot(path = this.path): boolean {
        return this.api ? path && this.api.isRoot(path) : false
    }

    toggleHiddenFiles(showHiddenFiles: boolean): void {
        if (showHiddenFiles !== this.showHiddenFiles) {
            this.showHiddenFiles = showHiddenFiles
            this.updateSelection(true)
        }
    }
}
