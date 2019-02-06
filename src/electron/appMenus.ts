import * as process from 'process';
import { Menu, BrowserWindow, MenuItemConstructorOptions, MenuItem, app } from 'electron';
import { isMac } from '../utils/platform';

const ACCELERATOR_EVENT = 'menu_accelerator';

export interface LocaleString {
    [key: string]: string
};

export class AppMenu {
    win: BrowserWindow;

    constructor(win:BrowserWindow) {
        this.win = win;
    }

    sendComboEvent = (menuItem: MenuItem & { accelerator: string }, data?: any) => {
        console.log('sending', menuItem.label, menuItem.accelerator);
        this.win.webContents.send(ACCELERATOR_EVENT, Object.assign({combo: menuItem.accelerator, data }));
    }

    sendSelectAll = () => {
        const activeWindow = BrowserWindow.getFocusedWindow();
        if (activeWindow) {
            // do not send select all combo if devtools window is opened
            console.log('activeWindow', activeWindow.id, this.win === activeWindow);
            const webContents = activeWindow.webContents;
            // !webContents.getURL().match(/^chrome-devtools:/)
            if (activeWindow === this.win && !webContents.isDevToolsFocused()) {
                console.log('NOT DevTools');
                this.sendComboEvent({
                    accelerator: 'CmdOrCtrl+A',
                    label: 'selectAll'
                } as MenuItem & { accelerator: string });
            }

            webContents.selectAll();
        }
    }

    getMenuTemplate(menuStrings: LocaleString):MenuItemConstructorOptions[] {
        const template = [
            {
                label: menuStrings['TITLE_FILE'],
                submenu: [
                    // {
                    //     label: menuStrings['ABOUT'],
                    //     click: () => {
                    //         console.log('click on Menu 1: sending combo !');
                    //         // this.sendComboEvent('CmdOrCtrl+A')
                    //     },
                    //     accelerator: 'CmdOrCtrl+A',
                    //     role: 'about'
                    // },
                    { type: 'separator' },
                    {
                        label: menuStrings['MAKEDIR'],
                        accelerator: 'CmdOrCtrl+N',
                        click: this.sendComboEvent
                    },
                    {
                        label: menuStrings['RENAME'],
                        click: this.sendComboEvent
                    },
                    {
                        label: menuStrings['DELETE'],
                        accelerator: 'CmdOrCtrl+D',
                        click: this.sendComboEvent
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['OPEN_TERMINAL'],
                        accelerator: 'CmdOrCtrl+K',
                        click: this.sendComboEvent
                    }
                ],
            },
            {
                label: menuStrings['TITLE_EDIT'],
                submenu: [
                    {
                        label: menuStrings['CUT'],
                        role: 'cut'
                    },
                    {
                        label: menuStrings['COPY'],
                        role: 'copy'
                    },
                    {
                        label: menuStrings['COPY_PATH'],
                        accelerator: 'CmdOrCtrl+Shift+C',
                        click: this.sendComboEvent
                    },
                    {
                        label: menuStrings['COPY_FILENAMES'],
                        accelerator: 'CmdOrCtrl+Shift+N',
                        click: this.sendComboEvent
                    },
                    {
                        label: menuStrings['PASTE'],
                        role: 'paste',
                    },
                    {
                        label: menuStrings['SELECT_ALL'],
                        accelerator: 'CmdOrCtrl+A',
                        click: this.sendSelectAll
                    }
                ],
            },
            {
                label: menuStrings['TITLE_VIEW'],
                submenu: [
                    {
                        label: menuStrings['RELOAD_VIEW'],
                        accelerator: 'CmdOrCtrl+R',
                        click: this.sendComboEvent
                    },
                    {
                        label: menuStrings['FORCE_RELOAD_APP'],
                        accelerator: 'CmdOrCtrl+Shift+R',
                        click: this.sendComboEvent
                    }
                ],
            },
            {
                label: menuStrings['TITLE_HELP'],
                submenu: [
                    {
                        label: menuStrings['KEYBOARD_SHORTCUTS'],
                        click: this.sendComboEvent
                    }
                ]
            }
        ];

        if (isMac) {
            template.unshift({
                label: app.getName(),
                submenu: [
                    {
                        label: menuStrings['ABOUT'],
                        click: this.sendComboEvent
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['PREFS'],
                        accelerator: 'CmdOrCtrl+,',
                        click: this.sendComboEvent
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['EXIT'],
                        accelerator: 'CmdOrCtrl+Q',
                        click: this.sendComboEvent
                    }]
            });
        } else {
            // add preference to file menu
            (template[0].submenu as MenuItemConstructorOptions[]).unshift({
                label: menuStrings['PREFS'],
                accelerator: 'CmdOrCtrl+,',
                click: this.sendComboEvent
            });

            // add exit to file menu
            (template[0].submenu as MenuItemConstructorOptions[]).push({ type: 'separator' },
            {
                label: menuStrings['OPEN_TERMINAL'],
                accelerator: 'CmdOrCtrl+K',
                click: this.sendComboEvent
            },
            { type: 'separator' },
            {
                label: menuStrings['EXIT'],
                accelerator: 'CmdOrCtrl+Q',
                click: this.sendComboEvent
                });

            // add about menuItem
            (template[3].submenu as MenuItemConstructorOptions[]).unshift({
                label: menuStrings['ABOUT'],
                click: this.sendComboEvent
            });
        }

        return template as MenuItemConstructorOptions[];
    }

    createMenu(menuStrings: LocaleString) {
        const menuTemplate = this.getMenuTemplate(menuStrings);

        var menu = Menu.buildFromTemplate(menuTemplate)

        Menu.setApplicationMenu(menu);
    }
};
