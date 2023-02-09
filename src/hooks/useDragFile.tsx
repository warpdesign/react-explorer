import React from 'react'
import { DragPreviewImage, useDrag } from 'react-dnd'

import { createDragPreview } from '$src/components/layouts/TableLayout/utils'
import { DraggedObject } from '$src/types'
import { useTranslation } from 'react-i18next'

interface UseDragFileOptions {
    dragProps: DraggedObject
    isDarkModeActive: boolean
}

interface CollectedProps {
    isDragging: boolean
}

export const useDragFile = ({ dragProps, isDarkModeActive }: UseDragFileOptions) => {
    const { t } = useTranslation()
    const [, drag, preview] = useDrag<DraggedObject, unknown, CollectedProps>({
        type: 'file',
        item: dragProps,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    })

    const dragPreview =
        dragProps.dragFiles.length > 1
            ? createDragPreview(t('DRAG.MULTIPLE', { count: dragProps.dragFiles.length }), isDarkModeActive)
            : undefined

    return {
        dragRef: drag,
        dragPreview: dragPreview && <DragPreviewImage connect={preview} src={dragPreview} />,
    }
}
