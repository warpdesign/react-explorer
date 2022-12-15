import * as React from 'react'
import {
    DragSource,
    DragSourceMonitor,
    DragSourceConnector,
    DragSourceSpec,
    DragElementWrapper,
    DragPreviewOptions,
    DragSourceOptions,
    ConnectDropTarget,
} from 'react-dnd'
import { createDragPreview } from 'react-dnd-text-dragpreview'
import i18next from 'i18next'
import { TableRowProps } from 'react-virtualized'

import { FileState } from '$src/state/fileState'
import { DraggedObject } from '$src/types'

function collect(
    connect: DragSourceConnector,
    monitor: DragSourceMonitor,
): {
    connectDragPreview: DragElementWrapper<DragPreviewOptions>
    connectDragSource: DragElementWrapper<DragSourceOptions>
    isDragging: boolean
} {
    return {
        connectDragSource: connect.dragSource(),
        connectDragPreview: connect.dragPreview(),
        isDragging: monitor.isDragging(),
    }
}

export interface RowRendererProps extends TableRowProps {
    selectedCount: number
    fileCache: FileState
    isDarkModeActive: boolean
    isSelected: boolean
    connectDragPreview: DragElementWrapper<DragPreviewOptions>
    connectDragSource: DragElementWrapper<DragSourceOptions>
}

export interface CollectedProps {
    connectDropTarget?: ConnectDropTarget
    isOver?: boolean
    canDrop?: boolean
}

const fileSource: DragSourceSpec<RowRendererProps, DraggedObject> = {
    beginDrag(props: RowRendererProps) {
        return {
            selectedCount: props.selectedCount,
            fileState: props.fileCache,
            dragFiles: props.selectedCount > 0 ? props.fileCache.selected.slice(0) : [props.rowData.nodeData],
        }
    },
    canDrag: (props: RowRendererProps /*monitor: DragSourceMonitor*/) => {
        return (props.fileCache && props.fileCache.isVisible) || false
    },
}

function createPreview(size: number, isDarkModeActive: boolean): HTMLImageElement {
    const dragText = i18next.t('DRAG.MULTIPLE', { count: size })

    return createDragPreview(
        dragText,
        Object.assign(
            {
                backgroundColor: '#efefef',
                borderColor: '#1a1a1a',
                color: '#1a1a1a',
                fontSize: 14,
                paddingTop: 7,
                paddingRight: 10,
                paddingBottom: 7,
                paddingLeft: 10,
            },
            {
                backgroundColor: isDarkModeActive ? 'rgba(92, 112, 128, 0.3)' : 'rgba(191, 204, 214, 0.4)',
                color: isDarkModeActive ? '#f5f8fa' : '#182026',
                borderColor: 'rgba(0,0,0,0)',
            },
        ),
    )
}

// interface RowRendererParams {
//     className: string;
//     columns: Array<any>;
//     index: number;
//     isScrolling: boolean;
//     onRowClick?: Function;
//     onRowDoubleClick?: Function;
//     onRowMouseOver?: Function;
//     onRowRightClick?: Function;
//     onRowMouseOut?: Function;
//     rowData: any;
//     style: any;
// }

interface A11yProps {
    [key: string]: string | number | ((e: React.MouseEvent) => void)
}

/**
 * Default row renderer for Table.
 */
export function RowRendererFn({
    className,
    columns,
    index,
    onRowClick,
    onRowDoubleClick,
    onRowMouseOut,
    onRowMouseOver,
    onRowRightClick,
    rowData,
    style,
    key,
    selectedCount,
    fileCache,
    connectDragSource,
    connectDragPreview,
    isDarkModeActive,
}: RowRendererProps): React.ReactElement {
    const a11yProps: A11yProps = { 'aria-rowindex': index + 1 }
    if (onRowClick || onRowDoubleClick || onRowMouseOut || onRowMouseOver || onRowRightClick) {
        a11yProps['aria-label'] = 'row'
        a11yProps.tabIndex = 0

        if (onRowClick) {
            a11yProps.onClick = (event: React.MouseEvent<HTMLElement>): void => onRowClick({ event, index, rowData })
        }
        if (onRowDoubleClick) {
            a11yProps.onDoubleClick = (event: React.MouseEvent<HTMLElement>): void =>
                onRowDoubleClick({ event, index, rowData })
        }
        if (onRowMouseOut) {
            a11yProps.onMouseOut = (event: React.MouseEvent<HTMLElement>): void =>
                onRowMouseOut({ event, index, rowData })
        }
        if (onRowMouseOver) {
            a11yProps.onMouseOver = (event: React.MouseEvent<HTMLElement>): void =>
                onRowMouseOver({ event, index, rowData })
        }
        if (onRowRightClick) {
            a11yProps.onContextMenu = (event: React.MouseEvent<HTMLElement>): void =>
                onRowRightClick({ event, index, rowData })
        }
    }

    if (fileCache.isVisible) {
        const img = selectedCount > 1 ? createPreview(selectedCount, isDarkModeActive) : undefined
        if (img) {
            img.onload = () => connectDragPreview(img)
        }
    }

    return connectDragSource(
        <div {...a11yProps} className={className} data-cy-file key={key} role="row" style={style}>
            {columns}
        </div>,
    )
}

const RowRendererDragged = DragSource<RowRendererProps>('file', fileSource, collect)(RowRendererFn)

export function RowRenderer(props: RowRendererProps): JSX.Element {
    return <RowRendererDragged {...props} />
}
