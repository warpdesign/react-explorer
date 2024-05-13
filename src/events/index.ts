import { KeyboardLayoutMap, ReactiveProperties } from '$src/types'
import { ipcRenderer } from 'electron'

export const triggerUpdateMenus = async (strings: Record<string, string>, props: ReactiveProperties) => {
    ipcRenderer.invoke('updateMenus', strings, props)
}
