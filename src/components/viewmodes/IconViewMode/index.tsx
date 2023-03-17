import React, { forwardRef, useImperativeHandle, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useVirtual } from 'react-virtual'

import { ViewModeActions, ViewModeProps } from '$src/hooks/useViewMode'
import { ArrowKey } from '$src/types'

import '$src/css/fileview-icons.css'
import { Placeholder } from '../components/Placeholder'
import { Item } from './components/Item'
import { RectangleSelection, Selection } from '../components/Selection'
import { Colors } from '@blueprintjs/core'

export interface IconViewModeOptions {
    iconSize: number
    isSplitViewActive: boolean
}

export const IconViewMode = forwardRef<ViewModeActions, ViewModeProps<IconViewModeOptions>>(
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
            viewRef,
        }: ViewModeProps<IconViewModeOptions>,
        ref,
    ) => {
        console.log('render IconView')
        const [rowWidth, setRowWidth] = useState(0)
        // margin between items: we need to add it to the width
        const margin = 4
        // width is also the height?
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

        const { totalSize, virtualItems, scrollToIndex, scrollToOffset } = useVirtual({
            size: numRows,
            parentRef: viewRef,
            estimateSize: React.useCallback(() => Math.floor(itemWidth), []),
            overscan: 0,
        })

        // Cecalculate width on mount and when splitView mode is changed
        // TODO: would be a good idea to do it on resize as well, but could be
        // expensive.
        useLayoutEffect(() => {
            const { width } = viewRef.current.getBoundingClientRect()
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
                getSelectionRange: ({ left, top, width, height, nearBottomEdge }: Selection) => {
                    // rect is giving absolute coords, we need to convert them
                    // to coords relative to the viewRef
                    // Given rect (x, y, x2, y2), return row + col of x,y
                    // calc first
                    // first get topLeft most point between origin & target

                    // line height
                    const lineHeight = Math.floor(itemWidth)
                    const { scrollTop } = viewRef.current
                    const lineWidth = itemWidth + margin * 2
                    const topLeftIndex = Math.floor((scrollTop + top) / lineHeight) * itemsPerRow
                    const bottomLeftIndex = Math.floor((scrollTop + top + height) / lineHeight) * itemsPerRow
                    const size =
                        Math.min(Math.ceil((left + width) / lineWidth), itemsPerRow) - Math.floor(left / lineWidth)
                    console.log({ topLeftIndex, bottomLeftIndex, size, nearBottomEdge })

                    return [topLeftIndex, bottomLeftIndex, size]
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
            // <RectangleSelection
            //     onSelect={onSelect}
            //     style={{
            //         border: '1px dotted red',
            //         borderColor: Colors.BLUE3,
            //         backgroundColor: Colors.BLUE5,
            //         opacity: .4
            //     }}>
            <div
                className="fileview-icons"
                ref={viewRef as React.MutableRefObject<HTMLDivElement>}
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
                                            onInlineEdit={onInlineEdit}
                                            getDragProps={getDragProps}
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
            // </RectangleSelection>
        )
    },
)

IconViewMode.displayName = 'IconViewMode'
