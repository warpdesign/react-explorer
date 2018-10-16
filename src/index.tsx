import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from 'mobx-react';
import DevTools from 'mobx-react-devtools';

const css = require("@blueprintjs/core/lib/css/blueprint.css");
const bcss = require("@blueprintjs/icons/lib/css/blueprint-icons.css");
const rcss = require("./css/main.css");

import { SideView } from './components/SideView';
import { AppState } from './state/appState';

import { remote } from 'electron';

const appState = new AppState();

ReactDOM.render(
    <Provider appState={appState}>
        <React.Fragment>
            <SideView type="local" />
            <SideView type="remote" />
        </React.Fragment>
    </Provider>,
    document.getElementById('root'));

// Devlopment stuff: reload window on file change
window.addEventListener('load', () => {
    const btn: HTMLButtonElement = document.querySelector('#reload');
    btn.addEventListener('click', () => {
        remote.getCurrentWebContents().reloadIgnoringCache();
    });
});

// hardcoded for now
appState.readDirectory('.', 'local');