import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'
import { Row } from './components/Row'
import { Header } from './components/Header'
import classNames from 'classnames'

import '$src/css/fileview-table.css'

import { ItemMouseEvent, LayoutActions, LayoutProps } from '$src/hooks/useLayout'
import CONFIG from '$src/config/appConfig'
import { TStatus } from '$src/state/fileState'
import { TSORT_METHOD_NAME } from '$src/services/FsSort'
import { ArrowKey, DraggedObject, FileViewItem } from '$src/types'
import { useVirtual } from 'react-virtual'
import { Placeholder } from './components/Placeholder'
// import { RowRendererProps } from '../RowRenderer'

const ROW_HEIGHT = 28
const SIZE_COLUMN_WITDH = 70
// this is just some small enough value: column will grow
// automatically to make the name visible
const NAME_COLUMN_WIDTH = 10
const GRID_CLASSNAME = 'filetable-grid'
const GRID_CLASSES = `data-cy-filetable ${GRID_CLASSNAME} ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`

const rowClassName = (item: FileViewItem): string => {
    const error = item && item.nodeData.mode === -1
    // const mainClass = index === -1 ? 'headerRow' : 'tableRow'

    return classNames('tableRow', item && item.className, {
        selected: item && item.isSelected,
        error: error,
    })
}

export const TableLayout = forwardRef<LayoutActions, LayoutProps>(
    (
        {
            onItemClick,
            onBlankAreaClick,
            onItemDoubleClick,
            onItemRightClick,
            onHeaderClick,
            onInlineEdit,
            getItem,
            getDragProps,
            itemCount,
            columns,
            error,
            status,
            cursorIndex = -1,
            isDarkModeActive,
        }: LayoutProps,
        ref,
    ) => {
        const tableRef: React.MutableRefObject<HTMLDivElement> = useRef()
        const { totalSize, virtualItems, scrollToIndex } = useVirtual({
            size: itemCount,
            parentRef: tableRef,
            estimateSize: React.useCallback(() => ROW_HEIGHT, []),
            overscan: 5,
            // paddingStart: ROW_HEIGHT,
            // rangeExtractor: (range) => {
            //     const { start, end, size } = range
            //     const length = size > 0 ? (end - start + 1) : 0
            //     console.log('range', start, end)
            //     return length ? [100].concat(Array.from({ length }, (_, i) => i + start)) : []
            // }
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
            }),
            [],
        )

        useEffect(() => {
            cursorIndex > -1 && scrollToIndex(cursorIndex)
        }, [cursorIndex])

        return (
            <>
                {virtualItems.length ? (
                    <Header height={ROW_HEIGHT} columns={columns} onClick={onHeaderClick} />
                ) : undefined}
                <div
                    ref={tableRef}
                    style={{ height: '100%', width: '100%', overflow: 'auto' }}
                    onClick={onBlankAreaClick}
                    tabIndex={0}
                >
                    {!virtualItems.length ? (
                        <Placeholder error={error} status={status} />
                    ) : (
                        <div
                            style={{
                                height: `${totalSize}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualItems.map((virtualRow) => {
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
                                        data-cy-file
                                        className={rowClassName(rowData)}
                                        tabIndex={0}
                                    >
                                        <Row
                                            rowData={rowData}
                                            index={virtualRow.index}
                                            onRowClick={onItemClick}
                                            onRowRightClick={onItemRightClick}
                                            onRowDoubleClick={onItemDoubleClick}
                                            getDragProps={getDragProps}
                                            isDarkModeActive={isDarkModeActive}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </>
        )
    },
)

{
    /* <Table
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
</Table> */
}

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

TableLayout.displayName = 'TableLayout'
