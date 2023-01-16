import React from 'react'

import { Column } from '$src/hooks/useLayout'

interface HeaderProps {
    columns: Column[]
    height: number
    onClick: (e: React.MouseEvent<HTMLElement>, key: 'up' | 'down' | 'none') => void
}

export const Header = ({ onClick, columns, height }: HeaderProps) => {
    return (
        <div
            className="tableHeader headerRow"
            style={{ display: 'flex', zIndex: '1', width: '100%', height: `${height}px` }}
        >
            {columns.map(({ label, key, sort }) => (
                <div key={key} onClick={(e) => onClick(e, sort)}>
                    {label}
                </div>
            ))}
        </div>
    )
}
