import React, { useCallback, useRef, useState, useEffect } from 'react'
import type { ReactElement } from 'react'

import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'
import { TStatus } from '$src/state/fileState'
import { TableLayout } from '$src/components/layouts/Table/'
import { IconsLayout } from '$src/components/layouts/Icon/'

const layouts: { [key in LayoutName]: any } = {
    details: TableLayout,
    icons: IconsLayout,
}

export type LayoutName = 'details' | 'icons'

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

export interface LayoutProps<T> {
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
}

export interface LayoutActions {
    getNextIndex: (index: number, direction: ArrowKey) => number
    icons: boolean
}

export interface LayoutReturnProps {
    Layout: (props: LayoutProps<unknown>) => ReactElement
    actions: LayoutActions
}

export interface Column {
    label: string
    key: TSORT_METHOD_NAME
    sort: TSORT_ORDER
}

const defaultActions: LayoutActions = {
    getNextIndex: () => {
        console.warn('cannot call getNextIndex: ref not ready!')
        return -1
    },
    icons: false,
}

export const makeEvent =
    (index: number, data: any, handler: (event: ItemMouseEvent) => void) => (event: React.MouseEvent<HTMLElement>) =>
        handler({
            data,
            index,
            event,
        })

export const useLayout = (name: LayoutName): LayoutReturnProps => {
    const Layout = layouts[name]
    if (!Layout) {
        throw `could not find layout "${name}"`
    }
    const layoutRef = useRef()
    const [ready, setReady] = useState(false)

    // Little hack to force a rereneder of the parent component
    // without it, the ref isn't defined in test environment
    useEffect(() => {
        setReady(true)
    }, [name])

    return {
        Layout: useCallback((props: LayoutProps<unknown>) => <Layout {...props} ref={layoutRef} />, [layoutRef, name]),
        actions: layoutRef.current || defaultActions,
    }
}
