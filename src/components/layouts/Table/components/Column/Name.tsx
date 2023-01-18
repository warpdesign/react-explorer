import React, { useRef, useEffect } from 'react'
import { Icon, InputGroup } from '@blueprintjs/core'

import type { FileViewItem } from '$src/types'
import { InlineEditEvent } from '$src/hooks/useLayout'
import { getSelectionRange } from '$src/utils/fileUtils'

interface Props {
    data: FileViewItem
    onInlineEdit?: (event: InlineEditEvent) => void
}

export const Name = ({ data, onInlineEdit }: Props) => {
    const { icon, title, isEditing, name } = data
    const inputRef = useRef<HTMLInputElement>()

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
                <span title={title} className="file-label">
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
