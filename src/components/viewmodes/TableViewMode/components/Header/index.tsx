import React from 'react'
import { IconCaretDown, IconCaretUp, IconGripVertical } from '@tabler/icons-react'

import { Column, HeaderMouseEvent } from '$src/hooks/useViewMode'
import { TSORT_ORDER } from '$src/services/FsSort'

interface HeaderProps {
    columns: Column[]
    height: number
    onClick: (event: HeaderMouseEvent) => void
}

export const SortIndicator = ({ sort }: { sort: TSORT_ORDER | 'none' }) => {
    switch (sort) {
        case 'none':
            return <div style={{ width: 16, height: 16 }} />

        case 'asc':
            return <IconCaretUp size={16} />

        case 'desc':
            return <IconCaretDown size={16} />
    }
}

export const Header = ({ onClick, columns, height }: HeaderProps) => {
    return (
        <div
            className="tableHeader headerRow"
            style={{ height: `${height}px`, display: 'flex', alignItems: 'center' }}
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
                        style={{
                            fontWeight: `${sort === 'none' ? 'normal' : 'bold'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{label}</span>
                            <SortIndicator sort={sort} />
                        </div>
                        {i === 0 ? <IconGripVertical size={16} /> : undefined}
                    </div>
                )
            })}
        </div>
    )
}
