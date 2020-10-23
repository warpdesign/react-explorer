import windowStateKeeper = require('electron-window-state');

const WIN_STATE_TPL = 'win.%s.state.json';

export interface CustomSettings {
    splitView?: boolean;
}

interface WindowSettings {
    minWidth?: number;
    minHeight?: number;
    width?: number;
    height?: number;
    custom?: CustomSettings;
    x?: number;
    y?: number;
}

interface DevToolsWindowSettings {
    defaultWidth: number;
    defaultHeight: number;
    file: string;
}

const WINDOW_DEFAULT_SETTINGS: WindowSettings = {
    minWidth: 750,
    minHeight: 240,
    width: 800,
    height: 600,
    custom: { splitView: false },
};

export const WindowSettings = {
    DEFAULTS: WINDOW_DEFAULT_SETTINGS,
    states: [] as Array<WindowSettings>,
    devtoolsState: null as DevToolsWindowSettings,
    getDevToolsSettings(): windowStateKeeper.State {
        if (!this.devtoolsState) {
            this.devtoolsState = windowStateKeeper({
                defaultWidth: WINDOW_DEFAULT_SETTINGS.width,
                defaultHeight: WINDOW_DEFAULT_SETTINGS.height,
                file: WIN_STATE_TPL.replace('%s', 'devtools'),
            });
        }

        return this.devtoolsState;
    },
    getSettings(
        id: number,
    ): windowStateKeeper.State & {
        custom?: {
            splitView?: boolean;
        };
    } {
        if (id < this.states.length) {
            return this.states[id];
        } else {
            const state = windowStateKeeper({
                defaultWidth: WINDOW_DEFAULT_SETTINGS.width,
                defaultHeight: WINDOW_DEFAULT_SETTINGS.height,
                file: WIN_STATE_TPL.replace('%s', id.toString()),
            });

            this.states[id] = state;

            return state;
        }
    },
};
