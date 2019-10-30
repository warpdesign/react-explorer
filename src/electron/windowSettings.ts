import { statements } from "@babel/template";
import { any } from "prop-types";
import { stringLiteralTypeAnnotation } from "@babel/types";

const windowStateKeeper = require('electron-window-state');
const WIN_STATE_TPL = 'win.%s.state.json';

const WINDOW_DEFAULT_SETTINGS = {
    minWidth: 750,
    width: 800,
    height: 600,
    custom: { splitView: false }
};

export const WindowSettings = {
    DEFAULTS: WINDOW_DEFAULT_SETTINGS,
    states: [] as any,
    devtoolsState: null as any,
    getDevToolsSettings() {
        if (!this.devtoolsState) {
            this.devtoolsState = windowStateKeeper({
                defaultWidth: WINDOW_DEFAULT_SETTINGS.width,
                defaultHeight: WINDOW_DEFAULT_SETTINGS.height,
                file: WIN_STATE_TPL.replace('%s', "devtools")
            });
        }

        return this.devtoolsState;
    },
    getSettings(id: number) {
        if (id < this.states.length) {
            return this.states[id];
        } else {
            const state = windowStateKeeper({
                defaultWidth: WINDOW_DEFAULT_SETTINGS.width,
                defaultHeight: WINDOW_DEFAULT_SETTINGS.height,
                file: WIN_STATE_TPL.replace('%s', id.toString())
            });

            this.states[id] = state;

            return state;
        }
    }
};