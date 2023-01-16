import React, { useCallback, useRef, MutableRefObject } from 'react'
import { observer } from 'mobx-react'
import { ContextMenu2, ContextMenu2ChildrenProps, ContextMenu2ContentProps } from '@blueprintjs/popover2'
import { HotkeysTarget2, Classes } from '@blueprintjs/core'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { ipcRenderer } from 'electron'

import { FileDescriptor, sameID } from '$src/services/Fs'
import { TSORT_METHOD_NAME, TSORT_ORDER, getSortMethod } from '$src/services/FsSort'
import { formatBytes } from '$src/utils/formatBytes'
import { shouldCatchEvent, isEditable, isInRow } from '$src/utils/dom'
import { AppAlert } from '$src/components/AppAlert'
import { isMac } from '$src/utils/platform'
import { filterDirs, filterFiles, getSelectionRange } from '$src/utils/fileUtils'
import { FileState } from '$src/state/fileState'
import { FileContextMenu } from '$src/components/menus/FileContextMenu'
import { useMenuAccelerator } from '$src/hooks/useAccelerator'
import { TypeIcons } from '$src/constants/icons'

import 'react-virtualized/styles.css'

import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { HeaderMouseEvent, ItemMouseEvent, useLayout } from '$src/hooks/useLayout'
import { useStores } from '$src/hooks/useStores'
import { useKeyDown } from '$src/hooks/useKeyDown'

const LABEL_CLASSNAME = 'file-label'

interface Props {
    hide: boolean
}

export function buildNodeFromFile(file: FileDescriptor, isSelected: boolean): FileViewItem {
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
    const { viewState, appState } = useStores('settingsState', 'viewState', 'appState')
    const { t } = useTranslation()
    const cache = viewState.getVisibleCache()
    const { files, selected, cursor, path, status, error } = cache
    const cursorIndex = cache.getFileIndex(cursor)
    const isViewActive = viewState.isActive && !hide
    const keepSelection = !!cache.selected.length
    const nodes = files.map((file) =>
        buildNodeFromFile(file, keepSelection && !!selected.find((selectedFile) => sameID(file.id, selectedFile.id))),
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
                // Prevent arrow keys to trigger generic browser scrolling: we want to handle it
                // ourselves so that the cursor is always visible.
                event.preventDefault()

                const nextIndex = getNextIndex(cursorIndex, event.key as ArrowKey)
                if (nextIndex > -1 && nextIndex <= rowCount - 1) {
                    const file = cache.files[nextIndex]
                    selectFile(file, event.metaKey, event.shiftKey)
                }
            },
            [cursor, cache, getNextIndex],
        ),
        ['ArrowDown', 'ArrowUp'],
    )

    useMenuAccelerator([
        {
            combo: 'CmdOrCtrl+A',
            callback: useCallback(() => onSelectAll(cache), [cache]),
        },
    ])

    // public componentDidUpdate(): void {
    //     const scrollTop = this.state.position === -1 ? this.cache.scrollTop : null
    //     const viewState = this.injected.viewState
    //     // if (!viewState.viewId) {
    //     //     console.log('componentDidUpdate', this.state.position, this.cache.scrollTop, scrollTop);
    //     // }

    //     // edge case: previous saved scrollTop isn't valid anymore
    //     // eg. files have been deleted, or selected item has been renamed,
    //     // so that using previous scrollTop would hide the selected item
    //     // DISABLED FOR NOW this.tableRef.current.scrollToPosition(this.cache.scrollTop)
    // }

    // renderMenuAccelerators(): React.ReactElement<Record<string, unknown>> {
    //     return (
    //         <Accelerators>
    //             <Accelerator combo="CmdOrCtrl+A" onClick={this.onSelectAll}></Accelerator>
    //             {/* <Accelerator combo="rename" onClick={this.getElementAndToggleRename}></Accelerator> */}
    //         </Accelerators>
    //     )
    // }

    const getRow = (index: number): FileViewItem => nodes[index]

    // setEditElement(element: HTMLElement, file: FileDescriptor): void {
    //     const cache = this.cache

    //     this.editingElement = element
    //     this.editingFile = file

    //     cache.setEditingFile(file)
    // }

    /*
    { columnData: any, dataKey: string, event: Event }
    */
    const onHeaderClick = ({ data: newMethod }: HeaderMouseEvent): void => {
        console.log('TODO: onHeaderClick', { newMethod })
        // const { sortMethod, sortOrder } = cache
        // const newOrder = sortMethod !== newMethod ? 'asc' : (((sortOrder === 'asc' && 'desc') || 'asc') as TSORT_ORDER)
        // cache.setSort(newMethod, newOrder)
        // updateNodes(cache.files)
    }

    const selectFile = (file: FileDescriptor, toggleSelection: boolean, extendSelection: boolean) => {
        if (toggleSelection) {
            cache.toggleSelection(file)
        } else {
            cache.addToSelection(file, extendSelection)
        }
    }

    const onBlankAreaClick = () => cache.reset()

    const onItemClick = ({ index, event }: ItemMouseEvent): void => {
        // stop click propagation so that it does not reach the blank area
        event.stopPropagation()
        const file = nodes[index].nodeData
        console.log(
            'onItemClick',
            index,
            cache.selected.findIndex((selectedFile) => sameID(selectedFile.id, file.id)),
            cache.selected.length,
        )
        // TODO: use OS specific instead of mac only metaKey
        selectFile(file, event.metaKey, event.shiftKey)
    }

    const onItemDoubleClick = ({ event }: ItemMouseEvent): void => {
        event.stopPropagation()
        openFileOrDirectory(cursor, event.shiftKey)
        console.log('onItemDoubleClick', cursor)
        //     if ((event.target as HTMLElement) !== this.editingElement) {
        //         this.openFileOrDirectory(file, event.shiftKey)
        //     }
    }

    // private onInlineEdit(cancel: boolean): void {
    //     const editingElement = this.editingElement

    //     if (cancel) {
    //         // restore previous value
    //         editingElement.innerText = this.editingFile.fullname
    //     } else {
    //         // since the File element is modified by the rename FileState.rename method there is
    //         // no need to refresh the file cache:
    //         // 1. innerText has been updated and is valid
    //         // 2. File.fullname is also updated, so any subsequent render will get the latest version as well
    //         this.cache
    //             .rename(this.editingFile.dir, this.editingFile, editingElement.innerText)
    //             .then(() => {
    //                 // this will not re-sort the files
    //                 this.updateSelection()
    //                 // we could also reload but not very optimal when working on remote files
    //                 // const { fileCache } = this.injected;
    //                 // fileCache.reload();
    //                 // Finder automatically repositions the file but won't automatically scroll the list
    //                 // so the file may be invisible after the reposition: not sure this is perfect either
    //             })
    //             .catch((error) => {
    //                 AppAlert.show(error.message).then(() => {
    //                     editingElement.innerText = error.oldName
    //                 })
    //             })
    //     }
    //     this.setEditElement(null, null)

    //     editingElement.blur()
    //     editingElement.removeAttribute('contenteditable')
    // }

    // const updateSelection = (): void => {
    //     const selection = nodes
    //         .filter((node, i) => i !== position && node.isSelected)
    //         .map((node) => node.nodeData) as FileDescriptor[]

    //     if (position > -1) {
    //         const cursorFile = nodes[position].nodeData as FileDescriptor
    //         selection.push(cursorFile)
    //     }

    //     appState.updateSelection(cache, selection)
    // }

    // clearContentEditable(): void {
    //     if (this.editingElement) {
    //         this.editingElement.blur()
    //         this.editingElement.removeAttribute('contenteditable')
    //     }
    // }

    // toggleInlineRename(
    //     element: HTMLElement,
    //     originallySelected: boolean,
    //     file: FileDescriptor,
    //     selectText = true,
    // ): void {
    //     if (!file.readonly) {
    //         if (originallySelected) {
    //             element.contentEditable = 'true'
    //             element.focus()
    //             this.setEditElement(element, file)
    //             selectText && this.selectLeftPart()
    //             element.onblur = (): void => {
    //                 if (this.editingElement) {
    //                     this.onInlineEdit(true)
    //                 }
    //             }
    //         } else {
    //             // clear rename
    //             this.clearContentEditable()
    //             this.setEditElement(null, null)
    //         }
    //     }
    // }

    // const onRowDoubleClick = (data: RowMouseEventHandlerParams): void => {
    //     this.clearClickTimeout()
    //     const { rowData, event } = data
    //     const file = rowData.nodeData as FileDescriptor

    //     if ((event.target as HTMLElement) !== this.editingElement) {
    //         this.openFileOrDirectory(file, event.shiftKey)
    //     }
    // }

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

    // onInputKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    //     if (this.editingElement) {
    //         e.nativeEvent.stopImmediatePropagation()
    //         if (e.key === Keys.ESCAPE || e.key === Keys.ENTER) {
    //             if (e.key === Keys.ENTER) {
    //                 e.preventDefault()
    //             }
    //             this.onInlineEdit(e.key === Keys.ESCAPE)
    //         }
    //     }
    // }

    // getNodeContentElement(position: number): HTMLElement {
    //     const selector = `[aria-rowindex="${position}"]`
    //     return this.gridElement.querySelector(selector)
    // }

    // clearEditElement(): void {
    //     const selector = `[aria-rowindex] [contenteditable]`
    //     const element = this.gridElement.querySelector(selector) as HTMLElement
    //     if (element) {
    //         element.onblur = null
    //         element.removeAttribute('contenteditable')
    //     }
    // }

    // getElementAndToggleRename = (e?: KeyboardEvent | string, selectText = true): void => {
    //     if (this.state.selected > 0) {
    //         const { position, nodes } = this.state
    //         const node = nodes[position]
    //         const file = nodes[position].nodeData as FileDescriptor
    //         const element = this.getNodeContentElement(position + 1)
    //         const span: HTMLElement = element.querySelector(`.${LABEL_CLASSNAME}`)

    //         if (e && typeof e !== 'string') {
    //             e.preventDefault()
    //         }
    //         this.toggleInlineRename(span, node.isSelected, file, selectText)
    //     }
    // }

    // scrollPage = throttle((up: boolean): void => {
    //     const table = this.tableRef.current
    //     const props = this.tableRef.current.props
    //     const headerHeight = props.disableHeader ? 0 : props.headerHeight
    //     const scrollTop = this.cache.scrollTop
    //     // TODO: props.rowHeight may be a function
    //     const rowHeight = props.rowHeight as number
    //     const maxHeight = this.state.nodes.length * rowHeight - (props.height - headerHeight)

    //     let newScrollTop = 0

    //     if (!up) {
    //         newScrollTop = scrollTop + (props.height - headerHeight)
    //         if (newScrollTop > maxHeight) {
    //             newScrollTop = maxHeight
    //         }
    //     } else {
    //         newScrollTop = scrollTop - (props.height - headerHeight)
    //         if (newScrollTop < 0) {
    //             newScrollTop = 0
    //         }
    //     }

    //     table.scrollToPosition(newScrollTop)
    // }, ARROW_KEYS_REPEAT_DELAY)

    // onDocKeyDown = (e: KeyboardEvent): void => {
    //     if (!this.isViewActive() || !shouldCatchEvent(e)) {
    //         return
    //     }

    //     switch (e.key) {
    //         case Keys.DOWN:
    //         case Keys.UP:
    //             if (!this.editingElement) {
    //                 this.moveSelection(e.key === Keys.DOWN ? 1 : -1, e.shiftKey)
    //                 e.preventDefault()
    //             }
    //             break

    //         case Keys.ENTER:
    //             console.log('DISABLE: this.getElementAndToggleRename(e)')
    //             // this.getElementAndToggleRename(e)
    //             break

    //         case Keys.PAGE_DOWN:
    //         case Keys.PAGE_UP:
    //             console.log('page up/down disabled')
    //             // DISABLE FOR NOW this.scrollPage(e.key === Keys.PAGE_UP)
    //             break
    //     }
    // }

    // const moveSelection = throttle((step: number, isShiftDown: boolean) => {
    //     position += step

    //     if (position > -1 && position <= state.nodes.length - 1) {
    //         if (isShiftDown) {
    //             selected++
    //         } else {
    //             // unselect previous one
    //             nodes.forEach((n) => (n.isSelected = false))
    //             selected = 1
    //         }

    //         nodes[position].isSelected = true

    //         // move in method to reuse
    //         this.setState({ nodes, selected, position }, () => {
    //             this.updateSelection()
    //             // test
    //             console.log('DISABLE FOR NOW: this.tableRef.current.scrollToRow')
    //             // DISABLE FOR NOW this.tableRef.current.scrollToRow(position)
    //         })
    //     }
    // }, ARROW_KEYS_REPEAT_DELAY)

    // setGridRef = (element: HTMLElement): void => {
    //     this.gridElement = (element && element.querySelector(`.${GRID_CLASSNAME}`)) || null
    // }

    // onScroll = debounce(({ scrollTop }: ScrollParams): void => {
    //     this.cache.scrollTop = scrollTop
    // }, SCROLL_DEBOUNCE)

    const getDraggedProps = (index: number): DraggedObject => {
        const { isSelected, nodeData } = nodes[index]
        // const selectedCount = isSelected ? selected : 0
        // const dragFiles = selectedCount > 0 ? cache.selected.slice(0) : [nodeData]

        return {
            fileState: cache,
            dragFiles: [],
            selectedCount: 0,
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

    // (element: HTMLElement) => {
    //     // since we also need to have access to this element
    //     const ref = ctxMenuProps.ref as React.MutableRefObject<HTMLElement>
    //     ref.current = element
    // }

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
                            onInlineEdit={() => {
                                console.log('TODO: inLineEdit')
                            }}
                            onItemRightClick={({ index, event }) => {
                                rightClickFileIndexRef.current = index
                                ctxMenuProps.onContextMenu(event)
                            }}
                            columns={[
                                {
                                    label: t('FILETABLE.COL_NAME'),
                                    key: 'name',
                                    sort: 'none',
                                },
                                {
                                    label: t('FILETABLE.COL_SIZE'),
                                    key: 'size',
                                    sort: 'none',
                                },
                            ]}
                            status={cache.status}
                            error={cache.error}
                        />
                    </div>
                )}
            </ContextMenu2>
        </HotkeysTarget2>
    )
})

export { FileView }
