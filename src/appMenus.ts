import * as process from 'process';
import { Menu, BrowserWindow, MenuItemConstructorOptions, MenuItem, app } from 'electron';

const ACCELERATOR_EVENT = 'menu_accelerator';
const IS_MAC = process.platform === 'darwin';

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
                        label: menuStrings['COPY'],
                        accelerator: 'CmdOrCtrl+C',
                        click: this.sendComboEvent
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
                        accelerator: 'CmdOrCtrl+V',
                        click: this.sendComboEvent
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

        if (IS_MAC) {
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
            template[0].submenu.unshift({
                label: menuStrings['PREFS'],
                accelerator: 'CmdOrCtrl+,',
                click: this.sendComboEvent
            });

            // add exit to file menu
            template[0].submenu.push({ type: 'separator' },
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
            template[3].submenu.unshift({
                label: menuStrings['ABOUT'],
                click: this.sendComboEvent
            });
        }

        return template as MenuItemConstructorOptions[];
    }

    createMenu(menuStrings: LocaleString) {
        const menuTemplate = this.getMenuTemplate(menuStrings);
        // TODO: special case for darwin
        var menu = Menu.buildFromTemplate(menuTemplate)

        Menu.setApplicationMenu(menu);
    }
};
