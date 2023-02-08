import React, { forwardRef, useImperativeHandle, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useVirtual } from 'react-virtual'

import { LayoutActions, LayoutProps } from '$src/hooks/useLayout'
import { ArrowKey } from '$src/types'

import '$src/css/fileview-icons.css'
import { Placeholder } from '../components/Placeholder'
import { Item } from './components/Item'

export interface IconLayoutOptions {
    iconSize: number
}

export const IconLayout = forwardRef<LayoutActions, LayoutProps<IconLayoutOptions>>(
    (
        {
            onItemClick,
            onBlankAreaClick,
            onItemDoubleClick,
            onItemRightClick,
            onInlineEdit,
            getItem,
            getDragProps,
            itemCount,
            error,
            status,
            cursorIndex = -1,
            isDarkModeActive,
            options: { iconSize } = {
                iconSize: 56,
            },
        }: LayoutProps<IconLayoutOptions>,
        ref,
    ) => {
        const tableRef: React.MutableRefObject<HTMLDivElement> = useRef()
        const [rowWidth, setRowWidth] = useState(0)
        // margin between items: we need to add it to the width
        const margin = 4
        const itemWidth = iconSize * 1.9 + margin * 2
        const itemsPerRow = Math.floor(rowWidth / itemWidth)
        const extraRow = itemCount % itemsPerRow ? 1 : 0
        const numRows = itemsPerRow > 0 ? Math.floor(itemCount / itemsPerRow) + extraRow : 0

        const getItems = (row: number) => {
            const startIndex = row * itemsPerRow
            const maxIndex = Math.min(startIndex + itemsPerRow, itemCount)
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
                        `should navigate to ${direction} index=${index} itemCount=${itemCount} itemsPerRow=${itemsPerRow}`,
                    )

                    switch (direction) {
                        case 'ArrowDown':
                            // if it's the first time arrow down key is pressed
                            // we have to select the first element of the first row,
                            // otherwise, select the element at the same position
                            // in the next row
                            return index === -1 ? 0 : index + itemsPerRow

                        case 'ArrowUp':
                            return index - itemsPerRow

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
            [itemsPerRow],
        )

        useEffect(() => {
            // Position scrolling in these cases:
            // 1. new file has been selected: scroll to selected index to make sure it's visible
            // 2. new directory has been loaded (or same reloaded): scroll to top or selected index
            if (status === 'ok' && itemsPerRow > 0) {
                console.log('*** scrolling to cursorIndex', cursorIndex, itemsPerRow)
                const row = Math.floor(cursorIndex / itemsPerRow)
                console.log('*** scrolling to index', cursorIndex === -1 ? 0 : row)
                scrollToIndex(cursorIndex === -1 ? 0 : row)
            }
        }, [cursorIndex, status, itemsPerRow])

        return (
            <div
                className="fileview-icons"
                ref={tableRef}
                style={{
                    height: '100%',
                    width: '100%',
                    overflow: 'auto',
                    wordBreak: 'break-word',
                    textAlign: 'center',
                    borderRadius: '8px',
                }}
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
                                    {items.map((item, index) => (
                                        <Item
                                            key={`row_${virtualRow.index}_item_${index}`}
                                            item={item}
                                            itemIndex={virtualRow.index * itemsPerRow + index}
                                            width={itemWidth}
                                            margin={margin}
                                            onItemClick={onItemClick}
                                            onItemDoubleClick={onItemDoubleClick}
                                            onItemRightClick={onItemRightClick}
                                            isDarkModeActive={isDarkModeActive}
                                            iconSize={iconSize}
                                        />
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    },
)

IconLayout.displayName = 'IconLayout'
