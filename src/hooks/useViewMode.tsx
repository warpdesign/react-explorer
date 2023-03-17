import React, { MutableRefObject, useCallback, useRef } from 'react'
import type { ReactElement } from 'react'

import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'
import { TStatus } from '$src/state/fileState'
import { TableViewMode } from '$src/components/viewmodes/TableViewMode/'
import { IconViewMode } from '$src/components/viewmodes/IconViewMode/'
import { Selection } from '$src/components/viewmodes/components/Selection'

const viewmodes: { [key in ViewModeName]: any } = {
    details: TableViewMode,
    icons: IconViewMode,
}

export type ViewModeName = 'details' | 'icons'

export interface ItemMouseEvent {
    data: FileViewItem
    index: number
    event: React.MouseEvent<any>
}

export interface HeaderMouseEvent {
    data: TSORT_METHOD_NAME
    event: React.MouseEvent<any>
}

export interface InlineEditEvent {
    data?: string | FileViewItem
    action: 'cancel' | 'validate' | 'start'
    event: React.SyntheticEvent
}

export interface ViewModeProps<T> {
    onBlankAreaClick: () => void
    onItemClick: (event: ItemMouseEvent) => void
    onItemDoubleClick: (event: ItemMouseEvent) => void
    onItemRightClick: (event: ItemMouseEvent) => void
    onHeaderClick: (event: HeaderMouseEvent) => void
    onInlineEdit: (event: InlineEditEvent) => void
    getItem: (index: number) => FileViewItem
    getDragProps: (index: number) => DraggedObject
    status: TStatus
    error: boolean
    itemCount: number
    columns: Column[]
    cursorIndex?: number
    isDarkModeActive: boolean
    options?: T
    viewRef: React.MutableRefObject<HTMLElement>
}

export interface ViewModeActions {
    getNextIndex: (index: number, direction: ArrowKey) => number
    getSelectionRange: (coords: Selection) => number[]
}

export interface ViewModeReturnProps {
    ViewMode: (props: ViewModeProps<unknown>) => ReactElement
    getActions: () => ViewModeActions
}

export interface Column {
    label: string
    key: TSORT_METHOD_NAME
    sort: TSORT_ORDER
}

const defaultActions: ViewModeActions = {
    getNextIndex: () => {
        console.warn('cannot call getNextIndex: ref not ready!')
        return -1
    },
    getSelectionRange: () => [],
}

export const makeEvent =
    (index: number, data: any, handler: (event: ItemMouseEvent) => void) => (event: React.MouseEvent<HTMLElement>) =>
        handler({
            data,
            index,
            event,
        })

export const useViewMode = (
    name: ViewModeName,
): ViewModeReturnProps & { actionsRef: React.MutableRefObject<any>; viewRef: React.MutableRefObject<HTMLElement> } => {
    const ViewMode = viewmodes[name]
    if (!ViewMode) {
        throw `could not find viewmode "${name}"`
    }
    const actionsRef = useRef()
    const viewRef = useRef()

    return {
        ViewMode: useCallback(
            (props: ViewModeProps<unknown>) => <ViewMode {...props} ref={actionsRef} viewRef={viewRef} />,
            [name],
        ),
        // we cannot simply return the viewModeRef.current because the viewmode will
        // be modified *after* this component has rendered, so the parent could
        // have the previous reference.
        //
        // Note: getActions should be called inside handlers and not inside
        // renderers
        getActions: () => actionsRef.current || defaultActions,
        actionsRef,
        viewRef,
    }
}
