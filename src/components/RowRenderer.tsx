import * as React from 'react';
import { DragSource, DragSourceMonitor, DragSourceConnector, DragSourceSpec } from 'react-dnd';
import { createDragPreview } from 'react-dnd-text-dragpreview';
import { File } from '../services/Fs';
import { FileState } from '../state/fileState';
import i18next from 'i18next';

function collect(connect: DragSourceConnector, monitor: DragSourceMonitor) {
    return {
        connectDragSource: connect.dragSource(),
        connectDragPreview: connect.dragPreview(),
        isDragging: monitor.isDragging()
    }
}

export interface DraggedObject {
    selectedCount: number;
    fileState: FileState;
    dragFile: File;
}

const fileSource: DragSourceSpec<RowRendererParams, DraggedObject> = {
    beginDrag(props: any) {
        return {
            selectedCount: props.selectedCount,
            fileState: props.fileCache,
            dragFile: props.rowData.nodeData
        };
    },
    canDrag: (props: any, monitor: DragSourceMonitor) => {
        return props.fileCache && props.fileCache.isVisible || false;
    }
};

function createPreview(size: number, isDarkModeActive: boolean) {
    const dragText = i18next.t('DRAG.MULTIPLE', { count: size });

    return createDragPreview(dragText, Object.assign({
        backgroundColor: '#efefef',
        borderColor: '#1a1a1a',
        color: '#1a1a1a',
        fontSize: 14,
        paddingTop: 7,
        paddingRight: 10,
        paddingBottom: 7,
        paddingLeft: 10
    }, {
            backgroundColor: isDarkModeActive ? 'rgba(92, 112, 128, 0.3)' : 'rgba(191, 204, 214, 0.4)',
            color: isDarkModeActive ? '#f5f8fa' : '#182026',
            borderColor: 'rgba(0,0,0,0)'
        }));
}

interface RowRendererParams {
    className: string;
    columns: Array<any>;
    index: number;
    isScrolling: boolean;
    onRowClick?: Function;
    onRowDoubleClick?: Function;
    onRowMouseOver?: Function;
    onRowRightClick?: Function;
    onRowMouseOut?: Function;
    rowData: any;
    style: any;
};

interface A11yProps {
    [key: string]: any;
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
    isDarkModeActive
}: any) {
    const a11yProps: A11yProps = { 'aria-rowindex': index + 1 };
    if (
        onRowClick ||
        onRowDoubleClick ||
        onRowMouseOut ||
        onRowMouseOver ||
        onRowRightClick
    ) {
        a11yProps['aria-label'] = 'row';
        a11yProps.tabIndex = 0;

        if (onRowClick) {
            a11yProps.onClick = (event: React.MouseEvent<any>) => onRowClick({ event, index, rowData });
        }
        if (onRowDoubleClick) {
            a11yProps.onDoubleClick = (event: React.MouseEvent<any>) =>
                onRowDoubleClick({ event, index, rowData });
        }
        if (onRowMouseOut) {
            a11yProps.onMouseOut = (event: React.MouseEvent<any>) => onRowMouseOut({ event, index, rowData });
        }
        if (onRowMouseOver) {
            a11yProps.onMouseOver = (event: React.MouseEvent<any>) => onRowMouseOver({ event, index, rowData });
        }
        if (onRowRightClick) {
            a11yProps.onContextMenu = (event: React.MouseEvent<any>) =>
                onRowRightClick({ event, index, rowData });
        }
    }

    if (fileCache.isVisible) {
        if (selectedCount > 1) {
            connectDragPreview(createPreview(selectedCount, isDarkModeActive));
        } else {
            connectDragPreview(undefined);
        }
    }

    return (
        connectDragSource(<div
            {...a11yProps}
            className={className}
            key={key}
            role="row"
            style={style}>
            {columns}
        </div>)
    );
}

const RowRendererDragged = DragSource<RowRendererParams>('file', fileSource, collect)(RowRendererFn);

export function RowRenderer(props: RowRendererParams) {
    return <RowRendererDragged {...props} />;
}
