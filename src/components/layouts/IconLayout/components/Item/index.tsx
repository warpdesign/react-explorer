import React, { useCallback } from 'react'
import classNames from 'classnames'
import { Classes, Colors, Icon, TextArea } from '@blueprintjs/core'

import { TruncatedText } from '$src/components/layouts/components/TruncatedText'
import { ItemMouseEvent, makeEvent } from '$src/hooks/useLayout'
import { DraggedObject, FileViewItem } from '$src/types'
import { useFileClick } from '$src/hooks/useFileClick'
import { useDragFile } from '$src/hooks/useDragFile'

interface Props {
    item: FileViewItem
    itemIndex: number
    width: number
    margin: number
    iconSize: number
    isDarkModeActive: boolean
    onItemClick: (event: ItemMouseEvent) => void
    onItemDoubleClick: (event: ItemMouseEvent) => void
    onItemRightClick: (event: ItemMouseEvent) => void
    getDragProps: (index: number) => DraggedObject
}

export const Item = ({
    onItemClick,
    onItemDoubleClick,
    onItemRightClick,
    getDragProps,
    margin,
    width,
    item,
    itemIndex,
    iconSize,
    isDarkModeActive,
}: Props) => {
    const clickHandler = makeEvent(itemIndex, item, onItemClick)
    const doubleClickHandler = makeEvent(itemIndex, item, onItemDoubleClick)
    const rightClickHandler = makeEvent(itemIndex, item, onItemRightClick)
    const { dragRef, dragPreview } = useDragFile({
        isDarkModeActive,
        dragProps: getDragProps(itemIndex),
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
                ref={dragRef}
                className={classNames(item.isSelected && 'selected')}
                style={{
                    margin: `${margin}px`,
                    overflow: 'hidden',
                    width: `${width}px`,
                    alignSelf: 'start',
                }}
                {...mouseProps}
            >
                <Icon icon={item.icon} size={iconSize} color={Colors.GRAY2} title={item.name} className="icon" />
                {!item.isEditing ? (
                    <TruncatedText text={item.name} lines={2} isSelected={item.isSelected} />
                ) : (
                    <TextArea
                        className={Classes.INPUT}
                        spellCheck={false}
                        defaultValue={item.name}
                        growVertically={false}
                        fill={false}
                        autoFocus
                        small
                    />
                )}
            </div>
            {dragPreview}
        </>
    )
}
