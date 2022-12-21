import * as React from 'react'
import type { ReactElement } from 'react'

const DELAY_BEFORE_SHOWING_OVERLAY = 200

interface Props {
    active: boolean
    children: ReactElement
    id?: string
    delay?: boolean
}

export const Overlay = ({ active, children, id = 'overlay', delay = false }: Props) => {
    const ref: React.MutableRefObject<number> = React.useRef(0)
    const [ready, setReady] = React.useState(!delay)
    const activeClass = ready && active ? 'active' : ''

    React.useEffect(() => {
        if (delay && active && !ref.current) {
            ref.current = window.setTimeout(() => {
                ref.current = 0
                setReady(true)
            }, DELAY_BEFORE_SHOWING_OVERLAY)
        }
        return () => clearTimeout(ref.current)
    }, [active, id])

    React.useEffect(() => {
        if (!active && delay) {
            setReady(false)
        }
    }, [active])

    return (
        <div className={`app-loader ${activeClass}`} id={id}>
            {children}
        </div>
    )
}
