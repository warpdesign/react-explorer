import * as React from "react";
import * as ReactDOM from "react-dom";
import { Provider } from 'mobx-react';
import { FocusStyleManager } from "@blueprintjs/core";
import DevTools from 'mobx-react-devtools';

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("./css/main.css");

import { SideView } from './components/SideView';
import { AppState } from './state/appState';
import { LogUI } from './components/Log';

import { remote } from 'electron';

const appState = new AppState();

// do not show outlines when using the mouse
FocusStyleManager.onlyShowFocusOnTabs();

ReactDOM.render(
    <Provider appState={appState}>
        <React.Fragment>
            <SideView type="local" />
            <SideView type="remote" />
            <LogUI></LogUI>
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