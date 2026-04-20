import * as React from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
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
    const HiddenToggleIcon = showHiddenFiles ? IconEye : IconEyeOff

    return (
        <Tooltip label={content}>
            <ActionIcon onClick={onClick} variant="transparent" color={showHiddenFiles ? 'blue' : 'gray'} size="sm">
                <HiddenToggleIcon size={16} />
            </ActionIcon>
        </Tooltip>
    )
}

const Statusbar = observer(() => {
    const { viewState } = useStores('viewState')
    const { t } = useTranslation()
    const fileCache = viewState?.getVisibleCache()
    const { files, showHiddenFiles } = fileCache || { files: [], showHiddenFiles: false }

    const numDirs = filterDirs(files).length
    const numFiles = filterFiles(files).length
    const content = showHiddenFiles ? t('STATUS.HIDE_HIDDEN_FILES') : t('STATUS.SHOW_HIDDEN_FILES')
    const onClick = React.useCallback(
        () => fileCache?.setShowHiddenFiles(!showHiddenFiles),
        [fileCache, showHiddenFiles],
    )

    return (
        <div className="status-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ToggleHiddenFilesButton showHiddenFiles={showHiddenFiles} content={content} onClick={onClick} />
            {`${t('STATUS.FILES', { count: numFiles })}, ${t('STATUS.FOLDERS', {
                count: numDirs,
            })}`}
        </div>
    )
})

export { Statusbar, ToggleHiddenFilesButton }
