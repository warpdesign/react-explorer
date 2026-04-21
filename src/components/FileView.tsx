import React, { useCallback, useRef, MutableRefObject, useState } from 'react'
import { observer } from 'mobx-react'
import { Menu } from '@mantine/core'
import { useHotkeys } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { ipcRenderer } from 'electron'

import { FileDescriptor, sameID } from '$src/services/Fs'
import { formatBytes } from '$src/utils/formatBytes'
import { isEditable, shouldCatchEvent } from '$src/utils/dom'
import { isMac } from '$src/utils/platform'
import { FileState } from '$src/state/fileState'
import { FileContextMenu } from '$src/components/menus/FileContextMenu'
import { useMenuAccelerator } from '$src/hooks/useAccelerator'
import { TypeIconsTabler } from '$src/constants/icons'

import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { HeaderMouseEvent, InlineEditEvent, ItemMouseEvent, useViewMode } from '$src/hooks/useViewMode'
import { useStores } from '$src/hooks/useStores'
import { useKeyDown } from '$src/hooks/useKeyDown'

interface Props {
    hide: boolean
}

export function buildNodeFromFile(
    file: FileDescriptor,
    { isSelected, isEditing }: { isSelected: boolean; isEditing: boolean },
): FileViewItem {
    const filetype = file.type
    const classes = classNames({
        isHidden: file.fullname.startsWith('.'),
        isSymlink: file.isSym,
    })

    const res: FileViewItem = {
        icon:
            (file.isDir && TypeIconsTabler['dir']) || (filetype && TypeIconsTabler[filetype]) || TypeIconsTabler['any'],
        name: file.fullname,
        title: file.isSym ? `${file.fullname} → ${file.target}` : file.fullname,
        nodeData: file,
        className: classes,
        isSelected: !!isSelected,
        isEditing,
        size: (!file.isDir && formatBytes(file.length)) || '--',
    }

    return res
}

const onInvertSelection = (cache: FileState): void => {
    const isOverlayOpen = document.querySelector('[data-mantine-portal]') !== null
    if (!isOverlayOpen && !isEditable(document.activeElement)) {
        cache.invertSelection()
    }
}

const onSelectAll = (cache: FileState): void => {
    const isOverlayOpen = document.querySelector('[data-mantine-portal]') !== null
    if (!isOverlayOpen && !isEditable(document.activeElement)) {
        cache.selectAll()
    } else {
        // need to select all text: send message
        ipcRenderer.invoke('selectAll')
    }
}

const FileView = observer(({ hide }: Props) => {
    const { viewState, appState, settingsState } = useStores('settingsState', 'viewState', 'appState')
    const { isDarkModeActive } = settingsState
    const winState = appState.getWinStateFromViewId(viewState.viewId)
    const { t } = useTranslation()
    const cache = viewState.getVisibleCache()
    const { files, cursor, editingId, viewmode } = cache
    const cursorIndex = cache.getFileIndex(cursor)
    const isViewActive = viewState.isActive && !hide
    const keepSelection = !!cache.selected.length
    const nodes = files.map((file) =>
        buildNodeFromFile(file, {
            isSelected: keepSelection && cache.isSelected(file),
            isEditing: editingId ? sameID(file.id, editingId) : false,
        }),
    )
    const rowCount = nodes.length

    const rightClickFileIndexRef: MutableRefObject<number> = useRef<number>()

    const { ViewMode, getActions, viewmodeRef } = useViewMode(viewmode)
    const viewmodeOptions = {
        iconSize: 56,
        isSplitViewActive: winState.splitView,
        isViewActive,
    }

    const searchStringRef = useRef<string>('')
    const timeStampRef = useRef<number>(0)

    // quick select
    useKeyDown(
        React.useCallback(
            (event: KeyboardEvent) => {
                let searchString = searchStringRef.current
                // we only want to catch printable keys
                if (
                    !viewState.isActive ||
                    !appState.isExplorer ||
                    event.key.length !== 1 ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.metaKey
                ) {
                    return
                }

                // previous keyevent > 1sec ?
                if (event.timeStamp - timeStampRef.current > 1000) searchString = ''

                // search_string += key
                searchString += event.key

                // call select file marching search_string
                if (searchString.length) cache.selectMatchingFile(searchString)

                searchStringRef.current = searchString
                timeStampRef.current = event.timeStamp
            },
            [cursor, cache, rowCount],
        ),
        ['*'],
    )

    useKeyDown(
        React.useCallback(
            (event: KeyboardEvent) => {
                if (
                    !viewState.isActive ||
                    !appState.isExplorer ||
                    (!appState.isPreviewOpen && !shouldCatchEvent(event))
                ) {
                    return
                }

                switch (event.key) {
                    case 'ArrowUp':
                    case 'ArrowDown':
                    case 'ArrowRight':
                    case 'ArrowLeft': {
                        // Prevent arrow keys to trigger generic browser scrolling: we want to handle it
                        // ourselves so that the cursor is always visible.
                        event.preventDefault()
                        const { getNextIndex } = getActions()
                        const nextIndex = getNextIndex(cursorIndex, event.key as ArrowKey)
                        if (nextIndex === cursorIndex) return
                        if (nextIndex > -1 && nextIndex <= rowCount - 1) {
                            const file = cache.files[nextIndex]
                            selectFile(file, false, event.shiftKey)
                        }
                        break
                    }

                    case 'Enter': {
                        const item = nodes[cursorIndex]
                        if (
                            item.isSelected &&
                            cache.selected.length === 1 &&
                            (!editingId || !sameID(cursor.id, editingId))
                        ) {
                            cache.setEditingFile(cursor)
                        }
                        break
                    }

                    case ' ': {
                        event.preventDefault()
                        const item = nodes[cursorIndex]
                        if (item && !appState.isPreviewOpen) {
                            appState.togglePreviewDialog(true)
                        } else {
                            appState.togglePreviewDialog(false)
                        }
                        break
                    }
                }
            },
            [cursor, cache, rowCount, cursorIndex],
        ),
        ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', ' '],
        { alwaysCatchEvent: true },
    )

    useMenuAccelerator([
        {
            combo: 'CmdOrCtrl+A',
            callback: useCallback(() => {
                viewState.isActive && onSelectAll(cache)
            }, [cache]),
        },
    ])

    const getRow = (index: number): FileViewItem => nodes[index]

    const onHeaderClick = ({ data: newMethod }: HeaderMouseEvent): void => cache.setSort(newMethod)

    const selectFile = (file: FileDescriptor, toggleSelection: boolean, extendSelection: boolean) => {
        if (toggleSelection) {
            cache.toggleSelection(file)
        } else {
            cache.addToSelection(file, extendSelection)
        }
    }

    const onBlankAreaClick = () => cache.reset()

    const onItemClick = ({ index, event }: ItemMouseEvent): void => {
        const item = nodes[index]
        const file = item.nodeData
        const toggleMode = isMac ? event.metaKey : event.ctrlKey

        selectFile(file, toggleMode, event.shiftKey)
    }

    const onInlineEdit = ({ action, data }: InlineEditEvent) => {
        switch (action) {
            case 'validate':
                appState.renameEditingFile(cache, data as string)
                break

            case 'start':
                const file = (data as FileViewItem).nodeData
                appState.startEditingFile(cache, file)
                break

            case 'cancel':
                cache.setEditingFile(null)
        }
    }

    const onItemDoubleClick = ({ event }: ItemMouseEvent): void => {
        openFileOrDirectory(cursor, isMac ? event.altKey : event.ctrlKey)
    }

    const openFileOrDirectory = (file: FileDescriptor, useInactiveCache: boolean): void => {
        if (!file.isDir) {
            cache.openFile(appState, file)
        } else {
            const dir = {
                dir: cache.join(file.dir, file.fullname),
                fullname: '',
            }
            appState.openDirectory(dir, !useInactiveCache)
        }
    }

    const onOpenFile = (e: KeyboardEvent): void => {
        if (isViewActive && cursor && shouldCatchEvent(e)) {
            openFileOrDirectory(cursor, isMac ? e.altKey : e.shiftKey)
        }
    }

    const getDraggedProps = (index: number): DraggedObject | null => {
        const { isSelected, nodeData, isEditing } = nodes[index]

        // Disable drag when file is being inline-renamed to allow text selection
        if (isEditing) {
            console.log('isEditing', isEditing)
            return null
        }

        return {
            fileState: cache,
            // If dragged file is selected: the whole selection is dragged
            // otherwise, only the dragged file gets dragged.
            dragFiles: isSelected ? cache.selected.slice(0) : [nodeData],
        }
    }

    useHotkeys([
        ['mod+O', onOpenFile],
        [isMac ? 'mod+alt+O' : 'mod+shift+O', onOpenFile],
        ['mod+I', (e: KeyboardEvent) => shouldCatchEvent(e) && isViewActive && onInvertSelection(cache)],
        ...(!isMac || window.ENV.CY
            ? [
                  ['mod+A', (e: KeyboardEvent) => shouldCatchEvent(e) && viewState.isActive && onSelectAll(cache)] as [
                      string,
                      (e: KeyboardEvent) => void,
                  ],
              ]
            : []),
    ])

    const [contextMenuOpened, setContextMenuOpened] = useState(false)
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        setContextMenuPosition({ x: e.clientX, y: e.clientY })
        setContextMenuOpened(true)
    }

    const rightClickFile =
        rightClickFileIndexRef.current > -1 && rightClickFileIndexRef.current < rowCount
            ? files[rightClickFileIndexRef.current]
            : undefined

    return (
        <div
            onContextMenu={(e) => {
                // use files.length to tell menu handler we clicked on the blank area
                rightClickFileIndexRef.current = files.length
                handleContextMenu(e)
            }}
            className="fileListSizerWrapper"
        >
            <Menu opened={contextMenuOpened} onChange={setContextMenuOpened} withinPortal={false}>
                <Menu.Target>
                    <div style={{ position: 'fixed', left: contextMenuPosition.x, top: contextMenuPosition.y }} />
                </Menu.Target>
                <Menu.Dropdown>
                    <FileContextMenu fileUnderMouse={rightClickFile} />
                </Menu.Dropdown>
            </Menu>
            <ViewMode
                cursorIndex={cursorIndex}
                itemCount={nodes.length}
                getItem={getRow}
                getDragProps={getDraggedProps}
                onItemClick={onItemClick}
                onItemDoubleClick={onItemDoubleClick}
                onHeaderClick={onHeaderClick}
                onBlankAreaClick={onBlankAreaClick}
                onInlineEdit={onInlineEdit}
                onItemRightClick={({ index, event }) => {
                    rightClickFileIndexRef.current = index
                    handleContextMenu(event)
                }}
                columns={[
                    {
                        label: t('FILETABLE.COL_NAME'),
                        key: 'name',
                        sort: cache.sortMethod === 'name' ? cache.sortOrder : 'none',
                    },
                    {
                        label: t('FILETABLE.COL_SIZE'),
                        key: 'size',
                        sort: cache.sortMethod === 'size' ? cache.sortOrder : 'none',
                    },
                ]}
                status={cache.status}
                error={cache.error}
                isDarkModeActive={isDarkModeActive}
                options={viewmodeOptions}
            />
        </div>
    )
})

export { FileView }
