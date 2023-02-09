import React, { useRef, useEffect } from 'react'
import { Icon, InputGroup } from '@blueprintjs/core'

import type { FileViewItem } from '$src/types'
import { InlineEditEvent } from '$src/hooks/useLayout'
import { getSelectionRange } from '$src/utils/fileUtils'
import { isMac } from '$src/utils/platform'
import { CLICK_DELAY } from '$src/hooks/useFileClick'

interface Props {
    data: FileViewItem
    onInlineEdit?: (event: InlineEditEvent) => void
    selectedCount: number
}

export const Name = ({ data, onInlineEdit, selectedCount }: Props) => {
    const { icon, title, isEditing, isSelected, name } = data
    const inputRef = useRef<HTMLInputElement>()
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

    useEffect(() => {
        if (isEditing) {
            const { start, end } = getSelectionRange(name)
            inputRef.current.setSelectionRange(start, end)
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
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
                        if (
                            !timeoutRef.current &&
                            selectedCount < 2 &&
                            !e.shiftKey &&
                            !(isMac ? e.metaKey : e.ctrlKey)
                        ) {
                            e.persist()
                            timeoutRef.current = setTimeout(() => {
                                timeoutRef.current = undefined
                                // Only enable inline edit if row was selected when the click happened:
                                // this prevents enabling inline edit when the user clicked on a non-selected row
                                isSelected &&
                                    onInlineEdit({
                                        event: e,
                                        action: 'start',
                                        data,
                                    })
                            }, CLICK_DELAY)
                        } else {
                            // double-click: do nothing
                            clearTimeout(timeoutRef.current)
                            timeoutRef.current = undefined
                        }
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
