import React from 'react'
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core'
import { AppState } from '$src/state/appState'
import { useStores } from '$src/hooks/useStores'
import { File, sameID } from '$src/services/Fs'

interface Props {
    fileUnderMouse: File | null
}

const FileContextMenu = ({ fileUnderMouse }: Props) => {
    const { appState } = useStores<AppState>('appState')
    const clipboard = appState.clipboard
    const cache = appState.getActiveCache()

    const numFilesInClipboard = clipboard.files.length
    const numSelectedFiles = cache.selected.length
    const isInSelection = fileUnderMouse && !!cache.selected.find((file) => sameID(file, fileUnderMouse))
    const isPasteEnabled = numFilesInClipboard && ((!fileUnderMouse && !cache.error) || fileUnderMouse?.isDir)

    const onCopy = () => {
        console.log('onCopy', isInSelection ? 'need to copy selection' : 'need to copy only selected file')
        clipboard.setClipboard(cache, !isInSelection ? [fileUnderMouse] : undefined)
    }

    const onPaste = () => {
        console.log('onPaste')
    }

    const onDelete = () => {
        console.log('onDelete')
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
            <MenuItem text="Copy" disabled={!fileUnderMouse} onClick={onCopy} />
            <MenuItem text="Paste" disabled={!isPasteEnabled} onClick={onPaste} />
            <MenuDivider />
            <MenuItem text="Delete" disabled={!fileUnderMouse} onClick={onDelete} />
        </Menu>
    )
}

export { FileContextMenu }
