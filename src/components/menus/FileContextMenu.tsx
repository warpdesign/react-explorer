import React from 'react'
import { Menu, MenuItem, MenuDivider, Intent } from '@blueprintjs/core'
import { AppState } from '$src/state/appState'
import { useStores } from '$src/hooks/useStores'
import { File, sameID } from '$src/services/Fs'
import { useTranslation } from 'react-i18next'

interface Props {
    fileUnderMouse: File | null
}

const FileContextMenu = ({ fileUnderMouse }: Props) => {
    const { t } = useTranslation()
    const { appState } = useStores('appState')
    const clipboard = appState.clipboard
    const cache = appState.getActiveCache()

    const numFilesInClipboard = clipboard.files.length
    const isInSelection = fileUnderMouse && !!cache.selected.find((file) => sameID(file, fileUnderMouse))
    const isPasteEnabled = numFilesInClipboard && ((!fileUnderMouse && !cache.error) || fileUnderMouse?.isDir)

    const onCopy = () => {
        clipboard.setClipboard(cache, !isInSelection ? [fileUnderMouse] : undefined)
    }

    const onPaste = () => {
        appState.paste(cache)
    }

    const onDelete = () => {
        appState.delete(!isInSelection ? [fileUnderMouse] : undefined)
    }

    // copy enabled:
    // - file/dir under cursor
    // files to be copied
    // - mouse under selection: selection
    // - mouse under non selected file: file

    // paste enabled:
    // clipboard not empty &&
    // * mouse over file && file.isDir
    // .   OR
    // * mouse over empty area
    //

    // delete enabled:
    // - over element
    // => elements to delete:
    // - mouse over selection ? => selection
    // - mouse over non selection ? => single element
    return (
        <Menu>
            <MenuItem icon="duplicate" text={t('APP_MENUS.COPY')} disabled={!fileUnderMouse} onClick={onCopy} />
            <MenuItem icon="clipboard" text={t('APP_MENUS.PASTE')} disabled={!isPasteEnabled} onClick={onPaste} />
            <MenuDivider />
            <MenuItem
                icon="delete"
                intent={Intent.DANGER}
                text={t('APP_MENUS.DELETE')}
                disabled={!fileUnderMouse}
                onClick={onDelete}
            />
        </Menu>
    )
}

export { FileContextMenu }
