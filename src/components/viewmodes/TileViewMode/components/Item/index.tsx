import React, { useCallback } from 'react'
import classNames from 'classnames'
import { Colors, Icon } from '@blueprintjs/core'

import { TruncatedText } from '$src/components/viewmodes/components/TruncatedText'
import { InlineEditEvent, ItemMouseEvent, makeEvent } from '$src/hooks/useViewMode'
import { DraggedObject, FileViewItem } from '$src/types'
import { useFileClick } from '$src/hooks/useFileClick'
import { useDragFile } from '$src/hooks/useDragFile'

interface Props {
    item: FileViewItem
    itemIndex: number
    //width: number
    margin: number
    iconSize: number
    isDarkModeActive: boolean
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
    //width,
    item,
    itemIndex,
    iconSize,
    isDarkModeActive,
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
    const isImage = item.nodeData.type === 'img'
    return (
        <>
            <div
                ref={dragRef}
                className={classNames(item.isSelected && 'selected', item.className)}
                style={{
                    margin: `${margin}px`,
                    overflow: 'hidden',
                    //width: `${width}px`,
                    alignSelf: 'start',
                }}
                {...mouseProps}
            >
                {isImage ? (
                    <img
                        src={item.nodeData.dir.concat('\\', item.nodeData.name, item.nodeData.extension)}
                        alt={item.name}
                        style={{ height: iconSize }}
                    />
                ) : (
                    <Icon
                        icon={item.icon}
                        size={iconSize}
                        color={Colors.GRAY2}
                        title={item.name}
                        className="icon"
                        style={{ position: 'relative' }}
                    />
                )}
                <TruncatedText
                    lines={2}
                    item={item}
                    selectedCount={dragProps.fileState.selected.length}
                    onInlineEdit={onInlineEdit}
                />
            </div>
            {dragPreview}
        </>
    )
}
