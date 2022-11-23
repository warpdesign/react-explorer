import * as React from 'react'
import type { ReactElement } from 'react'

interface Props {
    active: boolean
    children: ReactElement
}

export const Overlay = ({ active, children }: Props) => {
    const activeClass = (active && 'active') || ''

    return <div className={`app-loader ${activeClass}`}>{children}</div>
}
