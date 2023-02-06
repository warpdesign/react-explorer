import { shouldCatchEvent } from '$src/utils/dom'
import React from 'react'

// export const useKeyDown = (callback: (ev: KeyboardEvent) => void, keys: string[]) => {
//     const onKeyDown = React.useCallback(
//         (event: KeyboardEvent) => {
//             const wasAnyKeyPressed = keys.some((key) => event.key === key)
//             if (wasAnyKeyPressed && shouldCatchEvent(event)) {
//                 callback(event)
//             }
//         },
//         [callback, keys],
//     )

//     React.useEffect(() => {
//         document.addEventListener('keydown', onKeyDown)
//         return () => {
//             document.removeEventListener('keydown', onKeyDown)
//             debugger
//             console.log('removing event listener')
//         }
//     }, [onKeyDown])
// }

export function useKeyDown(callback: (ev: KeyboardEvent) => void, keys: string[]) {
    function handleKeyDown(event: KeyboardEvent) {
        if (keys.includes(event.key) && shouldCatchEvent(event)) {
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
