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
import { LogUI, Logger } from './components/Log';

import { remote } from 'electron';
import { DirectoryType } from "./services/Fs";

const appState = new AppState();

// do not show outlines when using the mouse
FocusStyleManager.onlyShowFocusOnTabs();

Logger.warn('Hi from React FTP!');
Logger.error('Hi from React FTP!\n :)');

ReactDOM.render(
    <Provider appState={appState}>
        <React.Fragment>
            <SideView type={DirectoryType.LOCAL} />
            <SideView type={DirectoryType.REMOTE} />
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