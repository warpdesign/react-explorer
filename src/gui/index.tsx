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
import { DragDropContextProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

declare var ENV: any;

class App {
    settingsState: SettingsState;

    constructor() {
        this.settingsState = new SettingsState(ENV.VERSION);
        this.createTestFolder().then(this.renderApp);
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

// const format = function(data: string|number) {
//     let str = data.toString();
//     if (str.length < 15) {
//         const diff = 15 - str.length;
//         for (let i = 0; i < diff; ++i) {
//             str = " " + str;
//         }
//     }
//     return str;
// }

// const {webFrame} = require('electron')
// function getMemory() {
//   // `format` omitted  (pads + limits to 15 characters for the output)
//   function logMemDetails(x:any) {
//     function toMb(bytes:any) {
//       return (bytes / (1000.0 * 1000)).toFixed(2)
//     }

//     console.log(
//       format(x[0]),
//       format(x[1].count),
//       format(toMb(x[1].size) + "MB"),
//       format(toMb(x[1].liveSize) +"MB")
//     )
//   }

//   console.log(
//     format("object"),
//     format("count"),
//     format("size"),
//     format("liveSize")
//   )
//   const resourceUsage:any = webFrame.getResourceUsage();

//   Object.keys(resourceUsage).map((key: string) => [key, resourceUsage[key]]).map(logMemDetails);
//   console.log(format('------'));
// }

// setInterval(getMemory, 5000)
