import * as React from "react";
import * as ReactDOM from "react-dom";
import DevTools from 'mobx-react-devtools';

import { remote } from 'electron';
import { ReactApp } from "./components/App";

ReactDOM.render(<ReactApp></ReactApp>, document.getElementById('root'));

// Devlopment stuff: reload window on file change
window.addEventListener('load', () => {
    const btn: HTMLButtonElement = document.querySelector('#reload');
    btn.addEventListener('click', () => {
        remote.getCurrentWebContents().reloadIgnoringCache();
    });
});