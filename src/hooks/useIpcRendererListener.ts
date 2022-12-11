import * as React from 'react'
import { ipcRenderer } from 'electron'

import type { IpcRendererEventHandler } from '$src/types'

const useIpcRendererListener = (event: string, handler: IpcRendererEventHandler) => {
    const savedHandler = React.useRef<IpcRendererEventHandler>()

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
