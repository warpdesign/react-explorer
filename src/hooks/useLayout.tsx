import React, { useRef } from 'react'
import type { ReactElement } from 'react'

import { DraggedObject, FileViewItem } from '$src/types'
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
    // ref: React.RefObject<ReactElement>
    width: number
    height: number
    columns: Column[]
}

export interface LayoutReturnProps {
    Layout: (props: LayoutProps) => ReactElement
    actions: {
        navigate: (direction: string) => void
        selectAll: () => void
        invertSelection: () => void
    }
}

interface Column {
    key: string
    label: string
}

//
// t('FILETABLE.COL_SIZE')

// actions
// - navigate (arrow keys, page up/down)
// - (de)selectAll
// - invertSelection

export const useLayout = (name: LayoutName): LayoutReturnProps => {
    const Layout = layouts[name]
    if (!Layout) {
        throw `could not find layout "${name}"`
    }
    const layoutRef = useRef(null)

    // TODO: maybe have a ready event since layoutRef could be null ?

    return {
        Layout: (props: LayoutProps) => <Layout {...props} ref={layoutRef} />,
        actions: {
            navigate: (direction: string) => layoutRef.current.navigate(direction),
            selectAll: () => layoutRef.current.selectAll(),
            invertSelection: () => layoutRef.current.invertSelection(),
        },
    }
}
