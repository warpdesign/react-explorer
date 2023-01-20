import * as React from 'react'
import { ipcRenderer } from 'electron'

import type { IpcRendererEventHandler } from '$src/types'

const useIpcRendererListener = <C>(event: string, handler: IpcRendererEventHandler<C>) => {
    const savedHandler = React.useRef<IpcRendererEventHandler<C>>(handler)

    React.useEffect(() => {
        savedHandler.current = handler
    }, [handler])

    React.useEffect(() => {
        ipcRenderer.on(event, (event, command, param) => savedHandler.current(event, command, param))

        return () => {
            ipcRenderer.removeListener(event, savedHandler.current)
        }
    }, [event])
}

export default useIpcRendererListener
