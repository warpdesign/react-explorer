import React, { forwardRef, useImperativeHandle, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useVirtual } from 'react-virtual'
import classNames from 'classnames'
import { Colors, Icon } from '@blueprintjs/core'

import { LayoutActions, LayoutProps, makeEvent } from '$src/hooks/useLayout'
import { ArrowKey, FileViewItem } from '$src/types'
import { TruncatedText } from '../components/TruncatedText'

import '$src/css/fileview-icons.css'
import { Placeholder } from '../components/Placeholder'

export interface IconLayoutOptions {
    iconSize: number
}

export const IconsLayout = forwardRef<LayoutActions, LayoutProps<IconLayoutOptions>>(
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
            options: { iconSize } = {
                iconSize: 64,
            },
        }: LayoutProps<IconLayoutOptions>,
        ref,
    ) => {
        const tableRef: React.MutableRefObject<HTMLDivElement> = useRef()
        const [rowWidth, setRowWidth] = useState(0)
        const itemWidth = Math.floor(iconSize * 1.9)
        const itemPerRow = Math.floor(rowWidth / itemWidth)
        const extraRow = itemCount % itemPerRow ? 1 : 0
        const numRows = itemPerRow > 0 ? Math.floor(itemCount / itemPerRow) + extraRow : 0

        console.log('render Icons!', cursorIndex)

        const getItems = (row: number) => {
            const startIndex = row * itemPerRow
            const maxIndex = Math.min(startIndex + itemPerRow, itemCount)
            const items = []

            for (let i = startIndex; i < maxIndex; ++i) {
                items.push(getItem(i))
            }

            return items
        }

        const { totalSize, virtualItems, scrollToIndex } = useVirtual({
            size: numRows,
            parentRef: tableRef,
            estimateSize: React.useCallback(() => Math.floor(itemWidth), []),
            overscan: 0,
        })

        useLayoutEffect(() => {
            const { width } = tableRef.current.getBoundingClientRect()
            setRowWidth(width)
        }, [])

        useImperativeHandle(
            ref,
            () => ({
                getNextIndex: (index: number, direction: ArrowKey) => {
                    console.log(
                        `should navigate to ${direction} index=${index} itemCount=${itemCount} itemPerRow=${itemPerRow}`,
                    )

                    switch (direction) {
                        case 'ArrowDown':
                            // if it's the first time arrow down key is pressed
                            // we have to select the first element of the first row,
                            // otherwise, select the element at the same position
                            // in the next row
                            return index === -1 ? 0 : index + itemPerRow

                        case 'ArrowUp':
                            return index - itemPerRow

                        case 'ArrowRight':
                            return index + 1

                        case 'ArrowLeft':
                            return index - 1

                        default:
                            console.warn(`getNextIndex: unknown direction ${direction}`)
                            return -1
                    }
                },
                icons: true,
            }),
            [itemPerRow],
        )

        useEffect(() => {
            // Position scrolling in these cases:
            // 1. new file has been selected: scroll to selected index to make sure it's visible
            // 2. new directory has been loaded (or same reloaded): scroll to top or selected index
            if (status === 'ok' && itemPerRow > 0) {
                console.log('*** scrolling to cursorIndex', cursorIndex, itemPerRow)
                const row = Math.floor(cursorIndex / itemPerRow)
                console.log('*** scrolling to index', cursorIndex === -1 ? 0 : row)
                scrollToIndex(cursorIndex === -1 ? 0 : row)
            }
        }, [cursorIndex, status, itemPerRow])

        return (
            <div
                className="fileview-icons"
                ref={tableRef}
                style={{ height: '100%', width: '100%', overflow: 'auto' }}
                // onClick={onBlankAreaClick}
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
                            const items = getItems(virtualRow.index)
                            return (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                        display: 'flex',
                                    }}
                                    key={virtualRow.index}
                                    data-cy-file
                                    tabIndex={0}
                                >
                                    {items.map((item, index) => {
                                        const clickHandler = makeEvent(
                                            virtualRow.index * itemPerRow + index,
                                            item,
                                            onItemClick,
                                        )

                                        return (
                                            <div
                                                className={classNames(item.isSelected && 'selected')}
                                                key={`row_${virtualRow.index}_item_${index}`}
                                                style={{
                                                    margin: '4px',
                                                    overflow: 'hidden',
                                                    width: `${itemWidth}px`,
                                                    alignSelf: 'start',
                                                }}
                                                onClick={clickHandler}
                                            >
                                                <Icon
                                                    icon={item.icon}
                                                    size={iconSize}
                                                    color={Colors.GRAY2}
                                                    title={item.name}
                                                    className="icon"
                                                />
                                                <TruncatedText
                                                    key={`text_${virtualRow.index}_item_${index}`}
                                                    text={item.name}
                                                    lines={2}
                                                />
                                            </div>
                                        )
                                    })}
                                    {/* <Row
                                            rowData={rowData}
                                            index={virtualRow.index}
                                            onRowClick={onItemClick}
                                            onRowRightClick={onItemRightClick}
                                            onRowDoubleClick={onItemDoubleClick}
                                            onInlineEdit={onInlineEdit}
                                            getDragProps={getDragProps}
                                            isDarkModeActive={isDarkModeActive}
                                        /> */}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    },
)

IconsLayout.displayName = 'IconsLayout'
