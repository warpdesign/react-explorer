import * as React from "react";
import * as ReactDOM from "react-dom";
import DevTools from 'mobx-react-devtools';
import * as process from 'process';
import { remote } from 'electron';
import { ReactApp } from "./components/App";
import { I18nextProvider } from 'react-i18next';
import i18next from './locale/i18n';

// Development stuff: create fake directory for testing
const exec = require('child_process').exec;
exec('/Users/nico/tmp_ftp.sh', (err: Error) => {
    if (err) {
        console.log('error preparing fake folders', err);
    }

    ReactDOM.render(
        <I18nextProvider i18n={i18next}><ReactApp></ReactApp></I18nextProvider>,
        document.getElementById('root'));    
});

// Devlopment stuff: reload window on file change
window.addEventListener('load', () => {
    const btn: HTMLButtonElement = document.querySelector('#reload');
    btn.addEventListener('click', () => {
        remote.getCurrentWebContents().reloadIgnoringCache();
    });
});