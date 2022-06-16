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
            console.log('window:setProgressBar', progress);
            const window = getWindowFromId(event.sender.id);
            console.log(!!window);
            window && window.setProgressBar(progress);
        },
        getId(event) {
            console.log('window:getId');
            return event.sender.id;
        },
        getInitialSettings(event) {
            console.log(WindowSettings.getSettings(event.sender.id).custom);
            return WindowSettings.getSettings(event.sender.id).custom;
        },
    },
    app: {
        // getPath(event, name: 'home' | 'appData' | 'userData' | 'cache' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'pepperFlashSystemPlugin' | 'crashDumps') {
        //     console.log('app:getPath');
        //     return app.getPath(name);
        // },
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
            console.log('Menu:buildFromTemplate', template);
            template.forEach((menu) => {
                if (menu.id) {
                    menu.click = (e) => {
                        const [id, args] = e.id.split('///');
                        console.log('sending', id, args);
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
            console.log('app:getOS');
            event.returnValue = OS;
        },
    },
};

export const Remote = {
    init() {
        return new Promise<void>((resolve) => {
            Object.keys(handlers).forEach((domain) => {
                Object.keys(handlers[domain]).forEach((fnName) => {
                    console.log('registring', `${domain}:${fnName}`);
                    ipcMain.handle(`${domain}:${fnName}`, handlers[domain][fnName]);
                });
            });

            Object.keys(syncHandlers).forEach((domain) => {
                Object.keys(syncHandlers[domain]).forEach((fnName) => {
                    console.log('registring', `${domain}:${fnName}`);
                    ipcMain.on(`${domain}:${fnName}`, syncHandlers[domain][fnName]);
                });
            });

            resolve();
        });
    },
};
