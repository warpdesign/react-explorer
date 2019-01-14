import { observable, action } from "mobx";
import { remote } from 'electron';
import * as process from 'process';
import { JSObject } from "../components/Log";
import i18next from '../locale/i18n';

export class SettingsState {
    @observable
    lang:string;

    @observable
    darkMode:boolean;

    @observable
    defaultFolder:string;

    constructor() {
        this.loadSettings();
        this.setLanguage(this.lang);
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

        this.saveSettings();
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

        debugger;

        settings = this.getParam('react-ftp');

        // no settings set: first time the app is run
        if (settings === null) {
            settings = this.getDefaultSettings();
        }

        this.lang = settings.lang;
        this.darkMode = settings.darkMode;
        this.defaultFolder = settings.defaultFolder;
    }

    getDefaultSettings() {
        return {
            lang: 'auto',
            darkMode: false,
            defaultFolder: process.platform === "win32" ? remote.app.getPath('temp') : '/tmp/react-explorer'
        }
    }
}