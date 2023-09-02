import { observable, action, runInAction, makeObservable } from 'mobx'
import { shell, ipcRenderer } from 'electron'

import { FsApi, Fs, getFS, FileDescriptor, Credentials, withConnection, FileID, sameID } from '$src/services/Fs'
import { Deferred } from '$src/utils/deferred'
import { i18n } from '$src/locale/i18n'
import { getLocalizedError } from '$src/locale/error'
import { AppState } from '$src/state/appState'
import { getSortMethod, TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'
import { AppAlert } from '$src/components/AppAlert'
import { filterDirs, filterFiles, filterHiddenFiles } from '$src/utils/fileUtils'
import { ViewModeName } from '$src/hooks/useViewMode'

export type TStatus = 'busy' | 'ok' | 'login' | 'offline'

export interface HistoryEntry {
    viewmode: ViewModeName
    path: string
    showHiddenFiles: boolean
    sortMethod: TSORT_METHOD_NAME
    sortOrder: TSORT_ORDER
}

export class FileState {
    /* observable properties start here */
    // history
    path = ''
    sortMethod: TSORT_METHOD_NAME = 'name'
    sortOrder: TSORT_ORDER = 'asc'
    showHiddenFiles = false
    viewmode: ViewModeName = 'details'
    // /history

    previousPath: string
    readonly files = observable<FileDescriptor>([])
    readonly allFiles = observable<FileDescriptor>([])

    readonly selected = observable<FileDescriptor>([])

    // the last element that was selected
    cursor: FileDescriptor | null = null
    // element that's being edited
    editingId: FileID = null

    server = ''

    credentials: Credentials

    status: TStatus = 'ok'

    error = false
    previousError = false

    cmd = ''

    isVisible = false

    viewId = -1

    // history stuff
    history = observable<HistoryEntry>([])
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
        if (!error) {
            this.previousError = this.error
            this.error = false
        } else {
            if (this.history.length === 0 || this.previousError) {
                this.error = true
            }
        }
    }

    addCurrentStateToHistory(): void {
        const keep = this.history.slice(0, this.current + 1)
        this.history.replace(
            keep.concat([
                {
                    path: this.path,
                    viewmode: this.viewmode,
                    showHiddenFiles: this.showHiddenFiles,
                    sortMethod: this.sortMethod,
                    sortOrder: this.sortOrder,
                },
            ]),
        )
        this.current++
    }

    async navHistory(dir = -1, force = false): Promise<string | void> {
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

        const { path, showHiddenFiles, sortOrder, sortMethod, viewmode } = history[newCurrent]

        try {
            // set history properties that influence listing before cd
            // otherwise we would sort the files twice
            this.showHiddenFiles = showHiddenFiles
            this.sortOrder = sortOrder
            this.sortMethod = sortMethod
            this.viewmode = viewmode
            await this.cd(path, '', true, true)
        } catch (e) {
            this.updatePath(path, true)
            this.emptyCache()
        }
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
            viewmode: observable,
            status: observable,
            error: observable,
            isVisible: observable,
            viewId: observable,
            current: observable,
            showHiddenFiles: observable,
            setStatus: action,
            addCurrentStateToHistory: action,
            navHistory: action,
            updatePath: action,
            revertPath: action,
            waitForConnection: action,
            onLoginSuccess: action,
            doLogin: action,
            clearSelection: action,
            invertSelection: action,
            reset: action,
            setSort: action,
            refreshSelection: action,
            addToSelection: action,
            toggleSelection: action,
            selectAll: action,
            setCursor: action,
            setEditingFile: action,
            emptyCache: action,
            cd: action,
            setShowHiddenFiles: action,
            getSelectedState: observable,
            updateFiles: action,
            cursor: observable,
            editingId: observable,
            isSelected: observable,
            setViewMode: action,
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
        if (this.viewmode !== 'tiles') {
            this.reload()
        }
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

    public getSelectedState(name: string) {
        return this.selected.find(({ fullname }) => fullname === name)
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
            this.addCurrentStateToHistory()
            this.setCursor(null)
            this.editingId = null

            // hide hidden files when changing directory unless
            // the directory is being reloaded
            this.setShowHiddenFiles(false)
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
        this.setCursor(null)
        this.editingId = null
    }

    setSort(sortMethod: TSORT_METHOD_NAME, sortOrder?: TSORT_ORDER): void {
        // if same sort method, invert order
        if (!sortOrder) {
            if (this.sortMethod === sortMethod) {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
            } else {
                this.sortOrder = 'asc'
            }
        } else {
            this.sortOrder = sortOrder
        }

        this.sortMethod = sortMethod

        this.updateFiles()
    }

    // Called when fileCache is updated:
    // - from filewatch
    // - because user asked for a refresh
    // - because the path has been updated
    //
    // We either clear the selection (if path has changed)
    // or keep selected files that are still there
    refreshSelection(isSameDir: boolean): void {
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

            // if last clicked element isn't in the list of files,
            // simply reset cursorFileId
            if (this.cursor && !this.files.find((file) => sameID(this.cursor.id, file.id))) {
                this.setCursor(null)
            }

            // Do not change the selectedId here, we want to keep it
            if (newSelection.length) {
                const selectedFile = newSelection[newSelection.length - 1]
                this.selected.replace(newSelection)
                this.setCursor(selectedFile)
            } else {
                this.selected.clear()
                this.setCursor(null)
            }
        } else {
            this.selected.clear()
            this.setCursor(null)
        }
    }

    getFileIndex(file?: FileDescriptor): number {
        return file ? this.files.findIndex((currentFile) => sameID(file.id, currentFile.id)) : -1
    }

    addToSelection(file: FileDescriptor, extendSelection = false) {
        console.log('addToSelection', file.fullname, extendSelection)
        if (!extendSelection) {
            this.selected.replace([file])
        } else {
            // find highest selected index
            let maxIndex = -1
            let minIndex = this.files.length
            const fileIndex = this.getFileIndex(file)
            const previousIndex = this.getFileIndex(this.cursor)
            const isInSelection = !!this.selected.find((selected) => file === selected)

            this.selected.forEach((selected) => {
                const index = this.getFileIndex(selected)
                maxIndex = Math.max(maxIndex, index)
                minIndex = Math.min(minIndex, index)
            })

            console.log({ maxIndex, minIndex, previousIndex, fileIndex })

            let start = 0,
                end = 0

            if (!isInSelection) {
                start = Math.min(fileIndex, minIndex)
                end = Math.max(fileIndex, maxIndex) + 1
            } else {
                if (fileIndex > previousIndex) {
                    start = fileIndex
                    end = maxIndex + 1
                } else {
                    start = minIndex
                    end = fileIndex + 1
                }
            }

            this.selected.replace(this.files.slice(start, end))
        }

        console.log('added', file)

        this.setCursor(file)
    }

    toggleSelection(file: FileDescriptor) {
        const found = !!this.selected.some((selectedFile) => sameID(selectedFile.id, file.id))

        if (found) {
            this.selected.remove(file)
        } else {
            this.selected.push(file)
            this.setCursor(file)
        }
    }

    selectAll() {
        const length = this.files.length
        if (length) {
            this.selected.replace(this.files)
            this.setCursor(this.selected[length - 1])
        }
    }

    invertSelection() {
        if (this.selected.length === this.files.length) {
            this.selected.clear()
        } else {
            const newSelection = this.files.filter(
                (file) => !this.selected.find((selected) => sameID(file.id, selected.id)),
            )
            this.selected.replace(newSelection)
        }
    }

    setCursor(file: FileDescriptor | null): void {
        this.cursor = file
    }

    setEditingFile(file: FileDescriptor): void {
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
        this.allFiles.clear()
        this.clearSelection()
        this.setStatus('ok', true)
        console.log('emptycache')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleError = (error: any): Promise<void> => {
        console.log('handleError', error)
        // we want to show the error on first nav
        // otherwise we keep previous
        this.setStatus('ok', true)
        const niceError = getLocalizedError(error)
        // console.log('orignalCode', error.code, 'newCode', niceError.code)
        AppAlert.show(i18n.i18next.t('ERRORS.GENERIC', { error: niceError }), {
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
    cwd = withConnection(async (path: string, path2 = '', skipHistory = false): Promise<string> => {
        const joint = path2 ? this.join(path, path2) : this.api.sanityze(path)
        this.cmd = 'cwd'

        try {
            const path = await this.api.cd(joint)
            const files: FileDescriptor[] = await this.list(path)
            runInAction(() => {
                const isSameDir = this.path === path

                this.updateFiles(files)
                this.updatePath(path, skipHistory)
                this.cmd = ''

                // update the cache's selection, keeping files that were previously selected
                this.refreshSelection(isSameDir)

                this.setStatus('ok')
            })
            return path
        } catch (error) {
            this.cmd = ''
            console.log('error cd/list for path', joint, 'error was', error)
            this.setStatus('ok', true)
            throw getLocalizedError(error)
        }
    }, this.waitForConnection)

    list = withConnection((path: string): Promise<FileDescriptor[] | void> => {
        return this.api.list(path, true).catch(this.handleError)
    }, this.waitForConnection)

    rename = withConnection((source: string, file: FileDescriptor, newName: string): Promise<string | void> => {
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

    delete = withConnection((source: string, files: FileDescriptor[]): Promise<number | void> => {
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

    async openFile(appState: AppState, file: FileDescriptor): Promise<void> {
        try {
            const path = await appState.prepareLocalTransfer(this, [file])
            const error = await shell.openPath(path)
            if (error) {
                this.handleError({
                    code: 'SHELL_OPEN_FAILED',
                })
            }
        } catch (err) {
            this.handleError(err)
        }
    }

    openDirectory(file: { dir: string; fullname: string }): Promise<string | void> {
        console.log(file.dir, file.fullname)
        return file.fullname === '' ? this.cd(file.dir, file.fullname) : Promise.resolve(file.fullname)
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

    setShowHiddenFiles(showHiddenFiles: boolean): void {
        if (!this.error && this.status === 'ok') {
            if (showHiddenFiles !== this.showHiddenFiles) {
                this.showHiddenFiles = showHiddenFiles
                if (this.showHiddenFiles) {
                    this.files.replace(this.allFiles)
                } else {
                    this.files.replace(filterHiddenFiles(this.allFiles))
                }
                this.refreshSelection(true)
            }
        }
    }

    updateFiles(newFiles: FileDescriptor[] = this.allFiles): void {
        const dirs = filterDirs(newFiles)
        const files = filterFiles(newFiles)
        const SortFn = getSortMethod(this.sortMethod, this.sortOrder)

        const sortedFiles = dirs
            .sort(this.sortMethod !== 'size' ? SortFn : getSortMethod('name', 'asc'))
            .concat(files.sort(SortFn))

        this.allFiles.replace(sortedFiles)

        this.files.replace(this.showHiddenFiles ? this.allFiles : filterHiddenFiles(sortedFiles))
    }

    isSelected(file: FileDescriptor): boolean {
        return !!this.selected.find((selectedFile) => sameID(file.id, selectedFile.id))
    }

    setViewMode(newViewMode: ViewModeName) {
        this.viewmode = newViewMode
    }
}
