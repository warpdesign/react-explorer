import React, { useRef, useEffect } from 'react'
import { Icon } from '@blueprintjs/core'

import type { FileViewItem } from '$src/types'
import { InlineEditEvent } from '$src/hooks/useLayout'
import { selectLeftPart } from '$src/utils/dom'

interface Props {
    data: FileViewItem
    onInlineEdit?: (event: InlineEditEvent) => void
}

export const Name = ({ data, onInlineEdit }: Props) => {
    const { icon, title, isEditing, name } = data
    const spanRef = useRef<HTMLSpanElement>()

    useEffect(() => {
        // auto focus the span element when it's being edited
        if (isEditing && spanRef.current) {
            spanRef.current.focus()
            selectLeftPart(name, spanRef.current)
        }
    }, [isEditing])

    const onCancelEdit = (event: React.SyntheticEvent) => {
        spanRef.current.innerText = data.nodeData.fullname
        onInlineEdit({
            event,
            action: 'cancel',
        })
    }

    return (
        <div className="name">
            <Icon icon={icon}></Icon>
            <span
                ref={spanRef}
                title={title}
                className="file-label"
                spellCheck="false"
                suppressContentEditableWarning={true}
                contentEditable={isEditing}
                onBlur={(event) => {
                    if (isEditing && onInlineEdit) {
                        onCancelEdit(event)
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
                                    data: spanRef.current.innerText,
                                })
                                break

                            case 'Escape':
                                onCancelEdit(event)
                                break
                        }
                    }
                }}
            >
                {data.name}
            </span>
        </div>
    )
}
