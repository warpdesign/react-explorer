import { app, ipcMain, BrowserWindow, MenuItemConstructorOptions, Menu, nativeTheme } from 'electron';
import { IpcMainEvent } from 'electron/main';
import { WindowSettings } from './windowSettings';
import * as OS from './osSupport';

type Primitive = number | string | boolean;

interface HandlerList {
    [key: string]: (
        event: IpcMainEvent,
        ...args: any
    ) => Promise<unknown> | void | Primitive | Record<string, Primitive | Record<string, Primitive>>;
}

interface Handlers {
    [key: string]: HandlerList;
}

const getWindowFromId = (id: number) => BrowserWindow.getAllWindows().find((win) => win.webContents.id === id);

// don't use deprecated remote module: instead, handle
// events from renderer
const handlers: Handlers = {
    window: {
        setProgressBar(event, progress: number) {
            const window = getWindowFromId(event.sender.id);
            console.log(!!window);
            window && window.setProgressBar(progress);
        },
        getId(event) {
            return event.sender.id;
        },
        getInitialSettings(event) {
            console.log(WindowSettings.getSettings(event.sender.id).custom);
            return WindowSettings.getSettings(event.sender.id).custom;
        },
    },
    app: {
        getLocale() {
            return app.getLocale();
        },
    },
    nativeTheme: {
        shouldUseDarkColors() {
            return nativeTheme.shouldUseDarkColors;
        },
    },
    Menu: {
        buildFromTemplate(event, template: MenuItemConstructorOptions[]) {
            template.forEach((menu) => {
                if (menu.id) {
                    menu.click = (e) => {
                        const [id, args] = e.id.split('///');
                        event.sender.send('context-menu-tab-list:click', id, args);
                    };
                }
            });
            const menu = Menu.buildFromTemplate(template);
            menu.popup({
                window: getWindowFromId(event.sender.id),
            });
        },
    },
};

const syncHandlers: Handlers = {
    app: {
        getOS(event) {
            event.returnValue = OS;
        },
    },
};

export const Remote = {
    init() {
        return new Promise<void>((resolve) => {
            Object.keys(handlers).forEach((domain) => {
                Object.keys(handlers[domain]).forEach((fnName) => {
                    ipcMain.handle(`${domain}:${fnName}`, handlers[domain][fnName]);
                });
            });

            Object.keys(syncHandlers).forEach((domain) => {
                Object.keys(syncHandlers[domain]).forEach((fnName) => {
                    ipcMain.on(`${domain}:${fnName}`, syncHandlers[domain][fnName]);
                });
            });

            resolve();
        });
    },
};
