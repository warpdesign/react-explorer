import { KeyboardLayoutMap } from '$src/types'
import { ipcRenderer } from 'electron'

export const ACCELERATOR_EVENT = 'menu_accelerator'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendFakeCombo(combo: string, data?: any): Promise<void> {
    const id = await ipcRenderer.invoke('window:getId')
    ipcRenderer.sendTo(id, ACCELERATOR_EVENT, Object.assign({ combo: combo, data }))
}

export async function getKeyboardLayoutMap() {
    const map = await navigator.keyboard.getLayoutMap()
    return Array.from(map.entries()).reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
    }, {} as KeyboardLayoutMap)
}
