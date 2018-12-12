import * as React from "react";
import * as ReactDOM from "react-dom";
import DevTools from 'mobx-react-devtools';
import * as process from 'process';
import { remote } from 'electron';
import { ReactApp } from "./components/App";

// declare var __PROCESS__: {
//     env: {
//         ci: string
//     }
// }

declare var ENV: any;

// Devlopment stuff: reload window on file change
window.addEventListener('load', () => {
    const btn: HTMLButtonElement = document.querySelector('#reload');
    btn.addEventListener('click', () => {
        remote.getCurrentWebContents().reloadIgnoringCache();
    });
});

console.log(ENV.CY);

// Development stuff: create fake directory for testing
const exec = require('child_process').exec;
exec('/Users/nico/tmp_ftp.sh', (err: Error) => {
    if (err) {
        console.log('error preparing fake folders', err);
        if (process.platform === "win32") {
            ReactDOM.render(<ReactApp></ReactApp>, document.getElementById('root'));
        }
    } else {
        ReactDOM.render(<ReactApp></ReactApp>, document.getElementById('root'));
    }
});