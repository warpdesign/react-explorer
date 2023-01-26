import { useEffect, useRef } from 'react'

export interface Options extends AddEventListenerOptions {
    element?: Element | Document
}

export const useEventListener = (name: string, handler: EventListener, options: Options = {}) => {
    const savedHandler = useRef<EventListener>()
    const { element = document, ...listenerOptions } = options

    useEffect(() => {
        savedHandler.current = handler
    }, [handler])

    useEffect(() => {
        const listener = (e: Event) => savedHandler.current(e)

        element.addEventListener(name, listener, listenerOptions)

        return () => element.removeEventListener(name, listener)
    }, [name, options])
}
