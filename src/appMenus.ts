import { Menu, BrowserWindow } from 'electron';

const ACCELERATOR_EVENT = 'menu_accelerator';

export interface LocaleString {
    [key: string]: string
};

export class AppMenu {
    win: BrowserWindow;

    constructor(win:BrowserWindow) {
        this.win = win;
    }

    sendComboEvent(combo:string, data?:any) {
        this.win.webContents.send(ACCELERATOR_EVENT, Object.assign({combo, data }));
    }

    createMenu(menuStrings: LocaleString) {
        // TODO: special case for darwin
        var menu = Menu.buildFromTemplate([
            {
                label: 'Menu',
                submenu: [
                    {
                        label: menuStrings['ABOUT'],
                        click: () => {
                            console.log('click on Menu 1: sending combo !');
                            this.sendComboEvent('CmdOrCtrl+A')
                        },
                        accelerator: 'CmdOrCtrl+A'
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['PREFS'],
                        click: () => { console.log('click on Menu 2!') }
                    }
                ],
            },
            {
                label: menuStrings['TITLE_EDIT'],
                submenu: [
                    {
                        label: 'Menu 3',
                        click: () => { console.log('click on Menu 3!') }
                    },
                    {
                        label: 'Menu 4',
                        click: () => { console.log('click on Menu 4!') }
                    }
                ],
            }
        ])

        Menu.setApplicationMenu(menu);
    }
};
