import React from 'react'

import { Column, HeaderMouseEvent } from '$src/hooks/useViewMode'
import { TSORT_ORDER } from '$src/services/FsSort'
import { Icon } from '@blueprintjs/core'

interface HeaderProps {
    columns: Column[]
    height: number
    onClick: (event: HeaderMouseEvent) => void
}

export const SortIndicator = ({ sort }: { sort: TSORT_ORDER | 'none' }) => {
    switch (sort) {
        case 'none':
            return <Icon icon={<span />} />

        case 'asc':
            return <Icon icon="caret-up" />

        case 'desc':
            return <Icon icon="caret-down" />
    }
}

export const Header = ({ onClick, columns, height }: HeaderProps) => {
    return (
        <div
            className="tableHeader headerRow"
            style={{ height: `${height}px` }}
            onContextMenu={(e) => e.stopPropagation()}
        >
            {columns.map(({ label, key, sort }, i) => {
                return (
                    <div
                        key={key}
                        onClick={(event) => {
                            event.stopPropagation()
                            onClick({ event, data: key })
                        }}
                        style={{ fontWeight: `${sort === 'none' ? 'normal' : 'bold'}` }}
                    >
                        <span>{label}</span>
                        <SortIndicator sort={sort} />
                        {i === 0 ? <Icon icon="drag-handle-vertical"></Icon> : undefined}
                    </div>
                )
            })}
        </div>
    )
}
