import React from 'react'
import { Icon } from '@blueprintjs/core'

import type { FileViewItem } from '$src/types'
import { InlineEditEvent } from '$src/hooks/useViewMode'
import { InlineRenameProps, withInlineRename } from '$src/components/hoc/WithInlineRename'

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
    selectedCount: number
}

export const Name = ({ data, onInlineEdit, selectedCount }: Props) => {
    const { icon } = data

    return (
        <div className="name">
            <Icon icon={icon}></Icon>
            <Text onInlineEdit={onInlineEdit} item={data} selectedCount={selectedCount}></Text>
        </div>
    )
}
