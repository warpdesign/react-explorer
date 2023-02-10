import React, { ReactElement, useEffect, useRef } from 'react'
import { InputGroup, TextArea } from '@blueprintjs/core'

import { isMac } from '$src/utils/platform'
import { InlineEditEvent } from '$src/hooks/useViewMode'
import { FileViewItem } from '$src/types'
import { CLICK_DELAY } from '$src/hooks/useFileClick'
import { getSelectionRange } from '$src/utils/fileUtils'

export interface InlineRenameProps {
    item: FileViewItem
    onInlineEdit?: (event: InlineEditEvent) => void
    selectedCount: number
    onClick?: (e: React.MouseEvent<HTMLElement>) => void
}

interface Options {
    type?: 'text' | 'textarea'
}

/* eslint-disable react/display-name */
export function withInlineRename<T extends InlineRenameProps>(
    Component: (props: T) => ReactElement,
    { type = 'text' }: Options = {},
) {
    return (props: T) => {
        const inputRef = useRef<HTMLInputElement>()
        const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
        const { selectedCount, item, onInlineEdit } = props
        const { isEditing, isSelected } = item

        useEffect(() => {
            if (isEditing) {
                const { start, end } = getSelectionRange(item.name)
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

        const InputElement = type === 'text' ? InputGroup : TextArea
        const inputProps = type === 'textarea' ? { rows: 2 } : {}

        return (
            <>
                {!isEditing ? (
                    <Component
                        {...props}
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
                                            data: item,
                                        })
                                }, CLICK_DELAY)
                            } else {
                                // double-click: do nothing
                                clearTimeout(timeoutRef.current)
                                timeoutRef.current = undefined
                            }
                        }}
                    />
                ) : (
                    <InputElement
                        type={type}
                        inputRef={inputRef as any}
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
                        {...inputProps}
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
                        defaultValue={item.name}
                        autoFocus
                        small
                    />
                )}
            </>
        )
    }
}
