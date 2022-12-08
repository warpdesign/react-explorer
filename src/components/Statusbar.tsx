import * as React from 'react'
import { useState, useEffect } from 'react'
import { InputGroup, ControlGroup, Button, Intent } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Tooltip2 } from '@blueprintjs/popover2'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '$src/hooks/useStores'

const Statusbar = observer(() => {
    const { viewState } = useStores('viewState')
    const { t } = useTranslation()
    const fileCache = viewState.getVisibleCache()
    const [viewHiddenFiles, setViewHiddenFiles] = useState(false)
    const isDisabled = fileCache.error || fileCache.status !== 'ok'
    const numDirs = fileCache.files.filter((file) => file.fullname !== '..' && file.isDir).length
    const numFiles = fileCache.files.filter((file) => !file.isDir).length
    const hiddenToggleIcon = viewHiddenFiles ? IconNames.EYE_OPEN : IconNames.EYE_OFF

    useEffect(() => {
        setViewHiddenFiles(false)
    }, [fileCache.path])

    useEffect(() => {
        fileCache.toggleHiddenFiles(viewHiddenFiles)
    }, [viewHiddenFiles, fileCache])

    const toggleHiddenFilesButton = (
        <Tooltip2
            content={viewHiddenFiles ? t('STATUS.HIDE_HIDDEN_FILES') : t('STATUS.SHOW_HIDDEN_FILES')}
            disabled={isDisabled}
        >
            <Button
                data-cy-paste-bt
                disabled={isDisabled}
                icon={hiddenToggleIcon}
                intent={(!isDisabled && viewHiddenFiles && Intent.PRIMARY) || Intent.NONE}
                onClick={() => setViewHiddenFiles(!viewHiddenFiles)}
                minimal={true}
            />
        </Tooltip2>
    )

    return (
        <ControlGroup>
            <InputGroup
                disabled
                rightElement={toggleHiddenFilesButton}
                value={`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                    count: numDirs,
                })}`}
                className="status-bar"
            />
        </ControlGroup>
    )
})

export { Statusbar }
