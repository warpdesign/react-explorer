import * as React from 'react'
import { InputGroup, ControlGroup, Button, Intent } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Tooltip2 } from '@blueprintjs/popover2'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import { useStores } from '$src/hooks/useStores'
import { filterDirs, filterFiles } from '$src/utils/fileUtils'

interface Props {
    content: string
    showHiddenFiles: boolean
    onClick: () => void
}

const ToggleHiddenFilesButton = ({ content, showHiddenFiles, onClick }: Props) => {
    const hiddenToggleIcon = showHiddenFiles ? IconNames.EYE_OPEN : IconNames.EYE_OFF

    return (
        <Tooltip2 content={content}>
            <Button
                data-cy-paste-bt
                icon={hiddenToggleIcon}
                intent={(showHiddenFiles && Intent.PRIMARY) || Intent.NONE}
                onClick={onClick}
                minimal={true}
            />
        </Tooltip2>
    )
}

const Statusbar = observer(() => {
    const { viewState } = useStores('viewState')
    const { t } = useTranslation()
    const fileCache = viewState.getVisibleCache()
    const { files, showHiddenFiles } = fileCache

    const numDirs = filterDirs(files).length
    const numFiles = filterFiles(files).length
    const content = showHiddenFiles ? t('STATUS.HIDE_HIDDEN_FILES') : t('STATUS.SHOW_HIDDEN_FILES')
    const onClick = React.useCallback(
        () => fileCache.setShowHiddenFiles(!showHiddenFiles),
        [fileCache, showHiddenFiles],
    )

    return (
        <ControlGroup>
            <InputGroup
                disabled
                rightElement={
                    <ToggleHiddenFilesButton showHiddenFiles={showHiddenFiles} content={content} onClick={onClick} />
                }
                value={`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                    count: numDirs,
                })}`}
                className="status-bar"
            />
        </ControlGroup>
    )
})

export { Statusbar, ToggleHiddenFilesButton }
