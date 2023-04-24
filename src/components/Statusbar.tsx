import * as React from 'react'
import { Button, Colors, Icon, Intent } from '@blueprintjs/core'
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
    const showReadOnlyIcon = fileCache.getFS().options.readonly

    const numDirs = filterDirs(files).length
    const numFiles = filterFiles(files).length
    const content = showHiddenFiles ? t('STATUS.HIDE_HIDDEN_FILES') : t('STATUS.SHOW_HIDDEN_FILES')
    const onClick = React.useCallback(
        () => fileCache.setShowHiddenFiles(!showHiddenFiles),
        [fileCache, showHiddenFiles],
    )

    return (
        <div className="status-bar">
            <ToggleHiddenFilesButton showHiddenFiles={showHiddenFiles} content={content} onClick={onClick} />
            {`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                count: numDirs,
            })}`}
            {showReadOnlyIcon && (
                <div
                    style={{
                        flexGrow: 1,
                        display: 'flex',
                        justifyContent: 'end',
                        marginRight: '0.5rem',
                    }}
                >
                    <Icon icon={IconNames.LOCK} color={Colors.GRAY3} title={t('FS.READONLY')} />
                </div>
            )}
        </div>
    )
})

export { Statusbar, ToggleHiddenFilesButton }
