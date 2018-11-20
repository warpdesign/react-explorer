import * as React from "react";
import * as ReactDOM from "react-dom";
import DevTools from 'mobx-react-devtools';

import { remote } from 'electron';
import { ReactApp } from "./components/App";

// Devlopment stuff: reload window on file change
window.addEventListener('load', () => {
    const btn: HTMLButtonElement = document.querySelector('#reload');
    btn.addEventListener('click', () => {
        remote.getCurrentWebContents().reloadIgnoringCache();
    });
});

// Development stuff: create fake directory for testing
const exec = require('child_process').exec;
exec('/Users/nico/tmp_ftp.sh', (err: Error) => {
    if (err) {
        console.log('error preparing fake folders', err);
    } else {
        ReactDOM.render(<ReactApp></ReactApp>, document.getElementById('root'));
    }
});