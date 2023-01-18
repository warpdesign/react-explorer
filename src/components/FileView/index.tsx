import React, { useCallback, useRef, MutableRefObject } from 'react'
import { observer } from 'mobx-react'
import { ContextMenu2, ContextMenu2ChildrenProps, ContextMenu2ContentProps } from '@blueprintjs/popover2'
import { HotkeysTarget2, Classes } from '@blueprintjs/core'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { ipcRenderer } from 'electron'

import { FileDescriptor, sameID } from '$src/services/Fs'
import { formatBytes } from '$src/utils/formatBytes'
import { isEditable } from '$src/utils/dom'
import { isMac } from '$src/utils/platform'
import { FileState } from '$src/state/fileState'
import { FileContextMenu } from '$src/components/menus/FileContextMenu'
import { useMenuAccelerator } from '$src/hooks/useAccelerator'
import { TypeIcons } from '$src/constants/icons'

import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { HeaderMouseEvent, ItemMouseEvent, useLayout } from '$src/hooks/useLayout'
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
        icon: (file.isDir && TypeIcons['dir']) || (filetype && TypeIcons[filetype]) || TypeIcons['any'],
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

const onSelectAll = (cache: FileState): void => {
    const isOverlayOpen = document.body.classList.contains(Classes.OVERLAY_OPEN)
    console.log('onSelectAll')
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
    const { t } = useTranslation()
    const cache = viewState.getVisibleCache()
    const { files, cursor, editingId } = cache
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

    const {
        Layout,
        actions: { getNextIndex },
    } = useLayout('details')

    useKeyDown(
        React.useCallback(
            (event: KeyboardEvent) => {
                if (!viewState.isActive) {
                    return
                }

                switch (event.key) {
                    case 'ArrowUp':
                    case 'ArrowDown':
                        // Prevent arrow keys to trigger generic browser scrolling: we want to handle it
                        // ourselves so that the cursor is always visible.
                        event.preventDefault()

                        const nextIndex = getNextIndex(cursorIndex, event.key as ArrowKey)
                        if (nextIndex > -1 && nextIndex <= rowCount - 1) {
                            const file = cache.files[nextIndex]
                            selectFile(file, event.metaKey, event.shiftKey)
                        }
                        break

                    case 'Enter':
                        const item = nodes[cursorIndex]
                        if (item.isSelected && (!editingId || !sameID(cursor.id, editingId))) {
                            cache.setEditingFile(cursor)
                        }
                        break
                }
            },
            [cursor, cache, getNextIndex],
        ),
        ['ArrowDown', 'ArrowUp', 'Enter'],
    )

    useMenuAccelerator([
        {
            combo: 'CmdOrCtrl+A',
            callback: useCallback(() => onSelectAll(cache), [cache]),
        },
    ])

    // renderMenuAccelerators(): React.ReactElement<Record<string, unknown>> {
    //     return (
    //         <Accelerators>
    //             <Accelerator combo="CmdOrCtrl+A" onClick={this.onSelectAll}></Accelerator>
    //             {/* <Accelerator combo="rename" onClick={this.getElementAndToggleRename}></Accelerator> */}
    //         </Accelerators>
    //     )
    // }

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
        console.log({ selected: item.isSelected })
        if (item.isSelected && (!editingId || !sameID(file.id, editingId))) {
            cache.setEditingFile(file)
        } else {
            // TODO: use OS specific instead of mac only metaKey
            selectFile(file, event.metaKey, event.shiftKey)
        }
    }

    const onItemDoubleClick = ({ event }: ItemMouseEvent): void => {
        openFileOrDirectory(cursor, event.shiftKey)
        console.log('onItemDoubleClick', cursor)
    }

    const openFileOrDirectory = (file: FileDescriptor, useInactiveCache: boolean): void => {
        if (!file.isDir) {
            cache.openFile(appState, cache, file)
        } else {
            const dir = {
                dir: cache.join(file.dir, file.fullname),
                fullname: '',
            }
            appState.openDirectory(dir, !useInactiveCache)
        }
    }

    const unSelectAll = (): void => {
        // const selectedNodes = nodes.filter((node) => node.isSelected)
        // if (selectedNodes.length && isViewActive()) {
        //     selectedNodes.forEach((node) => {
        //         node.isSelected = false
        //     })
        //     setNodes(nodes)
        //     // setSelected(0)
        //     // setPosition(-1)
        //     console.warn('disabled: updateSelection after state update (2)')
        //     // this.setState({ nodes, selected: 0, position: -1 }, () => {
        //     //     this.updateSelection()
        //     // })
        // }
    }

    const onOpenFile = (e: KeyboardEvent): void => {
        if (isViewActive && cursor) {
            openFileOrDirectory(cursor, e.shiftKey)
        }
    }

    const getDraggedProps = (index: number): DraggedObject => {
        const { isSelected, nodeData } = nodes[index]

        return {
            fileState: cache,
            // If dragged file is selected: the whole selection is dragged
            // otherwise, only the dragged file gets dragged.
            dragFiles: isSelected ? cache.selected.slice(0) : [nodeData],
        }
    }

    const hotkeys = [
        {
            global: true,
            combo: 'mod + o',
            label: t('SHORTCUT.ACTIVE_VIEW.OPEN_FILE'),
            onKeyDown: onOpenFile,
            group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        },
        {
            global: true,
            combo: 'mod + shift + o',
            label: t('SHORTCUT.ACTIVE_VIEW.OPEN_FILE'),
            onKeyDown: onOpenFile,
            group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        },
        // {
        //     global: true,
        //     combo: 'mod + i',
        //     label: t('SHORTCUT.ACTIVE_VIEW.SELECT_INVERT'),
        //     onKeyDown: onInvertSelection,
        //     group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        // },
        ...(!isMac || window.ENV.CY
            ? [
                  {
                      global: true,
                      combo: 'mod + a',
                      label: t('SHORTCUT.ACTIVE_VIEW.SELECT_ALL'),
                      onKeyDown: () => onSelectAll(cache),
                      group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
                  },
              ]
            : []),
    ]

    const renderFileContextMenu = (props: ContextMenu2ContentProps): JSX.Element => {
        const index = rightClickFileIndexRef.current
        const rightClickFile = index > -1 && index < rowCount ? files[index] : undefined
        return props.isOpen ? <FileContextMenu fileUnderMouse={rightClickFile} /> : null
    }

    return (
        <HotkeysTarget2 hotkeys={hotkeys}>
            <ContextMenu2 content={renderFileContextMenu}>
                {(ctxMenuProps: ContextMenu2ChildrenProps) => (
                    <div
                        ref={ctxMenuProps.ref}
                        onContextMenu={(e) => {
                            // use files.length to tell menu handler we clicked on the blank area
                            rightClickFileIndexRef.current = files.length
                            ctxMenuProps.onContextMenu(e)
                        }}
                        className={classNames('fileListSizerWrapper', ctxMenuProps.className)}
                    >
                        {ctxMenuProps.popover}
                        <Layout
                            cursorIndex={cursorIndex}
                            itemCount={nodes.length}
                            getItem={getRow}
                            getDragProps={getDraggedProps}
                            onItemClick={onItemClick}
                            onItemDoubleClick={onItemDoubleClick}
                            onHeaderClick={onHeaderClick}
                            onBlankAreaClick={onBlankAreaClick}
                            onInlineEdit={({ action, data }) => {
                                if (action === 'validate') {
                                    appState.renameEditingFile(cache, data)
                                } else {
                                    cache.setEditingFile(null)
                                }
                            }}
                            onItemRightClick={({ index, event }) => {
                                rightClickFileIndexRef.current = index
                                ctxMenuProps.onContextMenu(event)
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
                        />
                    </div>
                )}
            </ContextMenu2>
        </HotkeysTarget2>
    )
})

export { FileView }
