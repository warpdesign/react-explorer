import * as React from "react";
import * as ReactDOM from "react-dom";
import DevTools from 'mobx-react-devtools';
import { ReactApp } from "../components/App";
import { I18nextProvider } from 'react-i18next';
import i18next from '../locale/i18n';
import { SettingsState } from "../state/settingsState";
import { Provider } from "mobx-react";
import { DragDropContextProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

declare var ENV: any;

class App {
    settingsState: SettingsState;

    constructor() {
        this.settingsState = new SettingsState(ENV.VERSION);
        if (ENV.NODE_ENV !== 'production') {
            this.createTestFolder()
                .then(this.renderApp);
        } else {
            this.renderApp()
        }
    }

    // debug stuff
    createTestFolder(): Promise<any> {
        return new Promise((resolve, reject) => {
            // Development stuff: create fake directory for testing
            const exec = require('child_process').exec;
            exec('/Users/leo/tmp_ftp.sh', (err: Error) => {
                if (err) {
                    console.log('error preparing fake folders', err);
                }

                resolve();
            });
        })
    }

    renderApp = () => {
        document.body.classList.add('loaded');

        ReactDOM.render(
            <DragDropContextProvider backend={HTML5Backend}>
                <I18nextProvider i18n={i18next}>
                    <Provider settingsState={this.settingsState}>
                        <ReactApp></ReactApp>
                    </Provider>
                </I18nextProvider>
            </DragDropContextProvider>,
            document.getElementById('root'));
    }
}

const app = new App();
