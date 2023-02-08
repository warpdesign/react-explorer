import React, { useRef } from 'react'
import { DragPreviewImage, useDrag } from 'react-dnd'

import type { DraggedObject, FileViewItem } from '$src/types'
import { InlineEditEvent, ItemMouseEvent, makeEvent } from '$src/hooks/useLayout'
import { Name } from '../Column/Name'
import { Size } from '../Column/Size'
import { createDragPreview } from '$src/components/layouts/TableLayout/utils'
import { useTranslation } from 'react-i18next'

interface CollectedProps {
    isDragging: boolean
}

export interface RowProps {
    rowData: FileViewItem
    onRowClick?: (event: ItemMouseEvent) => void
    onRowDoubleClick?: (event: ItemMouseEvent) => void
    onRowRightClick?: (event: ItemMouseEvent) => void
    onInlineEdit?: (event: InlineEditEvent) => void
    getDragProps: (index: number) => DraggedObject
    isDarkModeActive: boolean
    index: number
}

export const CLICK_DELAY = 500

export const Row = ({
    rowData,
    onRowClick,
    onRowDoubleClick,
    onRowRightClick,
    onInlineEdit,
    index,
    getDragProps,
    isDarkModeActive,
}: RowProps): JSX.Element => {
    const dragProps = getDragProps(index)
    const [{ isDragging }, drag, preview] = useDrag<DraggedObject, unknown, CollectedProps>({
        type: 'file',
        item: dragProps,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    })
    const { t } = useTranslation()
    const clickRef: React.MutableRefObject<number> = useRef(-CLICK_DELAY)
    const clickHandler = makeEvent(index, rowData, onRowClick)
    const doubleClickHandler = makeEvent(index, rowData, onRowDoubleClick)
    const contextMenuHandler = makeEvent(index, rowData, onRowRightClick)
    const dragPreview =
        dragProps.dragFiles.length > 1
            ? createDragPreview(t('DRAG.MULTIPLE', { count: dragProps.dragFiles.length }), isDarkModeActive)
            : undefined

    return (
        <>
            {dragPreview && <DragPreviewImage connect={preview} src={dragPreview} />}
            <div
                ref={drag}
                onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.stopPropagation()

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
                <Name data={rowData} onInlineEdit={onInlineEdit} selectedCount={dragProps.fileState.selected.length} />
                <Size data={rowData} />
            </div>
        </>
    )
}
