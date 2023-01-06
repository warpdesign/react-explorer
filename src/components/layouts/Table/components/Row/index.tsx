import React, { useRef } from 'react'
import { useDrag, useDragDropManager } from 'react-dnd'

import type { DraggedObject, FileViewItem } from '$src/types'
import { ItemMouseEvent, makeEvent } from '$src/hooks/useLayout'
import { Name } from '../Column/Name'
import { Size } from '../Column/Size'

interface CollectedProps {
    isDragging: boolean
}

export interface RowProps {
    rowData: FileViewItem
    onRowClick?: (event: ItemMouseEvent) => void
    onRowDoubleClick?: (event: ItemMouseEvent) => void
    onRowRightClick?: (event: ItemMouseEvent) => void
    index: number
}

const CLICK_DELAY = 500

export const Row = ({ rowData, onRowClick, onRowDoubleClick, onRowRightClick, index }: RowProps): JSX.Element => {
    const [{ isDragging }, drag] = useDrag<DraggedObject, unknown, CollectedProps>({
        type: 'file',
        item: {
            fileState: null,
            dragFiles: [],
            selectedCount: 0,
        },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
        //getDragProps(index),
    })
    const clickRef: React.MutableRefObject<number> = useRef(-CLICK_DELAY)
    const clickHandler = makeEvent(index, rowData, onRowClick)
    const doubleClickHandler = makeEvent(index, rowData, onRowDoubleClick)
    const contextMenuHandler = makeEvent(index, rowData, onRowRightClick)

    return (
        <div
            ref={drag}
            onClick={(e: React.MouseEvent<HTMLElement>) => {
                if (e.timeStamp - clickRef.current > CLICK_DELAY) {
                    clickHandler(e)
                } else {
                    doubleClickHandler(e)
                }
                clickRef.current = e.timeStamp
            }}
            onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation()
                contextMenuHandler(e)
            }}
            style={{ width: '100%', height: '100%', alignItems: 'center', display: 'flex' }}
        >
            <Name data={rowData} />
            <Size data={rowData} />
        </div>
    )
}
