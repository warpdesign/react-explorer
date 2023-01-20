import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'
import { useVirtual } from 'react-virtual'
import classNames from 'classnames'

import { Row } from './components/Row'
import { Header } from './components/Header'
import { LayoutActions, LayoutProps } from '$src/hooks/useLayout'
import { ArrowKey, FileViewItem } from '$src/types'
import { Placeholder } from './components/Placeholder'

import '$src/css/fileview-table.css'

const ROW_HEIGHT = 28

const rowClassName = (item: FileViewItem): string => {
    const error = item && item.nodeData.mode === -1

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
            // Position scrolling in these cases:
            // 1. new file has been selected: scroll to selected index to make sure it's visible
            // 2. new directory has been loaded (or same reloaded): scroll to top or selected index
            status === 'ok' && scrollToIndex(cursorIndex === -1 ? 0 : cursorIndex)
        }, [cursorIndex, status])

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
                                            onInlineEdit={onInlineEdit}
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

TableLayout.displayName = 'TableLayout'
