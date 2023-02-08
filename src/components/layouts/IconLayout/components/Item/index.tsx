import React, { useRef } from 'react'
import classNames from 'classnames'
import { Classes, Colors, Icon, TextArea } from '@blueprintjs/core'

import { TruncatedText } from '$src/components/layouts/components/TruncatedText'
import { ItemMouseEvent, makeEvent } from '$src/hooks/useLayout'
import { FileViewItem } from '$src/types'

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

export const CLICK_DELAY = 500

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
    const clickRef: React.MutableRefObject<number> = useRef(-CLICK_DELAY)
    const clickHandler = makeEvent(itemIndex, item, onItemClick)
    const doubleClickHandler = makeEvent(itemIndex, item, onItemDoubleClick)
    const rightClickHandler = makeEvent(itemIndex, item, onItemRightClick)

    return (
        <div
            className={classNames(item.isSelected && 'selected')}
            style={{
                margin: `${margin}px`,
                overflow: 'hidden',
                width: `${width}px`,
                alignSelf: 'start',
            }}
            onClick={(e: React.MouseEvent<HTMLElement>) => {
                // we don't want to react on clicks on empty/blank area
                if ((e.target as HTMLElement).tagName === 'DIV') {
                    return
                }

                e.stopPropagation()

                if (e.timeStamp - clickRef.current > CLICK_DELAY) {
                    clickHandler(e)
                } else {
                    doubleClickHandler(e)
                }
                clickRef.current = e.timeStamp
            }}
            onContextMenu={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation()
                rightClickHandler(e)
            }}
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
