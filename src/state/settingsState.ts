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
const IS_MOJAVE = platform === 'darwin' && ((parseInt(release().split('.')[0], 10) - 4) >= 14);

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
    defaultFolder:string;

    constructor() {
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

    saveSettings() {
        localStorage.setItem('react-ftp', JSON.stringify({
            lang: this.lang,
            defaultFolder: this.defaultFolder,
            darkMode: this.darkMode
        }));
    }

    @action
    loadSettings():void {
        let settings: JSObject;
        let noData = false;

        settings = this.getParam(APP_STORAGE_KEY);

        // no settings set: first time the app is run
        if (settings === null) {
            settings = this.getDefaultSettings();
            noData = true;
        }

        this.darkMode = settings.darkMode;

        this.setActiveTheme();
        this.setLanguage(settings.lang);
        this.setDefaultFolder(settings.defaultFolder);

        if (noData) {
            this.saveSettings();
        }
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
            defaultFolder: DEFAULT_FOLDER
        }
    }

    @action
    resetSettings() {
        localStorage.removeItem(APP_STORAGE_KEY);
        this.loadSettings();
    }
}
