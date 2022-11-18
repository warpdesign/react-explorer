import { action, observable, makeObservable } from 'mobx'
import { clipboard } from 'electron'
import { File, FsApi } from '$src/services/Fs'
import { lineEnding } from '$src/utils/platform'
import { FileState } from '$src/state/fileState'
import type { TFunction } from 'i18next'
import { i18n } from '$src/locale/i18n'
import { Intent } from '@blueprintjs/core'
import { AppToaster } from '$src/components/AppToaster'

/**
 * Interface for a clipboard entry
 *
 * @interface
 */
export interface Clipboard {
    srcFs: FsApi
    srcPath: string
    files: File[]
}

export class ClipboardState {
    srcPath = ''
    srcFs: FsApi = null
    files = observable<File>([])

    t: TFunction

    constructor() {
        makeObservable(this, {
            srcFs: observable,
            srcPath: observable,
            setClipboard: action,
            copySelectedItemsPath: action,
        })
        this.t = i18n.i18next.t
    }

    setClipboard(fileState: FileState, files?: File[]): void {
        const filesToCopy = files || fileState.selected.slice(0)
        const length = filesToCopy.length

        this.srcFs = fileState.getAPI()
        this.srcPath = fileState.path
        this.files.replace(filesToCopy)

        length &&
            AppToaster.show(
                {
                    message: this.t('COMMON.CP_COPIED', { count: length }),
                    icon: 'tick',
                    intent: Intent.NONE,
                },
                undefined,
                true,
            )
    }

    copySelectedItemsPath(fileState: FileState, filenameOnly = false): void {
        const files = fileState.selected

        if (files.length) {
            const pathnames = files.map((file) => fileState.join((!filenameOnly && file.dir) || '', file.fullname))
            const text = pathnames.join(lineEnding)
            clipboard.writeText(text)
            AppToaster.show(
                {
                    message: filenameOnly
                        ? this.t('COMMON.CP_NAMES_COPIED', { count: length })
                        : this.t('COMMON.CP_PATHS_COPIED', { count: length }),
                    icon: 'tick',
                    intent: Intent.NONE,
                },
                undefined,
                true,
            )
        }
    }
}
