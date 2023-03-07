import { clipboard, Menu, BrowserWindow, MenuItemConstructorOptions, MenuItem, app, ipcMain, dialog } from 'electron'

import { isMac, isLinux, VERSIONS } from '$src/electron/osSupport'
import { ReactiveProperties } from '$src/types'

const ACCELERATOR_EVENT = 'menu_accelerator'

export interface LocaleString {
    [key: string]: string
}

export class AppMenu {
    win: BrowserWindow
    lang: string
    menuStrings: LocaleString

    constructor(win: BrowserWindow) {
        this.win = win
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendComboEvent = (menuItem: MenuItem & { accelerator: string }) => {
        const accel = menuItem.accelerator || ''
        console.log('sending', menuItem.label, accel)
        this.win.webContents.send(ACCELERATOR_EVENT, Object.assign({ combo: accel, data: undefined }))
    }

    sendSelectAll = (): void => {
        const activeWindow = BrowserWindow.getFocusedWindow()
        if (activeWindow) {
            // do not send select all combo if devtools window is opened
            console.log('activeWindow', activeWindow.id, this.win === activeWindow)
            const webContents = activeWindow.webContents
            // !webContents.getURL().match(/^chrome-devtools:/)
            if (activeWindow === this.win && !webContents.isDevToolsFocused()) {
                console.log('NOT DevTools')
                this.sendComboEvent({
                    accelerator: 'CmdOrCtrl+A',
                    label: 'selectAll',
                } as MenuItem & { accelerator: string })
            } else {
                webContents.selectAll()
            }
        }
    }

    sendReloadEvent = (): void => {
        ipcMain.emit('reloadIgnoringCache')
    }

    getVersionString = (): string =>
        this.menuStrings['ABOUT_CONTENT']
            .replace('${version}', app.getVersion())
            .replace('${hash}', window.ENV.HASH as string)
            .replace('${date}', new Date(Number(window.ENV.BUILD_DATE as string)).toLocaleString(this.lang))
            .replace('${electron}', VERSIONS.electron)
            .replace('${platform}', VERSIONS.platform)
            .replace('${release}', VERSIONS.release)
            .replace('${arch}', VERSIONS.arch)
            .replace('${chrome}', VERSIONS.chrome)
            .replace('${node}', VERSIONS.node)

    showAboutDialog = async (): Promise<void> => {
        const detail = this.getVersionString()

        const buttons = isLinux
            ? [this.menuStrings['COPY'], this.menuStrings['OK']]
            : [this.menuStrings['OK'], this.menuStrings['COPY']]

        const defaultId = buttons.indexOf(this.menuStrings['OK'])

        const { response } = await dialog.showMessageBox(this.win, {
            title: this.menuStrings['ABOUT_TITLE'],
            type: 'question',
            message: this.menuStrings['ABOUT_TITLE'],
            detail,
            buttons,
            noLink: true,
            defaultId,
        })

        // copy details to clipboard if copy button was pressed
        if (response !== defaultId) {
            clipboard.writeText(detail)
        }
    }

    getMenuTemplate({
        activeViewTabNums,
        isReadonly,
        isIndirect,
        isOverlayOpen,
        isExplorer,
        path,
        selectedLength,
        status,
    }: ReactiveProperties): MenuItemConstructorOptions[] {
        const menuStrings = this.menuStrings
        const explorerWithoutOverlay = !isOverlayOpen && isExplorer
        const explorerWithoutOverlayCanWrite = explorerWithoutOverlay && !isReadonly && status === 'ok'
        let windowMenuIndex = 4

        const template = [
            {
                label: menuStrings['TITLE_FILE'],
                submenu: [
                    { type: 'separator' },
                    {
                        label: menuStrings['NEW_TAB'],
                        click: this.sendComboEvent,
                        accelerator: 'CmdOrCtrl+T',
                        enabled: explorerWithoutOverlay,
                    },
                    {
                        label: menuStrings['CLOSE_TAB'],
                        click: this.sendComboEvent,
                        accelerator: 'CmdOrCtrl+W',
                        enabled: explorerWithoutOverlay && activeViewTabNums > 1,
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['MAKEDIR'],
                        accelerator: 'CmdOrCtrl+N',
                        click: this.sendComboEvent,
                        enabled: explorerWithoutOverlayCanWrite,
                    },
                    {
                        label: menuStrings['RENAME'],
                        click: () => {
                            // send fake combo event because there is no defined accelerator
                            this.win.webContents.send(
                                ACCELERATOR_EVENT,
                                Object.assign({ combo: 'rename', data: undefined }),
                            )
                        },
                        enabled: explorerWithoutOverlayCanWrite && selectedLength === 1,
                    },
                    {
                        label: menuStrings['DELETE'],
                        accelerator: 'CmdOrCtrl+D',
                        click: this.sendComboEvent,
                        enabled: explorerWithoutOverlayCanWrite && selectedLength > 0,
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['OPEN_TERMINAL'],
                        accelerator: 'CmdOrCtrl+K',
                        click: this.sendComboEvent,
                        enabled: explorerWithoutOverlay && !isIndirect,
                    },
                ],
            },
            {
                label: menuStrings['TITLE_EDIT'],
                submenu: [
                    {
                        label: menuStrings['CUT'],
                        role: 'cut',
                    },
                    {
                        label: menuStrings['COPY'],
                        role: 'copy',
                    },
                    {
                        label: menuStrings['COPY_PATH'],
                        accelerator: 'CmdOrCtrl+Shift+C',
                        click: this.sendComboEvent,
                    },
                    {
                        label: menuStrings['COPY_FILENAMES'],
                        accelerator: 'CmdOrCtrl+Shift+N',
                        click: this.sendComboEvent,
                    },
                    {
                        label: menuStrings['PASTE'],
                        role: 'paste',
                    },
                    {
                        label: menuStrings['SELECT_ALL'],
                        accelerator: 'CmdOrCtrl+A',
                        click: this.sendSelectAll,
                    },
                ],
            },
            {
                label: menuStrings['TITLE_VIEW'],
                submenu: [
                    {
                        label: menuStrings['TOGGLE_SPLITVIEW'],
                        accelerator: 'CmdOrCtrl+Shift+Alt+V',
                        click: this.sendComboEvent,
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['RELOAD_VIEW'],
                        accelerator: 'CmdOrCtrl+R',
                        click: this.sendComboEvent,
                    },
                    {
                        label: menuStrings['TOGGLE_HIDDEN_FILES'],
                        accelerator: 'CmdOrCtrl+H',
                        click: this.sendComboEvent,
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['FORCE_RELOAD_APP'],
                        accelerator: 'CmdOrCtrl+Shift+R',
                        click: this.sendReloadEvent,
                    },
                ],
            },
            {
                label: menuStrings['TITLE_GO'],
                submenu: [
                    {
                        label: menuStrings['GO_BACK'],
                        accelerator: isMac ? 'Cmd+Left' : 'Alt+Left',
                        click: this.sendComboEvent,
                    },
                    {
                        label: menuStrings['GO_FORWARD'],
                        accelerator: isMac ? 'Cmd+Right' : 'Alt+Right',
                        click: this.sendComboEvent,
                    },
                    {
                        label: menuStrings['GO_PARENT'],
                        accelerator: 'Backspace',
                        click: this.sendComboEvent,
                    },
                ],
            },
            {
                label: menuStrings['TITLE_WINDOW'],
                submenu: [
                    {
                        label: menuStrings['MINIMIZE'],
                        role: 'minimize',
                    },
                ],
            },
            {
                label: menuStrings['TITLE_HELP'],
                submenu: [
                    {
                        label: menuStrings['KEYBOARD_SHORTCUTS'],
                        click: this.sendComboEvent,
                        accelerator: 'CmdOrCtrl+S',
                    },
                ],
            },
        ]

        if (isMac) {
            ;(template as MenuItemConstructorOptions[]).unshift({
                label: app.getName(),
                submenu: [
                    {
                        label: menuStrings['ABOUT'],
                        click: this.showAboutDialog,
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['PREFS'],
                        accelerator: 'CmdOrCtrl+,',
                        click: this.sendComboEvent,
                    },
                    { type: 'separator' },
                    {
                        label: menuStrings['EXIT'],
                        accelerator: 'CmdOrCtrl+Q',
                        click: this.sendComboEvent,
                    },
                ],
            })

            app.setAboutPanelOptions({
                applicationName: 'React-Explorer',
                applicationVersion: app.getVersion(),
                version: this.getVersionString(),
            })

            windowMenuIndex = 5

            // add zoom window/role entry
            ;(template[5].submenu as MenuItemConstructorOptions[]).push({
                label: menuStrings['ZOOM'],
                role: 'zoom',
            })
        } else {
            // add preference to file menu
            ;(template[0].submenu as MenuItemConstructorOptions[]).unshift({
                label: menuStrings['PREFS'],
                accelerator: 'CmdOrCtrl+,',
                click: this.sendComboEvent,
            })

            // add exit to file menu
            ;(template[0].submenu as MenuItemConstructorOptions[]).push(
                { type: 'separator' },
                {
                    label: menuStrings['EXIT'],
                    accelerator: 'CmdOrCtrl+Q',
                    click: this.sendComboEvent,
                },
            )

            // add about menuItem
            ;(template[5].submenu as MenuItemConstructorOptions[]).push({
                label: menuStrings['ABOUT'],
                click: this.showAboutDialog,
            })
        }

        // add zoom window/role entry
        ;(template[windowMenuIndex].submenu as MenuItemConstructorOptions[]).push(
            {
                type: 'separator',
            },
            {
                label: menuStrings['SELECT_NEXT_TAB'],
                accelerator: 'Ctrl+Tab',
                click: this.sendComboEvent,
            },
            {
                label: menuStrings['SELECT_PREVIOUS_TAB'],
                accelerator: 'Ctrl+Shift+Tab',
                click: this.sendComboEvent,
            },
        )

        return template as MenuItemConstructorOptions[]
    }

    createMenu(menuStrings: LocaleString, props: ReactiveProperties): void {
        this.menuStrings = menuStrings
        this.lang = props.language

        const template = this.getMenuTemplate(props)

        const menu = Menu.buildFromTemplate(template)

        Menu.setApplicationMenu(menu)
    }
}
