import React from 'react'
import { useTranslation } from 'react-i18next'

import type { DraggedObject, FileViewItem } from '$src/types'
import { InlineEditEvent, ItemMouseEvent, makeEvent } from '$src/hooks/useViewMode'
import { Name } from '../Column/Name'
import { Size } from '../Column/Size'
import { useFileClick } from '$src/hooks/useFileClick'
import { useDragFile } from '$src/hooks/useDragFile'

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
    const { t } = useTranslation()
    const clickHandler = makeEvent(index, rowData, onRowClick)
    const doubleClickHandler = makeEvent(index, rowData, onRowDoubleClick)
    const contextMenuHandler = makeEvent(index, rowData, onRowRightClick)
    const mouseProps = useFileClick({
        clickHandler,
        doubleClickHandler,
        rightClickHandler: contextMenuHandler,
    })

    const { dragRef, dragPreview } = useDragFile({
        isDarkModeActive,
        dragProps,
    })

    return (
        <>
            {dragPreview}
            <div
                ref={dragRef}
                {...mouseProps}
                style={{ width: '100%', height: '100%', alignItems: 'center', display: 'flex' }}
            >
                <Name data={rowData} onInlineEdit={onInlineEdit} selectedCount={dragProps.fileState.selected.length} />
                <Size data={rowData} />
            </div>
        </>
    )
}
