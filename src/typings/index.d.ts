import { AppState } from '$src/state/appState'
import { SettingsState } from '$src/state/settingsState'

export {}

interface KeyboardIterator extends Iterator<[string, string]> {
    length: number
    [key: number]: [string, string]
}

interface KeyboardMap {
    entries: () => KeyboardIterator
}

declare global {
    interface Window {
        // debug
        appState: AppState
        settingsState: SettingsState
        renderer: Electron.IpcRenderer
        // /debug
        ENV: {
            CY: boolean
            VERSION: string
            HASH: string
            NODE_ENV: 'production' | 'development'
            BUILD_DATE: string
        }
    }

    interface Navigator {
        keyboard: {
            getLayoutMap: () => Promise<KeyboardMap>
        }
    }
}
