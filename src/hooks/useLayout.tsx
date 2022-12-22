import React, { useCallback, useRef } from 'react'
import type { ReactElement } from 'react'

import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { TSORT_METHOD_NAME } from '$src/services/FsSort'
import { TStatus } from '$src/state/fileState'
import { TableLayout } from '$src/components/layouts/TableLayout'

const layouts: { [key in LayoutName]: any } = {
    details: TableLayout,
}

export type LayoutName = 'details'

export interface ItemMouseEvent {
    data: FileViewItem
    index: number
    event: React.MouseEvent<any>
}

export interface HeaderMouseEvent {
    data: TSORT_METHOD_NAME
    event: React.MouseEvent<any>
}

export interface LayoutProps {
    onBlankAreaClick: () => void
    onItemClick: (event: ItemMouseEvent) => void
    onItemDoubleClick: (event: ItemMouseEvent) => void
    onItemRightClick: (event: ItemMouseEvent) => void
    onHeaderClick: (event: HeaderMouseEvent) => void
    onInlineEdit: (event: ItemMouseEvent) => void
    getItem: (index: number) => FileViewItem
    getDragProps: (index: number) => DraggedObject
    status: TStatus
    error: boolean
    itemCount: number
    width: number
    height: number
    columns: Column[]
}

export interface LayoutActions {
    getNextIndex: (index: number, direction: ArrowKey) => number
}

export interface LayoutReturnProps {
    Layout: (props: LayoutProps) => ReactElement
    actions: LayoutActions
}

interface Column {
    key: string
    label: string
}

const defaultActions: LayoutActions = {
    getNextIndex: () => {
        console.warn('cannot call getNextIndex: ref not ready!')
        return -1
    },
}

export const useLayout = (name: LayoutName): LayoutReturnProps => {
    const Layout = layouts[name]
    if (!Layout) {
        throw `could not find layout "${name}"`
    }
    const layoutRef = useRef(null)

    // TODO: maybe have a ready event since layoutRef.current could be null ?

    return {
        Layout: useCallback((props: LayoutProps) => <Layout {...props} ref={layoutRef} />, [layoutRef, name]),
        actions: layoutRef.current || defaultActions,
    }
}
