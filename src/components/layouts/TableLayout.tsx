import React, { forwardRef, useImperativeHandle } from 'react'
import { Classes, Icon } from '@blueprintjs/core'
import classNames from 'classnames'
import {
    Column,
    Table,
    TableHeaderProps,
    Index,
    TableCellProps,
    HeaderMouseEventHandlerParams,
    RowMouseEventHandlerParams,
    TableRowProps,
} from 'react-virtualized'

import '$src/css/fileview-table.css'

import { ItemMouseEvent, LayoutProps } from '$src/hooks/useLayout'
import CONFIG from '$src/config/appConfig'
import { TStatus } from '$src/state/fileState'
import { TSORT_METHOD_NAME } from '$src/services/FsSort'
import { useDrag, useDragDropManager } from 'react-dnd'
import { DraggedObject, FileViewItem } from '$src/types'
// import { RowRendererProps } from '../RowRenderer'

const ROW_HEIGHT = 28
const SIZE_COLUMN_WITDH = 70
// this is just some small enough value: column will grow
// automatically to make the name visible
const NAME_COLUMN_WIDTH = 10
const GRID_CLASSNAME = 'filetable-grid'
const GRID_CLASSES = `data-cy-filetable ${GRID_CLASSNAME} ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`

const makeEvent =
    (index: number, data: any, handler: (event: ItemMouseEvent) => void) => (event: React.MouseEvent<HTMLElement>) =>
        handler({
            data,
            index,
            event,
        })

const Name = (data: TableCellProps): React.ReactNode => {
    const { icon, title } = data.rowData

    return (
        <div className="name">
            <Icon icon={icon}></Icon>
            <span title={title} className="file-label" spellCheck="false">
                {data.cellData}
            </span>
        </div>
    )
}

/*
{
    columnData,
    dataKey,
    disableSort,
    label,
    sortBy,
    sortDirection
    }
*/
const Header = (data: TableHeaderProps): React.ReactNode => {
    // TOOD: hardcoded for now, should store the column size/list
    // and use it here instead
    const hasResize = data.columnData.index < 1
    // const { sortMethod, sortOrder } = this.cache
    // const isSort = data.columnData.sortMethod === sortMethod
    const isSort = false
    // const classes = classNames('sort', sortOrder)
    const classes = classNames('sort')

    return (
        <React.Fragment key={data.dataKey}>
            <div className="ReactVirtualized__Table__headerTruncatedText">{data.label}</div>
            {isSort && <div className={classes}>^</div>}
            {hasResize && <Icon className="resizeHandle" icon="drag-handle-vertical"></Icon>}
        </React.Fragment>
    )
}

const rowClassName = (index: number, item: FileViewItem): string => {
    const error = item && item.nodeData.mode === -1
    const mainClass = index === -1 ? 'headerRow' : 'tableRow'

    return classNames(mainClass, item && item.className, {
        selected: item && item.isSelected,
        error: error,
    })
}

const _noRowsRenderer = ({ error, status }: { error: boolean; status: TStatus }): JSX.Element => {
    // const { t } = this.injected
    // const status = this.cache.status
    // const error = this.cache.error

    // we don't want to show empty + loader at the same time
    if (status !== 'busy') {
        // const placeholder = (error && t('COMMON.NO_SUCH_FOLDER')) || t('COMMON.EMPTY_FOLDER')
        const placeholder = 'placeholder to do'
        const icon = error ? 'warning-sign' : 'tick-circle'
        return (
            <div className="empty">
                <Icon icon={icon} iconSize={40} />
                {placeholder}
            </div>
        )
    } else {
        return <div />
    }
}

export const TableLayout = forwardRef(
    (
        {
            onItemClick,
            onBlankAreaClick,
            onItemDoubleClick,
            onHeaderClick,
            onInlineEdit,
            getItem,
            getDragProps,
            itemCount,
            width,
            height,
            columns,
            error,
            status,
        }: LayoutProps,
        ref,
    ) => {
        useImperativeHandle(ref, () => ({
            navigate: (direction: string) => {
                console.log(`should navigate to ${direction}`)
            },
            selectAll: () => {
                console.log('should selectAll')
            },
            invertSelection: () => {
                console.log('should invertSelection')
            },
        }))

        const _onHeaderClick = ({ columnData, event /*, dataKey */ }: HeaderMouseEventHandlerParams): void => {
            const newMethod = columnData.sortMethod as TSORT_METHOD_NAME
            event.stopPropagation()
            onHeaderClick({ event, data: newMethod })
        }

        const RowRenderer = ({
            columns,
            style,
            className,
            index,
            rowData: data,
            rowKey,
        }: TableRowProps & { rowKey?: string }): JSX.Element => {
            const [_, drag] = useDrag<DraggedObject, unknown, unknown>({
                type: 'file',
                item: getDragProps(index),
            })

            const monitor = useDragDropManager().getMonitor()
            const isDragging = !!monitor.isDragging()

            return (
                <div
                    ref={drag}
                    onClick={makeEvent(index, data, onItemClick)}
                    key={rowKey}
                    role="row"
                    style={style}
                    className={className}
                >
                    {columns}
                </div>
            )
        }

        return (
            <div onClick={onBlankAreaClick}>
                <Table
                    headerClassName="tableHeader"
                    headerHeight={ROW_HEIGHT}
                    height={height}
                    gridClassName={GRID_CLASSES}
                    onHeaderClick={_onHeaderClick}
                    // onRowRightClick={onRowRightClick}
                    // onRowDoubleClick={onRowDoubleClick}
                    // onScroll={this.onScroll}
                    noRowsRenderer={() => _noRowsRenderer({ error, status })}
                    rowClassName={({ index }) => rowClassName(index, index > -1 ? getItem(index) : undefined)}
                    rowHeight={ROW_HEIGHT}
                    rowGetter={({ index }) => getItem(index)}
                    rowCount={itemCount}
                    rowRenderer={(props) => <RowRenderer {...props} rowKey={props.key} />}
                    // ref={this.tableRef}
                    width={width}
                >
                    <Column
                        dataKey={columns[0].key}
                        label={columns[0].label}
                        cellRenderer={Name}
                        headerRenderer={Header}
                        width={NAME_COLUMN_WIDTH}
                        flexGrow={1}
                        columnData={{ index: 0, sortMethod: columns[0].key }}
                    />
                    <Column
                        className={`size ${Classes.TEXT_SMALL}`}
                        width={SIZE_COLUMN_WITDH}
                        label={columns[1].label}
                        headerRenderer={Header}
                        dataKey={columns[1].key}
                        flexShrink={1}
                        columnData={{ index: 1, sortMethod: columns[1].key }}
                    />
                </Table>
            </div>
        )
    },
)

TableLayout.displayName = 'TableLayout'
