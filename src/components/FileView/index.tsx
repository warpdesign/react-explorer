import React, { useEffect, useState } from 'react'
import { ContextMenu2, ContextMenu2ChildrenProps, ContextMenu2ContentProps } from '@blueprintjs/popover2'
import { IconName, Icon, HotkeysTarget2, Classes } from '@blueprintjs/core'
import { useTranslation } from 'react-i18next'
import { IReactionDisposer, reaction, toJS, IObservableArray } from 'mobx'
import i18next from 'i18next'
import { AutoSizer, Index, RowMouseEventHandlerParams, ScrollParams } from 'react-virtualized'
import classNames from 'classnames'
import { ipcRenderer } from 'electron'

import { AppState } from '$src/state/appState'
import { FileDescriptor, FileID } from '$src/services/Fs'
import { TSORT_METHOD_NAME, TSORT_ORDER, getSortMethod } from '$src/services/FsSort'
import { formatBytes } from '$src/utils/formatBytes'
import { shouldCatchEvent, isEditable, isInRow } from '$src/utils/dom'
import { AppAlert } from '$src/components/AppAlert'
import { WithMenuAccelerators, Accelerators, Accelerator } from '$src/components/hoc/WithMenuAccelerators'
import { isMac } from '$src/utils/platform'
import { SettingsState } from '$src/state/settingsState'
import { ViewState } from '$src/state/viewState'
import { debounce } from '$src/utils/debounce'
import { filterDirs, filterFiles, getSelectionRange } from '$src/utils/fileUtils'
import { throttle } from '$src/utils/throttle'
import { FileState } from '$src/state/fileState'
import { FileContextMenu } from '$src/components/menus/FileContextMenu'
import Keys from '$src/constants/keys'
import { TypeIcons } from '$src/constants/icons'

import 'react-virtualized/styles.css'

import { DraggedObject, FileViewItem } from '$src/types'
import { HeaderMouseEvent, ItemMouseEvent, useLayout } from '$src/hooks/useLayout'
import { useStores } from '$src/hooks/useStores'

const CLICK_DELAY = 400
const SCROLL_DEBOUNCE = 50
const ARROW_KEYS_REPEAT_DELAY = 5

const LABEL_CLASSNAME = 'file-label'

interface State {
    nodes: FileViewItem[]
    // number of items selected
    selected: number
    type: string
    // position of last selected element
    position: number
    // last path that was used
    path: string
    //
    rightClickFile: FileDescriptor | null
}

interface Props {
    hide: boolean
}

const FileView = ({ hide }: Props) => {
    const { settingsState, viewState, appState } = useStores('settingsState', 'viewState', 'appState')
    const cache = viewState.getVisibleCache()
    const [nodes, setNodes] = useState<FileViewItem[]>([])
    const [selected, setSelected] = useState<number>(0)
    const [position, setPosition] = useState<number>(-1)
    const [path, setPath] = useState<string>(cache.path)
    const [rightClickFile, setRightClickFile] = useState<FileDescriptor | null>(null)
    const { t } = useTranslation()
    const rowCount = nodes.length
    // private disposers: Array<IReactionDisposer> = []
    // private editingFile: FileDescriptor
    // private clickTimeout: number

    useEffect(() => {
        const disposers: Array<IReactionDisposer> = [
            reaction(
                (): IObservableArray<FileDescriptor> => toJS(cache?.files),
                (files: FileDescriptor[]): void => {
                    if (cache) {
                        // when cache is being (re)loaded, cache.files is empty:
                        // we don't want to show "empty folder" placeholder
                        // in that case, only when cache is loaded and there are no files
                        if (cache.cmd === 'cwd' || cache.history.length) {
                            updateNodes(files)
                        }
                    }
                },
            ),
            reaction(
                (): boolean => cache?.error,
                (): void => {
                    cache && updateNodes(cache.files)
                },
            ),
            reaction(
                (): boolean => {
                    return !!cache?.showHiddenFiles
                },
                (): void => cache && updateNodes(cache.files),
            ),
        ]

        return () => {
            for (const disposer of disposers) {
                disposer()
            }
        }
    }, [])

    const updateNodes = (files: FileDescriptor[]): void => {
        const keepSelection = !!cache.selected.length

        const nodes = buildNodes(files, keepSelection)
        console.log('WARN: keepSelection not update in state')
        setNodes(nodes)
        setPath((nodes.length && nodes[0].nodeData.dir) || '')
        // updateState(nodes, keepSelection)
    }

    const buildNodeFromFile = (file: FileDescriptor, keepSelection: boolean): FileViewItem => {
        const filetype = file.type
        const isSelected = (keepSelection && cache.getSelectedState(file.fullname)) || false
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

    const buildNodes = (list: FileDescriptor[], keepSelection = false): FileViewItem[] => {
        const { sortMethod, sortOrder, showHiddenFiles } = cache
        const SortFn = getSortMethod(sortMethod, sortOrder)
        const dirs = filterDirs(list, showHiddenFiles)
        const files = filterFiles(list, showHiddenFiles)

        // if we sort by size, we only sort files by size: folders should still be sorted
        // alphabetically
        const nodes = dirs
            .sort(sortMethod !== 'size' ? SortFn : getSortMethod('name', 'asc'))
            .concat(files.sort(SortFn))
            .map((file) => buildNodeFromFile(file, keepSelection))

        return nodes
    }

    const updateState = (nodes: FileViewItem[], keepSelection = false): void => {
        const newPath = (nodes.length && nodes[0].nodeData.dir) || ''
        const position = keepSelection && cache.selectedId ? getFilePosition(nodes, cache.selectedId) : -1

        // cancel inlineedit if there was one
        // DISABLEFORNOW this.clearEditElement()
        // this.setState({ nodes, selected: keepSelection ? selected : 0, position, path: newPath }, () => {
        //     if (keepSelection && cache.editingId && position > -1) {
        //         console.log('DISABLE: updateState() => this.getElementAndToggleRename(undefined, false)')
        //         // this.getElementAndToggleRename(undefined, false)
        //     } else if (this.editingElement) {
        //         this.editingElement = null
        //     }
        // })
    }
    const getFilePosition = (nodes: FileViewItem[], id: FileID): number =>
        nodes.findIndex((node) => {
            const fileId = node.nodeData.id
            return fileId && fileId.ino === id.ino && fileId.dev === id.dev
        })

    // DISABLE FOR NOW gridElement: HTMLElement
    // tableRef: React.RefObject<Table> = React.createRef()

    // since the nodes are only generated after the files are updated
    // we re-render them after language has changed otherwise FileList
    // gets re-rendered with the wrong language after language has been changed
    // this.bindLanguageChange()

    // private bindLanguageChange = (): void => {
    //     i18next.on('languageChanged', this.onLanguageChanged)
    // }

    // private unbindLanguageChange = (): void => {
    //     i18next.off('languageChanged', this.onLanguageChanged)
    // }

    // public onLanguageChanged = (lang: string): void => {
    //     this.updateNodes(this.cache.files)
    // }

    // public componentWillUnmount(): void {

    //     document.removeEventListener('keydown', this.onDocKeyDown)
    //     this.unbindLanguageChange()
    // }

    // public componentDidMount(): void {
    //     document.addEventListener('keydown', this.onDocKeyDown)
    // }

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

    // clearClickTimeout(): void {
    //     if (this.clickTimeout) {
    //         clearTimeout(this.clickTimeout)
    //         this.clickTimeout = 0
    //     }
    // }

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
        console.log({ newMethod })
        const { sortMethod, sortOrder } = cache
        const newOrder = sortMethod !== newMethod ? 'asc' : (((sortOrder === 'asc' && 'desc') || 'asc') as TSORT_ORDER)
        cache.setSort(newMethod, newOrder)
        updateNodes(cache.files)
    }

    const onItemClick = ({ data, index, event }: ItemMouseEvent): void => {
        // const { rowData, event } = data
        event.stopPropagation()
        const originallySelected = data.isSelected
        const file = data.nodeData as FileDescriptor

        // keep a reference to the target before set setTimeout is called
        // because React appaers to recycle the event object after event handler
        // has returned
        const element = event.target as HTMLElement

        // // do not select parent dir pseudo file
        // if (this.editingElement === element) {
        //     return
        // }

        let newSelected = selected
        let position = index

        if (!event.shiftKey) {
            newSelected = 0
            nodes.forEach((n) => (n.isSelected = false))
            data.isSelected = true

            // online toggle rename when clicking on the label, not the icon
            console.warn('toggle rename DISABLED')
            // if (element.classList.contains(LABEL_CLASSNAME)) {
            //     this.clearClickTimeout()

            //     // only toggle inline if last selected element was this one
            //     if (index === this.state.position && originallySelected) {
            //         this.clickTimeout = window.setTimeout(() => {
            //             this.toggleInlineRename(element, originallySelected, file)
            //         }, CLICK_DELAY)
            //     }
            // }
        } else {
            console.warn('toggle rename else case not implemented !')
            debugger
            data.isSelected = !data.isSelected
            if (!data.isSelected) {
                // need to update position with last one
                // will be -1 if no left selected node is
                position = nodes.findIndex((node) => node.isSelected)
            }
            console.warn('onRowClick: this.setEditElement skipped')
            // this.setEditElement(null, null)
        }

        if (data.isSelected) {
            newSelected++
        } else if (originallySelected && newSelected > 0) {
            newSelected--
        }

        // this.setState({ nodes, selected: newSelected, position }, () => {
        //     this.updateSelection()
        // })
        setNodes(nodes)
        setSelected(newSelected)
        setPosition(position)
        console.warn('DISABLED: should update selection on state update')
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

    const updateSelection = (): void => {
        const selection = nodes
            .filter((node, i) => i !== position && node.isSelected)
            .map((node) => node.nodeData) as FileDescriptor[]

        if (position > -1) {
            const cursorFile = nodes[position].nodeData as FileDescriptor
            selection.push(cursorFile)
        }

        appState.updateSelection(cache, selection)
    }

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

    // onRowRightClick = (data: RowMouseEventHandlerParams): void => {
    //     this.setState({ rightClickFile: data.rowData.nodeData as FileDescriptor })
    // }

    const openFileOrDirectory = async (file: FileDescriptor, useInactiveCache: boolean): Promise<void> => {
        try {
            if (!file.isDir) {
                await cache.openFile(appState, cache, file)
            } else {
                const dir = {
                    dir: cache.join(file.dir, file.fullname),
                    fullname: '',
                }
                await appState.openDirectory(dir, !useInactiveCache)
            }
        } catch (error) {
            AppAlert.show(t('ERRORS.GENERIC', { error }), {
                intent: 'danger',
            })
        }
    }

    const unSelectAll = (): void => {
        const selectedNodes = nodes.filter((node) => node.isSelected)

        if (selectedNodes.length && isViewActive()) {
            selectedNodes.forEach((node) => {
                node.isSelected = false
            })
            setNodes(nodes)
            setSelected(0)
            setPosition(-1)
            console.warn('disabled: updateSelection after state update (2)')
            // this.setState({ nodes, selected: 0, position: -1 }, () => {
            //     this.updateSelection()
            // })
        }
    }

    const selectAll = (invert = false): void => {
        let newSelected = selected
        let newPosition = position
        if (nodes.length && isViewActive()) {
            newSelected = 0
            newPosition = -1

            let i = 0
            for (const node of nodes) {
                node.isSelected = invert ? !node.isSelected : true
                if (node.isSelected) {
                    newPosition = i
                    newSelected++
                }
                i++
            }

            setNodes(nodes)
            setSelected(newSelected)
            setPosition(newPosition)
            console.warn('disabled: updateSelection after state update (3)')
            // this.setState({ nodes, selected, position }, () => {
            //     this.updateSelection()
            // })
        }
    }

    const onOpenFile = (e: KeyboardEvent): void => {
        if (isViewActive() && position > -1) {
            const file = nodes[position].nodeData as FileDescriptor
            openFileOrDirectory(file, e.shiftKey)
        }
    }

    const onSelectAll = (): void => {
        const isOverlayOpen = document.body.classList.contains(Classes.OVERLAY_OPEN)
        if (!isOverlayOpen && !isEditable(document.activeElement)) {
            selectAll()
        } else {
            // need to select all text: send message
            ipcRenderer.invoke('selectAll')
        }
    }

    const onInvertSelection = (): void => selectAll(true)

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

    const isViewActive = (): boolean => viewState.isActive && !hide

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
        const selectedCount = isSelected ? selected : 0
        const dragFiles = selectedCount > 0 ? cache.selected.slice(0) : [nodeData]

        return {
            fileState: cache,
            dragFiles,
            selectedCount,
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
        {
            global: true,
            combo: 'mod + i',
            label: t('SHORTCUT.ACTIVE_VIEW.SELECT_INVERT'),
            onKeyDown: onInvertSelection,
            group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        },
        ...(!isMac || window.ENV.CY
            ? [
                  {
                      global: true,
                      combo: 'mod + a',
                      label: t('SHORTCUT.ACTIVE_VIEW.SELECT_ALL'),
                      onKeyDown: onSelectAll,
                      group: t('SHORTCUT.GROUP.ACTIVE_VIEW'),
                  },
              ]
            : []),
    ]

    const renderFileContextMenu = (props: ContextMenu2ContentProps): JSX.Element => {
        console.log('DISABLE renderFileContextMenu')
        return undefined
        // return props.isOpen ? <FileContextMenu fileUnderMouse={this.state.rightClickFile} /> : null
    }

    const { Layout } = useLayout('details')

    console.log('render...')

    return (
        <HotkeysTarget2 hotkeys={hotkeys}>
            <ContextMenu2 content={renderFileContextMenu}>
                {(ctxMenuProps: ContextMenu2ChildrenProps) => (
                    <div
                        ref={(element: HTMLElement) => {
                            // since we also need to have access to this element
                            console.log('DISABLED FOR NOW: setGridRef')
                            // this.setGridRef(element)
                            const ref = ctxMenuProps.ref as React.MutableRefObject<HTMLElement>
                            ref.current = element
                        }}
                        onContextMenu={(e) => {
                            // reset rightClickFile if we right-click on an empty area
                            if (!isInRow(e)) {
                                // this.setState({
                                //     rightClickFile: null,
                                // })
                                setRightClickFile(null)
                            }
                            ctxMenuProps.onContextMenu(e)
                        }}
                        // onKeyDown={this.onInputKeyDown}
                        className={classNames('fileListSizerWrapper', ctxMenuProps.className)}
                    >
                        <>
                            {ctxMenuProps.popover}
                            <AutoSizer>
                                {({ width, height }) => (
                                    <>
                                        <Layout
                                            width={width}
                                            height={height}
                                            itemCount={rowCount}
                                            getItem={getRow}
                                            getDragProps={getDraggedProps}
                                            onItemClick={onItemClick}
                                            onHeaderClick={onHeaderClick}
                                            onBlankAreaClick={unSelectAll}
                                            onInlineEdit={() => {
                                                console.log('TODO: inLineEdit')
                                            }}
                                            onItemDoubleClick={() => {
                                                console.log('TODO: onItemDoubleClick')
                                            }}
                                            onItemRightClick={() => {
                                                console.log('TODO: onItemRightClick')
                                            }}
                                            columns={[
                                                {
                                                    label: t('FILETABLE.COL_NAME'),
                                                    key: 'name',
                                                },
                                                {
                                                    label: t('FILETABLE.COL_SIZE'),
                                                    key: 'size',
                                                },
                                            ]}
                                            status={cache.status}
                                            error={cache.error}
                                        />
                                    </>
                                )}
                            </AutoSizer>
                        </>
                    </div>
                )}
            </ContextMenu2>
        </HotkeysTarget2>
    )
}

// const FileView = withTranslation()(
//     inject('appState', 'viewState', 'settingsState')(WithMenuAccelerators(FileViewClass)),
// )

export { FileView }
