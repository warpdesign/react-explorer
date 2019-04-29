import { clipboard, Menu, BrowserWindow, MenuItemConstructorOptions, MenuItem, app, ipcMain, dialog } from 'electron';
import { isMac } from '../utils/platform';

declare var ENV: any;

const ACCELERATOR_EVENT = 'menu_accelerator';

export interface LocaleString {
    [key: string]: string
};

export class AppMenu {
    win: BrowserWindow;
    menuStrings: LocaleString;

    constructor(win: BrowserWindow) {
        this.win = win;
    }

    sendComboEvent = (menuItem: MenuItem & { accelerator: string }, data?: any) => {
        const accel = menuItem.accelerator || '';
        console.log('sending', menuItem.label, accel);
        this.win.webContents.send(ACCELERATOR_EVENT, Object.assign({ combo: accel, data }));
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
            } else {
                webContents.selectAll();
            }

        }
    }

    sendReloadEvent = () => {
        ipcMain.emit('reloadIgnoringCache');
    }

    showAboutDialog = () => {
        const version = app.getVersion();
        const detail = this.menuStrings['ABOUT_CONTENT'].replace('${version}', version).replace('${hash}', ENV.HASH);

        dialog.showMessageBox(null, {
            title: this.menuStrings['ABOUT_TITLE'],
            type: 'info',
            message: this.menuStrings['ABOUT_TITLE'],
            detail: detail,
            buttons: [this.menuStrings['OK'], this.menuStrings['COPY']]
        }, result => {
            console.log('result', result);
            if (result) {
                clipboard.writeText(detail);
            }
        });
    }

    getMenuTemplate(): MenuItemConstructorOptions[] {
        const menuStrings = this.menuStrings;
        let windowMenuIndex = 3;

        const template = [
            {
                label: menuStrings['TITLE_FILE'],
                submenu: [
                    { type: 'separator' },
                    {
                        label: menuStrings['NEW_TAB'],
                        click: this.sendComboEvent,
                        accelerator: 'CmdOrCtrl+T',
                    },
                    {
                        label: menuStrings['CLOSE_TAB'],
                        click: this.sendComboEvent,
                        accelerator: 'CmdOrCtrl+W',
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['MAKEDIR'],
                        accelerator: 'CmdOrCtrl+N',
                        click: this.sendComboEvent
                    },
                    {
                        label: menuStrings['RENAME'],
                        click: () => {
                            // send fake combo event because there is no defined accelerator
                            this.win.webContents.send(ACCELERATOR_EVENT, Object.assign({ combo: 'rename', data: undefined }));
                        }
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
                        click: this.sendReloadEvent
                    }
                ],
            },
            {
                label: menuStrings['TITLE_WINDOW'],
                submenu: [
                    {
                        label: menuStrings['MINIMIZE'],
                        role: 'minimize'
                    },
                ]
            },
            {
                label: menuStrings['TITLE_HELP'],
                submenu: [
                    {
                        label: menuStrings['KEYBOARD_SHORTCUTS'],
                        click: this.sendComboEvent,
                        accelerator: 'CmdOrCtrl+S'
                    }
                ]
            }
        ];

        if (isMac) {
            (template as MenuItemConstructorOptions[]).unshift({
                label: app.getName(),
                submenu: [
                    {
                        label: menuStrings['ABOUT'],
                        role: 'about'
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

            app.setAboutPanelOptions({
                applicationName: 'React-Explorer',
                applicationVersion: app.getVersion(),
                version: ENV.HASH
            });

            windowMenuIndex = 4;

            // add zoom window/role entry
            (template[4].submenu as MenuItemConstructorOptions[]).push({
                label: menuStrings['ZOOM'],
                role: 'zoom'
            });

        } else {
            // add preference to file menu
            (template[0].submenu as MenuItemConstructorOptions[]).unshift({
                label: menuStrings['PREFS'],
                accelerator: 'CmdOrCtrl+,',
                click: this.sendComboEvent
            });

            // add exit to file menu
            (template[0].submenu as MenuItemConstructorOptions[]).push(
                { type: 'separator' },
                {
                    label: menuStrings['EXIT'],
                    accelerator: 'CmdOrCtrl+Q',
                    click: this.sendComboEvent
                });

            // add about menuItem
            (template[3].submenu as MenuItemConstructorOptions[]).unshift({
                label: menuStrings['ABOUT'],
                click: this.showAboutDialog
            });
        }

        // add zoom window/role entry
        (template[windowMenuIndex].submenu as MenuItemConstructorOptions[]).push(
            {
                type: 'separator'
            }, {
                label: menuStrings['SELECT_NEXT_TAB'],
                accelerator: 'Ctrl+Tab',
                click: this.sendComboEvent
            }, {
                label: menuStrings['SELECT_PREVIOUS_TAB'],
                accelerator: 'Ctrl+Shift+Tab',
                click: this.sendComboEvent
            });

        return template as MenuItemConstructorOptions[];
    }

    createMenu(menuStrings: LocaleString) {
        this.menuStrings = menuStrings;

        const menuTemplate = this.getMenuTemplate();

        var menu = Menu.buildFromTemplate(menuTemplate)

        Menu.setApplicationMenu(menu);
    }
};
