import * as React from 'react'
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'

import { useStores } from '$src/hooks/useStores'

interface FileMenuProps {
    onFileAction: (action: string) => void
    selectedItemsLength: number
    isDisabled: boolean
}

export const FileMenu = observer(({ onFileAction, selectedItemsLength, isDisabled }: FileMenuProps) => {
    const onApplyTags = (): void => {
        onFileAction('applytags')
    }

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
            <Menu>
                <MenuItem
                    text={t('FILEMENU.APPLY_TAGS')}
                    icon="tag"
                    onClick={onApplyTags}
                    disabled={!selectedItemsLength || isDisabled}
                />
                <MenuDivider />
                <MenuItem disabled={isDisabled} text={t('COMMON.MAKEDIR')} icon="folder-new" onClick={onNewfolder} />
                <MenuDivider />
                <MenuItem
                    text={t('FILEMENU.PASTE', { count: clipboardLength })}
                    icon="duplicate"
                    onClick={onPaste}
                    disabled={!clipboardLength || isDisabled}
                />
                <MenuDivider />
                <MenuItem
                    text={t('FILEMENU.DELETE', { count: selectedItemsLength })}
                    onClick={onDelete}
                    intent={(selectedItemsLength && 'danger') || 'none'}
                    icon="delete"
                    disabled={!selectedItemsLength || isDisabled}
                />
            </Menu>
        </>
    )
})
