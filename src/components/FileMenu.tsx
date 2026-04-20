import * as React from 'react'
import { Menu } from '@mantine/core'
import { IconFolderPlus, IconCopy, IconTrash } from '@tabler/icons-react'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'

import { useStores } from '$src/hooks/useStores'

interface FileMenuProps {
    onFileAction: (action: string) => void
    selectedItemsLength: number
    isDisabled: boolean
}

export const FileMenu = observer(({ onFileAction, selectedItemsLength, isDisabled }: FileMenuProps) => {
    const onNewfolder = (): void => {
        onFileAction('makedir')
    }

    const onPaste = (): void => {
        onFileAction('paste')
    }

    const onDelete = (): void => {
        onFileAction('delete')
    }

    const { t } = useTranslation()
    const { appState } = useStores('appState')
    const clipboardLength = appState.clipboard.files.length

    return (
        <>
            <Menu.Item leftSection={<IconFolderPlus size={16} />} onClick={onNewfolder} disabled={isDisabled}>
                {t('COMMON.MAKEDIR')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconCopy size={16} />} onClick={onPaste} disabled={!clipboardLength || isDisabled}>
                {t('FILEMENU.PASTE', { count: clipboardLength })}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
                leftSection={<IconTrash size={16} />}
                onClick={onDelete}
                disabled={!selectedItemsLength || isDisabled}
                color={selectedItemsLength ? 'red' : undefined}
            >
                {t('FILEMENU.DELETE', { count: selectedItemsLength })}
            </Menu.Item>
        </>
    )
})
