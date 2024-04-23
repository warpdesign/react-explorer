import { shouldCatchEvent } from '$src/utils/dom'
import React from 'react'

export interface Options {
    alwaysCatchEvent?: boolean
}

export function useKeyDown(
    callback: (ev: KeyboardEvent) => void,
    keys: string[],
    { alwaysCatchEvent }: Options = {
        alwaysCatchEvent: false,
    },
) {
    function handleKeyDown(event: KeyboardEvent) {
        if (((keys.includes(event.key) || keys.includes('*')) && alwaysCatchEvent) || shouldCatchEvent(event)) {
            callback(event)
        }
    }

    React.useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [keys, callback])
}
