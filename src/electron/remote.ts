import { app, ipcMain, BrowserWindow, MenuItemConstructorOptions, Menu, nativeTheme } from 'electron';
import { IpcMainEvent } from 'electron/main';

interface HandlerList {
    [key: string]: (event: IpcMainEvent, ...args: any) => Promise<unknown> | void | number | boolean;
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
    },
    app: {
        getPath() {
            console.log('app:getPath');
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

export const Remote = {
    done: false,
    init() {
        if (this.done) {
            return;
        }

        Object.keys(handlers).forEach((domain) => {
            Object.keys(handlers[domain]).forEach((fnName) => {
                console.log('registring', `${domain}:${fnName}`);
                ipcMain.handle(`${domain}:${fnName}`, handlers[domain][fnName]);
            });
        });
        this.done = true;
    },
};
