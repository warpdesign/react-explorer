import React, { useRef, useEffect } from 'react'
import { Icon, InputGroup } from '@blueprintjs/core'

import type { FileViewItem } from '$src/types'
import { InlineEditEvent } from '$src/hooks/useLayout'
import { getSelectionRange } from '$src/utils/fileUtils'
import { CLICK_DELAY } from '../Row'

interface Props {
    data: FileViewItem
    onInlineEdit?: (event: InlineEditEvent) => void
}

export const Name = ({ data, onInlineEdit }: Props) => {
    const { icon, title, isEditing, isSelected, name } = data
    const inputRef = useRef<HTMLInputElement>()
    const clickRef: React.MutableRefObject<number> = useRef(-CLICK_DELAY)

    useEffect(() => {
        if (isEditing) {
            const { start, end } = getSelectionRange(name)
            inputRef.current.setSelectionRange(start, end)
        }
    }, [isEditing])

    const onCancelEdit = (event: React.SyntheticEvent) =>
        onInlineEdit({
            event,
            action: 'cancel',
        })

    return (
        <div className="name">
            <Icon icon={icon}></Icon>
            {!isEditing ? (
                <span
                    title={title}
                    onClick={(e: React.MouseEvent<HTMLElement>) => {
                        if (isSelected && e.timeStamp - clickRef.current > CLICK_DELAY) {
                            console.log('first click & selected: enable online')
                            e.stopPropagation()
                            onInlineEdit({
                                event,
                                action: 'start',
                            })
                        } else if (isSelected) {
                            console.log('isSelected but delay too small: double click ?')
                        }
                        clickRef.current = e.timeStamp
                    }}
                    className="file-label"
                    data-cy-filename
                >
                    {data.name}
                </span>
            ) : (
                <InputGroup
                    type="text"
                    inputRef={inputRef}
                    spellCheck={false}
                    onBlur={(event) => {
                        if (isEditing && onInlineEdit) {
                            onInlineEdit({
                                event,
                                action: 'validate',
                                data: event.currentTarget.value,
                            })
                        }
                    }}
                    onKeyDown={(event) => {
                        if (isEditing) {
                            switch (event.key) {
                                case 'Enter':
                                    event.preventDefault()
                                    onInlineEdit({
                                        event,
                                        action: 'validate',
                                        data: event.currentTarget.value,
                                    })
                                    break

                                case 'Escape':
                                    onCancelEdit(event)
                                    break
                            }
                        }
                    }}
                    defaultValue={data.name}
                    autoFocus
                    small
                />
            )}
        </div>
    )
}
