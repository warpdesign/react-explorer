import React from 'react'
import { Menu } from '@mantine/core'
import { IconCopy, IconClipboard, IconTrash } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

import { useStores } from '$src/hooks/useStores'
import { FileDescriptor, sameID } from '$src/services/Fs'

interface Props {
    fileUnderMouse: FileDescriptor | null
}

const FileContextMenu = ({ fileUnderMouse }: Props) => {
    const { t } = useTranslation()
    const { appState } = useStores('appState')
    const clipboard = appState.clipboard
    const cache = appState.getActiveCache()

    // TODO: disable delete/paste when cahce.fs.readonly is true
    const numFilesInClipboard = clipboard.files.length
    const isInSelection = fileUnderMouse && !!cache.selected.find((file) => sameID(file.id, fileUnderMouse.id))
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
        <>
            <Menu.Item leftSection={<IconCopy size={16} />} disabled={!fileUnderMouse} onClick={onCopy}>
                {t('APP_MENUS.COPY')}
            </Menu.Item>
            <Menu.Item leftSection={<IconClipboard size={16} />} disabled={!isPasteEnabled} onClick={onPaste}>
                {t('APP_MENUS.PASTE')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconTrash size={16} />} color="red" disabled={!fileUnderMouse} onClick={onDelete}>
                {t('APP_MENUS.DELETE')}
            </Menu.Item>
        </>
    )
}

export { FileContextMenu }
