import * as React from 'react';
import { DragSource, DragSourceMonitor, DragSourceConnector, DragSourceSpec } from 'react-dnd';
import { ItemTypes } from './DragLayer';
import { createDragPreview } from 'react-dnd-text-dragpreview';
import { FileState } from '../state/fileState';

const img = new Image();
img.src = 'data:image/jpeg;base64,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';

function collect(connect: DragSourceConnector, monitor:DragSourceMonitor) {
    return {
        connectDragSource: connect.dragSource(),
        connectDragPreview: connect.dragPreview(),
        isDragging: monitor.isDragging()
    }
}

interface DraggedObject {
    selectedCount: number;
    fileState: FileState;
}

const fileSource: DragSourceSpec<RowRendererParams, DraggedObject> = {
    beginDrag(props: any) {
        return {
            selectedCount: props.selectedCount,
            fileState: props.fileCache
        };
    },
    canDrag: (props: any, monitor:DragSourceMonitor) => {
        return props.fileCache && props.fileCache.active || false;
    }
};

function createPreview(size: number) {
    return createDragPreview(`Yop: ${size}`, Object.assign({
        backgroundColor: '#efefef',
        borderColor: '#1a1a1a',
        color: '#1a1a1a',
        fontSize: 14,
        paddingTop: 5,
        paddingRight: 5,
        paddingBottom: 5,
        paddingLeft: 5
    }, {
            backgroundColor: 'rgba(191, 204, 214, 0.4)',
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

interface A11yProps{
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
    isDragging
}: any) {
    const a11yProps: A11yProps = { 'aria-rowindex': index + 1};
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

    if (fileCache.active) {
        console.log('rowCount', selectedCount, isDragging);
        if (selectedCount > 1) {
            connectDragPreview(createPreview(selectedCount));
        } else {
            connectDragPreview(undefined);
        }
    }
        // test change preview
        // if (selectedCount > 1) {
        //     console.log('**** selecteCount')
        //     // connectDragPreview(img);
        //     connectDragPreview(createPreview(selectedCount));
        // } else {
        //     connectDragPreview(undefined);
        // }
    // } else {
    //     connectDragPreview(undefined);
    // }

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

const RowRendererDragged = DragSource<RowRendererParams>(ItemTypes.FILE, fileSource, collect)(RowRendererFn);

export function RowRenderer(props:RowRendererParams) {
    return <RowRendererDragged {...props}/>;
}