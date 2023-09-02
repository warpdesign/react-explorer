import React, { forwardRef, useImperativeHandle, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useVirtual } from 'react-virtual'

import { ViewModeActions, ViewModeProps } from '$src/hooks/useViewMode'
import { ArrowKey } from '$src/types'

import '$src/css/fileview-icons.css'
import { Placeholder } from '../components/Placeholder'
import { Item } from './components/Item'
import { GoblinCache, GoblinCacheOptions } from 'goblin-cache'
import Worker from '$src/image.worker'

export interface TileViewModeOptions {
    iconSize: number
    isSplitViewActive: boolean
}

export const TileViewMode = forwardRef<ViewModeActions, ViewModeProps<TileViewModeOptions>>(
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
            options: { iconSize, isSplitViewActive },
        }: ViewModeProps<TileViewModeOptions>,
        ref,
    ) => {
        const tableRef: React.MutableRefObject<HTMLDivElement> = useRef()
        const [rowWidth, setRowWidth] = useState(0)
        // margin between items: we need to add it to the width
        const margin = 4
        const itemWidth = iconSize + margin * 2
        const itemsPerRow = Math.floor(rowWidth / itemWidth)
        const extraRow = itemCount % itemsPerRow ? 1 : 0
        const numRows = itemsPerRow > 0 ? Math.floor(itemCount / itemsPerRow) + extraRow : 0
        const options: GoblinCacheOptions = {
            dbOptions: {
                dbName: 'blobDb',
                objectStore: 'IndexDbblobObjectStore',
            },
            spawn: () => new Worker(),
            memoryLimit: 500,
            memLOptions: { batchSize: 1, maxBatches: 50, timeoutMs: 0 },
            dbLOptions: { batchSize: 50, maxBatches: 5, timeoutMs: 200 },
            hvLOptions: { batchSize: 10, maxBatches: 6, timeoutMs: 50 },
        }

        const cacheManager = GoblinCache.getInstance(options)

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

        // Cecalculate width on mount and when splitView mode is changed
        // TODO: would be a good idea to do it on resize as well, but could be
        // expensive.
        useLayoutEffect(() => {
            const { width } = tableRef.current.getBoundingClientRect()
            setRowWidth(width)
        }, [isSplitViewActive])

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
                            if (index === -1) return 0

                            // if we reached last row, do nothing
                            if (index / itemsPerRow >= numRows - 1) return index

                            const newIndex = index + itemsPerRow

                            // goto element at the same position on the row or
                            // last element of the row
                            return newIndex >= itemCount ? itemCount - 1 : newIndex

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
            [itemsPerRow, numRows],
        )

        useEffect(() => {
            // Position scrolling in these cases:
            // 1. new file has been selected: scroll to selected index to make sure it's visible
            // 2. new directory has been loaded (or same reloaded): scroll to top or selected index
            if (status === 'ok' && itemsPerRow > 0) {
                const row = Math.floor(cursorIndex / itemsPerRow)
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
                                            margin={margin}
                                            onItemClick={onItemClick}
                                            onItemDoubleClick={onItemDoubleClick}
                                            onItemRightClick={onItemRightClick}
                                            onInlineEdit={onInlineEdit}
                                            getDragProps={getDragProps}
                                            isDarkModeActive={isDarkModeActive}
                                            iconSize={iconSize - 10}
                                            cacheManager={cacheManager}
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

TileViewMode.displayName = 'TileViewMode'
