import React, { useCallback } from 'react'
import classNames from 'classnames'

import { TruncatedText } from '$src/components/viewmodes/components/TruncatedText'
import { useDragFile } from '$src/hooks/useDragFile'
import { useFileClick } from '$src/hooks/useFileClick'
import { InlineEditEvent, ItemMouseEvent, makeEvent } from '$src/hooks/useViewMode'
import { DraggedObject, FileViewItem } from '$src/types'

interface Props {
    item: FileViewItem
    itemIndex: number
    width: number
    margin: number
    iconSize: number
    isDarkModeActive: boolean
    isViewActive: boolean
    onItemClick: (event: ItemMouseEvent) => void
    onItemDoubleClick: (event: ItemMouseEvent) => void
    onItemRightClick: (event: ItemMouseEvent) => void
    onInlineEdit: (event: InlineEditEvent) => void
    getDragProps: (index: number) => DraggedObject
}

export const Item = ({
    onItemClick,
    onItemDoubleClick,
    onItemRightClick,
    onInlineEdit,
    getDragProps,
    margin,
    width,
    item,
    itemIndex,
    iconSize,
    isDarkModeActive,
    isViewActive,
}: Props) => {
    const clickHandler = makeEvent(itemIndex, item, onItemClick)
    const doubleClickHandler = makeEvent(itemIndex, item, onItemDoubleClick)
    const rightClickHandler = makeEvent(itemIndex, item, onItemRightClick)
    const dragProps = getDragProps(itemIndex)
    const { dragRef, dragPreview } = useDragFile({
        isDarkModeActive,
        dragProps,
    })
    const mouseProps = useFileClick({
        clickHandler,
        doubleClickHandler,
        rightClickHandler,
        // we don't want to react on clicks on empty/blank area
        shouldSkipEvent: useCallback(
            (event: React.MouseEvent<HTMLElement>) => (event.target as HTMLElement).tagName === 'DIV',
            [],
        ),
    })

    return (
        <>
            <div
                ref={dragRef as unknown as React.Ref<HTMLDivElement>}
                className={classNames(item.isSelected && 'selected', item.className)}
                style={{
                    margin: `${margin}px`,
                    overflow: 'hidden',
                    width: `${width}px`,
                    alignSelf: 'start',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
                {...mouseProps}
            >
                <div
                    className="icon"
                    title={item.name}
                    style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--mantine-color-gray-6)',
                    }}
                >
                    <item.icon size={iconSize} />
                </div>
                <TruncatedText
                    lines={2}
                    item={item}
                    disabledInlineEdit={!dragProps || (dragProps.fileState?.selected.length ?? 0) >= 2}
                    onInlineEdit={onInlineEdit}
                    isViewActive={isViewActive}
                />
            </div>
            {dragPreview}
        </>
    )
}
