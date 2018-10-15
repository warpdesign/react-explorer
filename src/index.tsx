import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

const css = require("@blueprintjs/core/lib/css/blueprint.css");
const bcss = require("@blueprintjs/icons/lib/css/blueprint-icons.css");
const rcss = require("./css/main.css");

import { Button } from "@blueprintjs/core";

import { SideView } from './components/SideView';
import { AppState } from './state/appState';

import { spawn } from 'child_process';
import { BADSTR } from "dns";

import { remote } from 'electron';
import { Fs } from "./services/Fs";

/*
class AppState {
    @observable timer = 0;

    constructor() {
        setInterval(() => {
            this.timer += 1;
        }, 1000);
    }

    resetTimer() {
        this.timer = 0;
    }
}

@observer
class TimerView extends React.Component<{ appState: AppState }, {}> {
    render() {
        return (
            <div>
                <button onClick={this.onReset}>
                    Seconds passed: {this.props.appState.timer}
                </button>
                <DevTools />
            </div>
        );
    }

    onReset = () => {
        this.props.appState.resetTimer();
        Fs.readDirectory('.').then((files) => console.log('yeah, got files', files));
    }
};
*/
const appState = new AppState();

ReactDOM.render(
    <Provider appState={appState}>
        <React.Fragment>
                <SideView type="local" />
                <SideView type="remote" />
                <button id="dtc" onClick={appState.test.bind(appState)}>Path Change</button>
        </React.Fragment>
    </Provider>,
    document.getElementById('root'));

// const button = React.createElement(Button, {
//     icon: "cloud",
//     text: "CDN Blueprint is go!",
// });

window.addEventListener('load', () => {
    const btn: HTMLButtonElement = document.querySelector('#reload');
    btn.addEventListener('click', () => {
        remote.getCurrentWebContents().reloadIgnoringCache();
    });
});

// Fs.readDirectory('.').then((files) => {
//     appState.setFiles(false, files);
//     console.log('yeah, got files', files);
// });
appState.readDirectory('.', 'local');
console.log('yep!');

// ReactDOM.render(<FileList/>, document.querySelector("#btn"));


// import { Hello } from "./components/Hello";

// ReactDOM.render(
//     <Hello compiler="TypeScript" framework="React" />,
//     document.getElementById("root")
// );