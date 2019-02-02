import { observable, action } from "mobx";
import { remote } from 'electron';
import { release } from 'os';
import { platform } from 'process';
import { JSObject } from "../components/Log";
import i18next from '../locale/i18n';

declare var ENV: any;

const { systemPreferences } = remote;

const APP_STORAGE_KEY = 'react-ftp';
const DEFAULT_FOLDER = ENV.NODE_ENV === 'production' ? remote.app.getPath('home') : (platform === "win32" ? remote.app.getPath('temp') : '/tmp/react-explorer');
const IS_MAC = platform === 'darwin';
const IS_MOJAVE = IS_MAC && ((parseInt(release().split('.')[0], 10) - 4) >= 14);
const IS_WIN = platform === 'win32';

const TERMINAL_CMD = {
    'darwin': 'open -a "%cmd" "%path"',
    'win': 'start /D "%path" "%cd%" "%cmd"',
    'linux': 'cd "%path" && "%cmd"'
};
const DEFAULT_TERMINAL = {
    'darwin': 'Terminal.app',
    'win': 'C:\\Windows\\System32\\cmd.exe',
    'linux': 'xterm'
};

export class SettingsState {
    @observable
    lang:string;

    @observable
    // this is the asked mode
    darkMode:boolean | 'auto';

    // this is the current active mode
    @observable
    isDarkModeActive: boolean;

    @observable
    defaultFolder: string;

    @observable
    defaultTerminal: string;

    terminalTemplate: string;

    version: string;

    constructor(version: string) {
        this.version = version;

        this.installListeners();
        this.loadSettings();
    }

    installListeners() {
        if (IS_MOJAVE) {
            systemPreferences.subscribeNotification(
                'AppleInterfaceThemeChangedNotification',
                () => this.setActiveTheme()
            );
        }
    }

    getParam(name: string):JSObject {
        return JSON.parse(localStorage.getItem(name));
    }

    @action
    setLanguage(askedLang: string) {
        let lang = askedLang;

        // detect language from host OS if set to auto
        if (lang === 'auto') {
            lang = remote.app.getLocale();
        }

        // check we support this language
        if (i18next.languages.indexOf(lang) < -1) {
            lang = 'en';
        }

        // finally set requested language
        i18next.changeLanguage(lang);

        console.log('setting language to', lang);

        this.lang = askedLang;
    }

    @action
    setDefaultTerminal(cmd: string) {
        this.defaultTerminal = cmd;
        let template = TERMINAL_CMD.linux;

        if (IS_WIN) {
            template = TERMINAL_CMD.win;
        } else if (IS_MAC) {
            template = TERMINAL_CMD.darwin
        }

        this.terminalTemplate = template.replace('%cmd', cmd.replace(/"/g, '\\"'));
    }

    getTerminalCommand(path: string) {
        return this.terminalTemplate.replace('%path', path.replace(/"/g, '\\"'));
    }

    saveSettings() {
        localStorage.setItem('react-ftp', JSON.stringify({
            lang: this.lang,
            defaultFolder: this.defaultFolder,
            darkMode: this.darkMode,
            defaultTerminal: this.defaultTerminal,
            version: this.version
        }));
    }

    @action
    loadAndUpgradeSettings(): JSObject {
        let settings = this.getParam(APP_STORAGE_KEY);
        // no settings set: first time the app is run
        if (settings === null) {
            settings = this.getDefaultSettings();
        } else if (!settings.version || settings.version < this.version) {
            // get default settings
            const defaultSettings = this.getDefaultSettings();
            // override default settings with current settings
            settings = Object.assign(defaultSettings, settings);
        }

        return settings;
    }

    @action
    loadSettings():void {
        let settings: JSObject;

        settings = this.loadAndUpgradeSettings();

        this.darkMode = settings.darkMode;

        this.setActiveTheme();
        this.setLanguage(settings.lang);
        this.setDefaultFolder(settings.defaultFolder);
        this.setDefaultTerminal(settings.defaultTerminal);

        // we should only save settings in case it's the first time the app is run
        // or an upgrade was needed
        this.saveSettings();
    }

    @action
    setDefaultFolder(folder: string) {
        this.defaultFolder = folder;
    }

    @action
    setActiveTheme = (darkMode = this.darkMode) => {
        if (darkMode !== this.darkMode) {
            this.darkMode = darkMode;
        }

        if (this.darkMode === 'auto') {
            this.isDarkModeActive = IS_MOJAVE ? systemPreferences.isDarkMode() : false;
        } else {
            this.isDarkModeActive = this.darkMode;
        }
    }

    getDefaultSettings() {
        return {
            lang: 'auto',
            darkMode: IS_MOJAVE ? 'auto' : false,
            defaultFolder: DEFAULT_FOLDER,
            defaultTerminal: IS_MAC ? DEFAULT_TERMINAL.darwin : IS_WIN && DEFAULT_TERMINAL.win || DEFAULT_TERMINAL.linux,
            version: this.version
        }
    }

    @action
    resetSettings() {
        localStorage.removeItem(APP_STORAGE_KEY);
        this.loadSettings();
    }
}
