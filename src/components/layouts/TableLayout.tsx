import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, createRef, MutableRefObject } from 'react'
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

import { ItemMouseEvent, LayoutActions, LayoutProps } from '$src/hooks/useLayout'
import CONFIG from '$src/config/appConfig'
import { TStatus } from '$src/state/fileState'
import { TSORT_METHOD_NAME } from '$src/services/FsSort'
import { useDrag, useDragDropManager } from 'react-dnd'
import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { useVirtual } from 'react-virtual'
// import { RowRendererProps } from '../RowRenderer'

const CLICK_DELAY = 400
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

const Size = ({ data: { size } }: { data: FileViewItem }) => {
    return <div className="size">{size}</div>
}

const Name = ({ data }: { data: FileViewItem }) => {
    const { icon, title } = data

    return (
        <div className="name">
            <Icon icon={icon}></Icon>
            <span title={title} className="file-label" spellCheck="false">
                {data.name}
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

const rowClassName = (item: FileViewItem): string => {
    const error = item && item.nodeData.mode === -1
    // const mainClass = index === -1 ? 'headerRow' : 'tableRow'

    return classNames('tableRow', item && item.className, {
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

interface CollectedProps {
    isDragging: boolean
}

interface RowProps {
    rowData: FileViewItem
    onRowClick?: (event: ItemMouseEvent) => void
    onRowDoubleClick?: (event: ItemMouseEvent) => void
    index: number
}

const Row = ({
    rowData,
    onRowClick,
    onRowDoubleClick = () => {
        console.log('double! ')
    },
    index,
}: RowProps): JSX.Element => {
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
    const clickRef: React.MutableRefObject<number> = useRef(0)
    const clickHandler = makeEvent(index, rowData, onRowClick)
    const doubleClickHandler = makeEvent(index, rowData, onRowDoubleClick)

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
            style={{ width: '100%', height: '100%', alignItems: 'center', display: 'flex' }}
        >
            <Name data={rowData} />
            <Size data={rowData} />
        </div>
    )
}

interface Toto {
    blah: string
}

export const TableLayout = forwardRef<LayoutActions, LayoutProps>(
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
        const [cursor, setCursor] = useState(-1)
        const tableRef: React.MutableRefObject<HTMLDivElement> = useRef()
        const rowVirtualizer = useVirtual({
            size: itemCount,
            parentRef: tableRef,
            estimateSize: React.useCallback(() => ROW_HEIGHT, []),
        })

        useImperativeHandle(
            ref,
            () => ({
                getNextIndex: (index: number, direction: ArrowKey) => {
                    console.log(`should navigate to ${direction} index=${index} itemCount=${itemCount}`)
                    switch (direction) {
                        case 'ArrowDown':
                            return index + 1

                        case 'ArrowUp':
                            return index - 1

                        default:
                            console.warn(`getNextIndex: unknown direction ${direction}`)
                            return -1
                    }
                },
                // selectAll: () => {
                //     console.log('should selectAll')
                // },
                // invertSelection: () => {
                //     console.log('should invertSelection')
                // },
                // setEditElement: (index: number) => {
                //     setEditElementIndex(index)
                // },
                // setCursor: (index: number) => setCursor(index),
            }),
            [],
        )

        const _onHeaderClick = ({ columnData, event /*, dataKey */ }: HeaderMouseEventHandlerParams): void => {
            const newMethod = columnData.sortMethod as TSORT_METHOD_NAME
            event.stopPropagation()
            onHeaderClick({ event, data: newMethod })
        }

        return (
            <div
                // onClick={onBlankAreaClick}
                ref={tableRef}
                role="row"
                style={{
                    height: `${rowVirtualizer.totalSize}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.virtualItems.map((virtualRow) => {
                    const rowData = getItem(virtualRow.index)
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            key={virtualRow.index}
                            className={rowClassName(rowData)}
                        >
                            <Row rowData={rowData} index={virtualRow.index} onRowClick={onItemClick} />
                            {/* onRowClick={onItemClick} onRowDoubleClick={onItemDoubleClick} */}
                        </div>
                    )
                })}
                {/* <Table
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
                </Table> */}
            </div>
        )
    },
)

TableLayout.displayName = 'TableLayout'
