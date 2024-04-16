import { shouldCatchEvent } from '$src/utils/dom'
import React from 'react'

export function useKeyDown(callback: (ev: KeyboardEvent) => void, keys: string[]) {
    function handleKeyDown(event: KeyboardEvent) {
        if ((keys.includes(event.key) || keys.includes('*')) && shouldCatchEvent(event)) {
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
