import * as React from 'react'
import { InputGroup, ControlGroup, Button, Intent, IconName } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { useStores } from '$src/hooks/useStores'

const Statusbar = observer(() => {
    const { appState, viewState } = useStores('appState', 'viewState')
    const { t } = useTranslation()
    const fileCache = viewState.getVisibleCache()
    const disabled = !fileCache.selected.length
    const numDirs = fileCache.files.filter((file) => file.fullname !== '..' && file.isDir).length
    const numFiles = fileCache.files.filter((file) => !file.isDir).length
    const numSelected = fileCache.selected.length
    const iconName = ((fileCache.getFS() && fileCache.getFS().icon) || 'offline') as IconName
    const offline = classNames('status-bar', { offline: fileCache.status === 'offline' })

    const onClipboardCopy = () => {
        appState.clipboard.setClipboard(viewState.getVisibleCache())
    }

    const copyButton = (
        <Tooltip2 content={t('STATUS.CPTOOLTIP', { count: numSelected })} disabled={disabled}>
            <Button
                data-cy-paste-bt
                disabled={disabled}
                icon="clipboard"
                intent={(!disabled && Intent.PRIMARY) || Intent.NONE}
                onClick={onClipboardCopy}
                minimal={true}
            />
        </Tooltip2>
    )

    return (
        <ControlGroup>
            <InputGroup
                disabled
                leftIcon={iconName}
                rightElement={copyButton}
                value={`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                    count: numDirs,
                })}`}
                className={offline}
            />
        </ControlGroup>
    )
})

export { Statusbar }
