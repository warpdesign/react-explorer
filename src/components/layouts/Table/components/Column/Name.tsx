import React from 'react'
import { Icon } from '@blueprintjs/core'

import type { FileViewItem } from '$src/types'

export const Name = ({ data }: { data: FileViewItem }) => {
    const { icon, title } = data

    return (
        <div className="name">
            <Icon icon={icon}></Icon>
            <span title={title} className="file-label" spellCheck="false">
                {data.name}
            </span>
        </div>
    )
}
