import * as React from 'react'

export const DELAY_BEFORE_SHOWING_OVERLAY = 200

interface Props {
    shouldShow: boolean
    children: JSX.Element
    id?: string
    delay?: boolean
}

export const Overlay = ({ shouldShow, children, id = 'overlay', delay = false }: Props) => {
    const ref: React.MutableRefObject<number> = React.useRef(0)
    const [ready, setReady] = React.useState(!delay)
    const active = shouldShow && ready && !ref.current
    const activeClass = active ? 'active' : ''

    React.useEffect(() => {
        if (shouldShow && !ready) {
            ref.current = window.setTimeout(() => {
                ref.current = 0
                setReady(true)
            }, DELAY_BEFORE_SHOWING_OVERLAY)
        } else {
            if (ref.current) {
                clearTimeout(ref.current)
                ref.current = 0
            }

            if (delay) {
                setReady(false)
            }
        }

        return () => {
            ref.current && clearTimeout(ref.current)
        }
    }, [shouldShow])

    return (
        <div className={`app-loader ${activeClass}`} id={id}>
            {children}
        </div>
    )
}
