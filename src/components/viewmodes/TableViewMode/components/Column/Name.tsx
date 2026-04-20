import React from 'react'

import { InlineRenameProps, withInlineRename } from '$src/components/hoc/WithInlineRename'
import { InlineEditEvent } from '$src/hooks/useViewMode'
import type { FileViewItem } from '$src/types'

interface TextProps extends InlineRenameProps {
    item: FileViewItem
}

const Text = withInlineRename(({ item, onClick }: TextProps) => {
    const { name, title } = item

    return (
        <span title={title} className="file-label" data-cy-filename onClick={onClick}>
            {name}
        </span>
    )
})

interface Props {
    data: FileViewItem
    onInlineEdit?: (event: InlineEditEvent) => void
    disabledInlineEdit: boolean
}

export const Name = ({ data, onInlineEdit, disabledInlineEdit }: Props) => {
    const IconComponent = data.icon

    return (
        <div className="name">
            <IconComponent size={20} style={{ marginRight: '8px' }} />
            <Text onInlineEdit={onInlineEdit} item={data} disabledInlineEdit={disabledInlineEdit}></Text>
        </div>
    )
}
