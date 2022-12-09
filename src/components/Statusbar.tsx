import * as React from 'react'
import { useState, useEffect } from 'react'
import { InputGroup, ControlGroup, Button, Intent } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Tooltip2 } from '@blueprintjs/popover2'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '$src/hooks/useStores'
import { filterDirs, filterFiles } from '$src/utils/fileUtils'

const Statusbar = observer(() => {
    const { viewState } = useStores('viewState')
    const { t } = useTranslation()
    const fileCache = viewState.getVisibleCache()
    const { files, showHiddenFiles, error, status } = fileCache

    const numDirs = filterDirs(files, showHiddenFiles).length
    const numFiles = filterFiles(files, showHiddenFiles).length
    const isDisabled = error || status !== 'ok'
    const hiddenToggleIcon = showHiddenFiles ? IconNames.EYE_OPEN : IconNames.EYE_OFF

    const toggleHiddenFilesButton = (
        <Tooltip2
            content={showHiddenFiles ? t('STATUS.HIDE_HIDDEN_FILES') : t('STATUS.SHOW_HIDDEN_FILES')}
            disabled={isDisabled}
        >
            <Button
                data-cy-paste-bt
                disabled={isDisabled}
                icon={hiddenToggleIcon}
                intent={(!isDisabled && showHiddenFiles && Intent.PRIMARY) || Intent.NONE}
                onClick={() => fileCache.setShowHiddenFiles(!showHiddenFiles)}
                minimal={true}
            />
        </Tooltip2>
    )

    return (
        <ControlGroup>
            <InputGroup
                disabled
                rightElement={!isDisabled && toggleHiddenFilesButton}
                value={`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                    count: numDirs,
                })}`}
                className="status-bar"
            />
        </ControlGroup>
    )
})

export { Statusbar }
