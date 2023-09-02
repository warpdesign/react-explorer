import { observable, action, makeObservable, runInAction } from 'mobx'
import { ipcRenderer } from 'electron'

import { CustomSettings } from '$src/electron/windowSettings'
import { i18n, languageList } from '$src/locale/i18n'
import { isMojave, isWin, isMac, defaultFolder } from '$src/utils/platform'
import { ViewModeName } from '$src/hooks/useViewMode'

const APP_STORAGE_KEY = 'react-explorer'

const TERMINAL_CMD = {
    darwin: 'open -a "%cmd" "%path"',
    win: 'start /D "%path" "%cd%" "%cmd"',
    linux: 'cd "%path" && "%cmd"',
}
const DEFAULT_TERMINAL = {
    darwin: 'Terminal.app',
    win: 'C:\\Windows\\System32\\cmd.exe',
    linux: 'xterm',
}

export class SettingsState {
    lang: string

    // this is the asked mode
    darkMode: boolean | 'auto'

    defaultViewMode: ViewModeName

    // this is the current active mode
    isDarkModeActive: boolean

    defaultFolder: string

    defaultTerminal: string

    terminalTemplate: string

    version: string

    constructor(version: string) {
        makeObservable(this, {
            lang: observable,
            darkMode: observable,
            isDarkModeActive: observable,
            defaultFolder: observable,
            defaultTerminal: observable,
            defaultViewMode: observable,
            setLanguage: action,
            setDefaultTerminal: action,
            loadAndUpgradeSettings: action,
            loadSettings: action,
            setDefaultFolder: action,
            setActiveTheme: action,
            setDefaultViewMode: action,
            resetSettings: action,
        })

        this.version = version

        this.installListeners()
        this.loadSettings()
    }

    installListeners(): void {
        ipcRenderer.on('nativeTheme:updated', (event, shouldUseDarkColors) => {
            this.setActiveTheme()
        })
    }

    getWindowSettings(): Promise<CustomSettings> {
        return ipcRenderer.invoke('window:getCustomSettings')
    }

    getParam(name: string) {
        return JSON.parse(localStorage.getItem(name))
    }

    async setLanguage(askedLang: string): Promise<void> {
        let lang = askedLang
        const { i18next } = i18n

        // detect language from host OS if set to auto
        if (lang === 'auto') {
            lang = await ipcRenderer.invoke('app:getLocale')
            console.log('detectedLanguage', lang)
        }

        // fallback to English if preferred language
        // isn't available
        if (languageList.indexOf(lang) < 0) {
            lang = 'en'
        }

        // finally set requested language
        i18next.changeLanguage(lang)

        runInAction(() => (this.lang = i18next.language))
    }

    setDefaultTerminal(cmd: string): void {
        this.defaultTerminal = cmd
        let template = TERMINAL_CMD.linux

        if (isWin) {
            template = TERMINAL_CMD.win
        } else if (isMac) {
            template = TERMINAL_CMD.darwin
        }

        this.terminalTemplate = template.replace('%cmd', cmd.replace(/"/g, '\\"'))
    }

    getTerminalCommand(path: string): string {
        return this.terminalTemplate.replace('%path', path.replace(/"/g, '\\"'))
    }

    saveSettings(): void {
        localStorage.setItem(
            APP_STORAGE_KEY,
            JSON.stringify({
                lang: this.lang,
                defaultFolder: this.defaultFolder,
                darkMode: this.darkMode,
                defaultTerminal: this.defaultTerminal,
                defaultViewMode: this.defaultViewMode,
                version: this.version,
            }),
        )
    }

    loadAndUpgradeSettings() {
        let settings = this.getParam(APP_STORAGE_KEY)
        // no settings set: first time the app is run
        if (settings === null) {
            settings = this.getDefaultSettings()
        } else if (!settings.version || settings.version < this.version) {
            // get default settings
            const defaultSettings = this.getDefaultSettings()
            // override default settings with current settings
            settings = Object.assign(defaultSettings, settings)
        }

        return settings
    }

    loadSettings(): void {
        const settings = this.loadAndUpgradeSettings()

        this.darkMode = settings.darkMode

        this.setActiveTheme()
        this.setLanguage(settings.lang)
        this.setDefaultFolder(settings.defaultFolder)
        this.setDefaultTerminal(settings.defaultTerminal)
        this.defaultViewMode = settings.defaultViewMode

        // we should only save settings in case it's the first time the app is run
        // or an upgrade was needed
        this.saveSettings()
    }

    setDefaultFolder(folder: string): void {
        this.defaultFolder = folder
    }

    setDefaultViewMode(viewmode: ViewModeName): void {
        this.defaultViewMode = viewmode
    }

    setActiveTheme = async (darkMode = this.darkMode): Promise<void> => {
        if (darkMode !== this.darkMode) {
            this.darkMode = darkMode
        }

        if (this.darkMode === 'auto') {
            // CHECKME!
            // this.isDarkModeActive = isMojave && systemPreferences ? systemPreferences.isDarkMode() : false;
            const mode = await ipcRenderer.invoke('nativeTheme:shouldUseDarkColors')
            runInAction(() => {
                this.isDarkModeActive = mode
            })
        } else {
            runInAction(() => {
                this.isDarkModeActive = this.darkMode as boolean
            })
        }
    }

    getDefaultSettings() {
        return {
            // we don't want to wait for async call to retrieve language
            // from jest, so we set default lang to en instead.
            // This allows to inject SettingsState in the app without
            // having to wait for a promise to resolve.
            lang: typeof jest === 'undefined' ? 'auto' : 'en',
            darkMode: isMojave ? 'auto' : false,
            defaultFolder: defaultFolder,
            defaultTerminal: isMac
                ? DEFAULT_TERMINAL.darwin
                : (isWin && DEFAULT_TERMINAL.win) || DEFAULT_TERMINAL.linux,
            version: this.version,
            // 'details' | 'icons'
            defaultViewMode: 'tiles',
        }
    }

    resetSettings(): void {
        localStorage.removeItem(APP_STORAGE_KEY)
        this.loadSettings()
    }
}
