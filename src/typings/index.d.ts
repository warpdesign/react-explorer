import { AppState } from '$src/state/appState'
import { SettingsState } from '$src/state/settingsState'

export {}

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
}
