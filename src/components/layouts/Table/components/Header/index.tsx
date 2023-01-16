import React from 'react'

import { Column } from '$src/hooks/useLayout'
import { TSORT_ORDER } from '$src/services/FsSort'
import { Icon } from '@blueprintjs/core'

interface HeaderProps {
    columns: Column[]
    height: number
    onClick: (e: React.MouseEvent<HTMLElement>, key: TSORT_ORDER | 'none') => void
}

export const SortIndicator = ({ sort }: { sort: TSORT_ORDER | 'none' }) => {
    console.log({ sort })
    switch (sort) {
        case 'none':
            return <span />

        case 'asc':
            return <span>^</span>

        case 'desc':
            return <span style={{ transform: 'rotateX(180deg)' }}>^</span>
    }
}

export const Header = ({ onClick, columns, height }: HeaderProps) => {
    return (
        <div className="tableHeader headerRow" style={{ height: `${height}px` }}>
            {columns.map(({ label, key, sort }, i) => {
                return (
                    <div key={key} onClick={(e) => onClick(e, sort)}>
                        <span>{label}</span>
                        <SortIndicator sort={sort} />
                        {i === 0 ? <Icon icon="drag-handle-vertical"></Icon> : undefined}
                    </div>
                )
            })}
        </div>
    )
}
