import React, { useCallback } from 'react'
import classNames from 'classnames'
import { Classes, Colors, Icon, TextArea } from '@blueprintjs/core'

import { TruncatedText } from '$src/components/layouts/components/TruncatedText'
import { ItemMouseEvent, makeEvent } from '$src/hooks/useLayout'
import { FileViewItem } from '$src/types'
import { useFileClick } from '$src/hooks/useFileClick'

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
}

export const Item = ({
    onItemClick,
    onItemDoubleClick,
    onItemRightClick,
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
        <div
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
    )
}
