import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ExplorerApp } from '../components/App';
import { I18nextProvider } from 'react-i18next';
import { i18next } from '../locale/i18n';
import { SettingsState } from '../state/settingsState';
import { Provider } from 'mobx-react';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { ipcRenderer } from 'electron';
import { CustomSettings } from '../electron/windowSettings';
import child_process from 'child_process';
// register Fs that will be available in React-Explorer
// I guess there is a better place to do that
import { FsGeneric } from '../services/plugins/FsGeneric';
import { FsWsl } from '../services/plugins/FsWsl';
import { FsLocal } from '../services/plugins/FsLocal';
import { registerFs } from '../services/Fs';

declare const ENV: { [key: string]: string | boolean | number | Record<string, unknown> };

function initFS() {
    if ((process && process.env && process.env.NODE_ENV === 'test') || ENV.CY) {
        // console.log('**register generic', FsGeneric);
        registerFs(FsGeneric);
    } else {
        registerFs(FsWsl);
        registerFs(FsLocal);
    }
}

class App {
    settingsState: SettingsState;

    constructor() {
        this.settingsState = new SettingsState(ENV.VERSION as string);
        this.init();
    }

    // debug stuff
    createTestFolder(): Promise<void> {
        return new Promise((resolve) => {
            // Development stuff: create fake directory for testing
            // const exec = require('child_process').exec;
            const exec = child_process.exec;
            exec('/Users/leo/tmp_ftp.sh', (err: Error) => {
                if (err) {
                    console.log('error preparing fake folders', err);
                }

                resolve();
            });
        });
    }

    getInitialSettings(): Promise<CustomSettings> {
        return ipcRenderer.invoke('window:getInitialSettings');
    }

    init = async (): Promise<void> => {
        if (ENV.NODE_ENV !== 'production') {
            await this.createTestFolder();
        }
        initFS();
        this.renderApp();
    };

    renderApp = async (): Promise<void> => {
        const initialSettings = await this.getInitialSettings();
        console.log('initialSettings', initialSettings);
        document.body.classList.add('loaded');

        ReactDOM.render(
            <DndProvider backend={HTML5Backend}>
                <I18nextProvider i18n={i18next}>
                    <Provider settingsState={this.settingsState}>
                        <ExplorerApp initialSettings={initialSettings}></ExplorerApp>
                    </Provider>
                </I18nextProvider>
            </DndProvider>,
            document.getElementById('root'),
        );
    };
}

new App();
