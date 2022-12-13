import * as React from 'react'
import type { ReactElement } from 'react'

interface Props {
    active: boolean
    children: ReactElement
    id?: string
}

export const Overlay = ({ active, children, id = 'overlay' }: Props) => {
    const activeClass = (active && 'active') || ''

    return (
        <div className={`app-loader ${activeClass}`} id={id}>
            {children}
        </div>
    )
}
