import React from 'react'
import { Menu, MenuItem, ContextMenu, MenuDivider } from '@blueprintjs/core'
import { AppState } from '$src/state/appState'

interface Position {
    left: number
    top: number
}

interface Props {
    onCopy?: () => void
    onClose?: () => void
    onDelete?: () => void
    onPaste?: () => void
    appState: AppState
}

const FileContextMenu = ({ onCopy, onClose, onDelete, onPaste, appState }: Props) => {
    const numFilesInClipboard = appState.clipboard.files.length
    const cache = appState.getActiveCache()
    const numSelectedFiles = cache.selected.length
    // copy enabled:
    // - file/dir unde rcursor
    // files to be copied
    // - mouse under selection: selection
    // - mouse under non selected file: file

    // paste enabled:
    // clipboard not empty &&
    // * mouse over file ?
    //   - (selection.length === 0 && !error)
    // .   OR
    //   - (selection.length === 1 && isDir)
    // * mouse over empty area
    //

    // delete enabled:
    // selection.length > 0
    return (
        <Menu>
            <MenuItem text="Copy" disabled={!numSelectedFiles} />
            <MenuItem text="Paste" disabled={!numFilesInClipboard} />
            <MenuDivider />
            <MenuItem text="Delete" disabled={!numSelectedFiles} />
        </Menu>
    )
}

const showFileContextMenu = ({ left, top, ...rest }: Position & Props) => {
    ContextMenu.show(<FileContextMenu {...rest} />, { left, top })
}

export { showFileContextMenu }
