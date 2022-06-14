import { app, ipcMain, BrowserWindow, MenuItemConstructorOptions, Menu } from 'electron';
import { IpcMainEvent } from 'electron/main';

interface HandlerList {
    [key: string]: (event: IpcMainEvent, ...args: any) => Promise<unknown> | void;
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
        getId() {
            console.log('window:getId');
        },
    },
    nativeTheme: {
        on() {
            console.log('nativeTheme:on');
        },
    },
    app: {
        getPath() {
            console.log('app:getPath');
        },
    },
    Menu: {
        buildFromTemplate(event, template: MenuItemConstructorOptions[]) {
            console.log('Menu:buildFromTemplate', template);
            template.forEach((menu) => {
                if (menu.id) {
                    menu.click = (e) => event.sender.send('context-menu-tab-list:click', e.id);
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
