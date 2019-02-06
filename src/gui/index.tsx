import * as React from "react";
import * as ReactDOM from "react-dom";
import DevTools from 'mobx-react-devtools';
import * as process from 'process';
import { remote } from 'electron';
import { ReactApp } from "../components/App";
import { I18nextProvider } from 'react-i18next';
import i18next from '../locale/i18n';
import { SettingsState } from "../state/settingsState";
import { Provider } from "mobx-react";

declare var ENV: any;

class App {
    settingsState: SettingsState;

    constructor() {
        this.settingsState = new SettingsState(ENV.VERSION);
        this.createTestFolder().then(this.renderApp);
    }

    // debug stuff
    createTestFolder():Promise<any> {
        return new Promise((resolve, reject) => {
            // Development stuff: create fake directory for testing
            const exec = require('child_process').exec;
            exec('/Users/nico/tmp_ftp.sh', (err: Error) => {
                if (err) {
                    console.log('error preparing fake folders', err);
                }

                resolve();
            });
        })
    }

    renderApp = () => {
        ReactDOM.render(
            <I18nextProvider i18n={i18next}>
                <Provider settingsState={this.settingsState}>
                    <ReactApp></ReactApp>
                </Provider>
            </I18nextProvider>,
            document.getElementById('root'));
    }

    addListeners() {
        // Devlopment stuff: reload window on file change
        window.addEventListener('load', () => {
            const btn: HTMLButtonElement = document.querySelector('#reload');
            btn.addEventListener('click', () => {
                remote.getCurrentWebContents().reloadIgnoringCache();
            });
        });
    }
}

const app = new App();
