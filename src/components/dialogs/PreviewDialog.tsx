import React, { KeyboardEvent as KE, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStores } from '$src/hooks/useStores'
import { Button, Classes, Colors, Dialog, Icon } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer'
import { TypeIcons } from '$src/constants/icons'
import { formatBytes } from '$src/utils/formatBytes'
import { FileDescriptor } from '$src/services/Fs'
import { FileState } from '$src/state/fileState'
import { useTranslation } from 'react-i18next'

const lightTheme = {
    tertiary: Colors.WHITE,
    disableThemeScrollbar: true,
}

const darkTheme = {
    tertiary: Colors.DARK_GRAY3,
    textPrimary: Colors.WHITE,
    textSecondary: Colors.LIGHT_GRAY1,
    textTertiary: Colors.GRAY2,
    disableThemeScrollbar: true,
}

export const PreviewDialog = observer(() => {
    const { appState, settingsState } = useStores('appState', 'settingsState')
    const { isPreviewOpen } = appState
    const view = appState.activeView
    const cache = view.getVisibleCache()
    const cursorIndex = cache.getFileIndex(cache.cursor)
    const docs = useMemo(() => {
        return cache.files.map((file) => ({ uri: cache.join(file.dir, file.fullname).replace(/#/g, '%23') }))
    }, [cache.cursor])
    const activeDocument = docs[cursorIndex]
    const { isDir, type, length, mDate } = cache.cursor || ({} as FileDescriptor)
    const icon = (isDir && TypeIcons['dir']) || (type && TypeIcons[type]) || TypeIcons['any']
    const size = (length && formatBytes(length)) || 0
    const theme = settingsState.isDarkModeActive ? darkTheme : lightTheme

    const Header = ({ cache }: { cache: FileState }) => {
        const file = cache.cursor
        const { t } = useTranslation()

        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 1,
                    columnGap: '20px',
                }}
            >
                <p
                    style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: 0,
                    }}
                >
                    {file.fullname}
                </p>
                {file.isDir === false && (
                    <Button onClick={() => cache.openFile(appState, cache.cursor)}>{t('DIALOG.PREVIEW.OPEN')}</Button>
                )}
            </div>
        )
    }

    const NoPreviewRenderer = ({ document, fileName }: any) => {
        const { t } = useTranslation()
        const fileText = fileName || document?.fileType || ''
        const modifiedString = (mDate && t('DIALOG.PREVIEW.LAST_MODIFIED_ON', { date: mDate.toLocaleString() })) || ''

        return (
            <div style={{ display: 'flex', padding: '16px 32px', columnGap: '40px' }}>
                <div>
                    <Icon icon={icon} size={100} color={Colors.GRAY3} />
                </div>
                <div>
                    {fileText && <h3>{fileText}</h3>}
                    <p
                        style={{
                            color: Colors.GRAY3,
                        }}
                    >
                        {!isDir && <>{size}</>}
                        <br />
                        {modifiedString}
                    </p>
                </div>
            </div>
        )
    }

    return (
        cache.cursor && (
            <Dialog
                icon={icon}
                style={{ width: '66%' }}
                title={<Header cache={cache} />}
                isOpen={isPreviewOpen}
                onClose={() => appState.togglePreviewDialog(false)}
            >
                <div className={Classes.DIALOG_BODY}>
                    <DocViewer
                        style={{
                            maxHeight: '80vh',
                        }}
                        config={{
                            header: {
                                disableHeader: true,
                            },
                            noRenderer: {
                                overrideComponent: NoPreviewRenderer,
                            },
                            txtCodeTheme: settingsState.isDarkModeActive ? 'nord' : 'xcode',
                        }}
                        documents={docs}
                        initialActiveDocument={activeDocument}
                        activeDocument={activeDocument}
                        pluginRenderers={DocViewerRenderers}
                        theme={theme}
                    />
                </div>
            </Dialog>
        )
    )
})
