import React from 'react'

export const useKeyDown = (callback: (ev: KeyboardEvent) => void, keys: string[]) => {
    const onKeyDown = React.useCallback(
        (event: KeyboardEvent) => {
            const wasAnyKeyPressed = keys.some((key) => event.key === key)
            if (wasAnyKeyPressed) {
                callback(event)
            }
        },
        [callback],
    )

    React.useEffect(() => {
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onKeyDown])
}
