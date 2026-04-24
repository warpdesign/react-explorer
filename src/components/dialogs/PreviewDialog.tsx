import React, { useMemo, useRef } from 'react'
import { useStores } from '$src/hooks/useStores'
import { Modal, Button, Group, Text, Box, useMantineTheme } from '@mantine/core'
import { observer } from 'mobx-react'
import DocViewer, { DocViewerRenderers, IConfig, IDocument } from 'react-doc-viewer'
import { TypeIconsTabler } from '$src/constants/icons'
import { formatBytes } from '$src/utils/formatBytes'
import { FileDescriptor } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { useTranslation } from 'react-i18next'

const lightTheme = {
    disableThemeScrollbar: true,
}

const darkTheme = {
    disableThemeScrollbar: true,
}

export const PreviewDialog = observer(() => {
    const { appState, settingsState } = useStores('appState', 'settingsState')
    const { isPreviewOpen } = appState
    const view = appState.activeView
    const cache = view.getVisibleCache()
    const cursorIndex = cache.getFileIndex(cache.cursor)
    const currentFile = cache.join(cache.cursor.dir, cache.cursor.fullname).replace(/#/g, '%23')
    const docs = useMemo(() => {
        return cache.files.map((file) => ({ uri: cache.join(file.dir, file.fullname).replace(/#/g, '%23') }))
    }, [currentFile])
    const activeDocumentRef = useRef<IDocument>({
        ...docs[cursorIndex],
    })
    activeDocumentRef.current.uri = docs[cursorIndex].uri
    const { isDir, type } = cache.cursor || ({} as FileDescriptor)
    const icon = (isDir && TypeIconsTabler['dir']) || (type && TypeIconsTabler[type]) || TypeIconsTabler['any']
    const theme = settingsState.isDarkModeActive ? darkTheme : lightTheme

    const Header = ({ cache }: { cache: FileState }) => {
        const file = cache.cursor
        const { t } = useTranslation()

        return (
            <Group justify="space-between" align="center" wrap="nowrap" gap="md" style={{ flexShrink: 1 }}>
                <Text
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {file.fullname}
                </Text>
                {file.isDir === false && (
                    <Button onClick={() => cache.openFile(appState, cache.cursor)} size="sm" variant="light">
                        {t('DIALOG.PREVIEW.OPEN')}
                    </Button>
                )}
            </Group>
        )
    }

    const NoPreviewRenderer = ({ document, fileName }: any) => {
        const { t } = useTranslation()
        const theme = useMantineTheme()
        const fileText = fileName || document?.fileType || ''
        const { mDate, length, type, isDir } = cache.cursor
        const IconComponent =
            (isDir && TypeIconsTabler['dir']) || (type && TypeIconsTabler[type]) || TypeIconsTabler['any']
        const size = (length && formatBytes(length)) || 0
        const modifiedString = (mDate && t('DIALOG.PREVIEW.LAST_MODIFIED_ON', { date: mDate.toLocaleString() })) || ''

        return (
            <Group gap="xl" p="md" align="flex-start" wrap="nowrap">
                <Box>
                    <IconComponent size={100} color={theme.colors.gray[5]} />
                </Box>
                <Box>
                    {fileText && (
                        <Text size="lg" fw={600} mb="xs">
                            {fileText}
                        </Text>
                    )}
                    <Text c="dimmed">
                        {!isDir && <>{size}</>}
                        <br />
                        {modifiedString}
                    </Text>
                </Box>
            </Group>
        )
    }

    // pre-calculate config to prevent unncessary re-rendering of the preview
    const viewerConfig: IConfig = useMemo(
        () => ({
            header: {
                disableHeader: true,
            },
            noRenderer: {
                overrideComponent: NoPreviewRenderer,
            },
            txtCodeTheme: settingsState.isDarkModeActive ? 'nord' : 'xcode',
        }),
        [],
    )

    return (
        cache.cursor && (
            <Modal
                opened={isPreviewOpen}
                onClose={() => appState.togglePreviewDialog(false)}
                title={
                    <Group gap="xs">
                        {React.createElement(icon, { size: 20 })}
                        <Header cache={cache} />
                    </Group>
                }
                size="66%"
                centered
                withCloseButton
            >
                <DocViewer
                    style={{
                        maxHeight: '80vh',
                    }}
                    config={viewerConfig}
                    documents={docs}
                    initialActiveDocument={activeDocumentRef.current}
                    activeDocument={activeDocumentRef.current}
                    pluginRenderers={DocViewerRenderers}
                    theme={theme}
                />
            </Modal>
        )
    )
})
