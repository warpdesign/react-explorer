import * as React from 'react'
import { ipcRenderer } from 'electron'
import { platform } from 'process'
import { FocusStyleManager, Alert, Classes, Intent } from '@blueprintjs/core'
import classNames from 'classnames'
import { runInAction } from 'mobx'
import { Provider, observer, inject } from 'mobx-react'
import * as drivelist from 'drivelist'
import { withTranslation, WithTranslation, Trans } from 'react-i18next'

import { isMac } from '$src/utils/platform'
import { SideView } from '$src/components/SideView'
import { LogUI, Logger } from '$src/components/Log'
import { Downloads } from '$src/components/Downloads'
import { Nav } from '$src/components/Nav'
import { FileState } from '$src/state/fileState'
import { SettingsState } from '$src/state/settingsState'
import { PrefsDialog } from '$src/components/dialogs/PrefsDialog'
import { ShortcutsDialog } from '$src/components/dialogs/ShortcutsDialog'
import { LeftPanel } from '$src/components/LeftPanel'
import { shouldCatchEvent } from '$src/utils/dom'
import { sendFakeCombo } from '$src/utils/keyboard'
import { MenuAccelerators } from '$src/components/shortcuts/MenuAccelerators'
import { KeyboardHotkeys } from '$src/components/shortcuts/KeyboardHotkeys'
import { AppState } from '$src/state/appState'
import Keys from '$src/constants/keys'

require('@blueprintjs/core/lib/css/blueprint.css')
require('@blueprintjs/icons/lib/css/blueprint-icons.css')
require('@blueprintjs/popover2/lib/css/blueprint-popover2.css')
require('$src/css/main.css')
require('$src/css/windows.css')
require('$src/css/scrollbars.css')

interface InjectedProps extends WithTranslation {
    appState: AppState
}

const App = inject('appState')(
    observer(
        class App extends React.Component<WithTranslation> {
            private appState: AppState
            private settingsState: SettingsState

            private get injected(): InjectedProps {
                return this.props as InjectedProps
            }

            constructor(props: WithTranslation) {
                super(props)

                const { appState } = this.injected
                const { settingsState } = appState
                this.settingsState = settingsState
                this.appState = appState
                const { i18n } = this.props
                const splitView = !!appState.options.splitView

                console.log('App:constructor', { splitView })

                this.state = {}

                // do not show outlines when using the mouse
                FocusStyleManager.onlyShowFocusOnTabs()

                if (window.ENV.CY) {
                    window.appState = this.appState
                    window.settingsState = settingsState
                    window.drivelist = drivelist
                    window.renderer = ipcRenderer
                }

                Logger.success(
                    `React-Explorer ${window.ENV.VERSION} - CY: ${window.ENV.CY} - NODE_ENV: ${window.ENV.NODE_ENV} - lang: ${i18n.language}`,
                )
                Logger.success(`hash=${window.ENV.HASH}`)
                Logger.success(
                    `lang=${settingsState.lang}, darkMode=${settingsState.darkMode}, defaultFolder=${settingsState.defaultFolder}`,
                )
            }

            onShortcutsCombo = (e: KeyboardEvent): void => {
                // Little hack to prevent pressing tab key from focus an element:
                // we prevent the propagation of the tab key keydown event
                // but this will then prevent the menu accelerators from working
                // so we simply send a fakeCombo to avoid that.
                // We could simply disable outline using css but we want to keep
                // the app accessible.
                let caught = false
                if (e.ctrlKey) {
                    switch (true) {
                        case !window.ENV.CY && !isMac && e.key === Keys.A && shouldCatchEvent(e):
                            caught = true
                            sendFakeCombo('CmdOrCtrl+A')
                            break

                        case e.key === Keys.TAB:
                            caught = true
                            const combo = e.shiftKey ? 'Ctrl+Shift+Tab' : 'Ctrl+Tab'
                            sendFakeCombo(combo)
                            break
                    }
                } else if (shouldCatchEvent(e) && e.key === Keys.FORWARD_SLASH && e.shiftKey) {
                    caught = true
                }

                if (caught) {
                    e.stopPropagation()
                    e.stopImmediatePropagation()
                    e.preventDefault()
                }
            }

            onCopyEvent = (e: Event): void => {
                console.log('copied event received!')
                if (shouldCatchEvent(e)) {
                    this.onCopy()
                }
            }

            onPasteEvent = (e: Event): void => {
                console.log('paste event received!')
                if (shouldCatchEvent(e)) {
                    this.onPaste()
                }
            }

            addListeners(): void {
                // prevent builtin hotkeys dialog from opening: there are numerous problems with it
                document.addEventListener('keydown', this.onShortcutsCombo, true)
                // we need to listen to paste event because when selecting the copy/paste menuItem,
                // Electron won't call the menuItem.onClick event
                document.addEventListener('copy', this.onCopyEvent)
                document.addEventListener('paste', this.onPasteEvent)
                // sent when the window has been closed
                ipcRenderer.on('exitRequest', () => this.onExitRequest())
            }

            showDownloadsTab = (): void => {
                this.appState.showDownloadsTab()
            }

            showExplorerTab = (): void => {
                this.appState.showExplorerTab()
            }

            setActiveView(view: number): void {
                const winState = this.appState.winStates[0]
                winState.setActiveView(view)
            }

            /**
             * stop click propagation in case click happens on an inactive sideview:
             * this prevents doing unwanted actions like selected elements when the
             * user simply wants to activate an inactive sideview
             */
            handleClick = (e: React.MouseEvent): void => {
                const sideview = (e.target as HTMLElement).closest('.sideview')
                const filetable = (e.target as HTMLElement).closest('.fileListSizerWrapper')

                if (sideview) {
                    const num = parseInt(sideview.id.replace('view_', ''), 10)
                    const winState = this.appState.winStates[0]
                    const view = winState.getView(num)
                    if (!view.isActive) {
                        // prevent selecting a row when the view gets activated
                        // Note: only do that for left click
                        // we want right click to activate the inactive view's menu
                        if (filetable && e.button === 2) {
                            console.log('preventing event propagation', e.target)
                            e.stopPropagation()
                        }
                        this.setActiveView(num)
                    }
                }
            }

            onExitComboDown = (): void => {
                this.onExitRequest()
            }

            onExitRequest = (): void => {
                console.log('exitRequest')
                if (this.appState && this.appState.transferListState.pendingTransfers) {
                    this.setState({ isExitDialogOpen: true })
                } else {
                    console.log('sending readyToExit event')
                    ipcRenderer.invoke('readyToExit')
                }
            }

            componentDidMount(): void {
                // listen for events from main electron process as well as webview
                this.addListeners()
                this.setDarkThemeClass()
                this.setPlatformClass()
            }

            componentWillUnmount(): void {
                document.removeEventListener('keydown', this.onShortcutsCombo)
                document.removeEventListener('copy', this.onCopyEvent)
                document.removeEventListener('paste', this.onPasteEvent)
                ipcRenderer.removeAllListeners('exitRequest')
            }

            componentDidUpdate(): void {
                this.setDarkThemeClass()
                if (!window.ENV.CY) {
                    const {
                        transferListState: { pendingTransfers, totalTransferProgress },
                    } = this.appState
                    const progress = (pendingTransfers && totalTransferProgress) || -1
                    ipcRenderer.invoke('window:setProgressBar', progress)
                }
            }

            onExitDialogClose = (valid: boolean): void => {
                this.appState.isExitDialogOpen = false
                if (!valid) {
                    this.showDownloadsTab()
                } else {
                    ipcRenderer.invoke('readyToExit')
                }
            }

            private getActiveFileCache(ignoreStatus = false): FileState {
                const state = this.appState.getActiveCache()

                if (ignoreStatus || !state) {
                    return state
                } else {
                    return ignoreStatus ? state : (state.status === 'ok' && state) || null
                }
            }

            onCopy = (): void => {
                const fileCache: FileState = this.getActiveFileCache()

                if (fileCache) {
                    this.appState.clipboard.setClipboard(fileCache)
                }
            }

            private onPaste = (): void => {
                const fileCache: FileState = this.getActiveFileCache()
                this.appState.paste(fileCache)
            }

            closePrefs = (): void => {
                runInAction(() => (this.appState.isPrefsOpen = false))
            }

            closeShortcuts = (): void => {
                runInAction(() => (this.appState.isShortcutsOpen = false))
            }

            setDarkThemeClass(): void {
                if (this.settingsState.isDarkModeActive) {
                    document.body.classList.add(Classes.DARK)
                } else {
                    document.body.classList.remove(Classes.DARK)
                }
            }

            setPlatformClass(): void {
                document.body.classList.add(platform)
            }

            render(): React.ReactNode {
                const { isPrefsOpen, isShortcutsOpen, isExitDialogOpen } = this.appState
                const isExplorer = this.appState.isExplorer
                const count = this.appState.transferListState.pendingTransfers
                const { t } = this.props
                const winState = this.appState.winStates[0]
                const isSplitView = winState.splitView
                const mainClass = classNames('main', {
                    singleView: !isSplitView,
                    dualView: isSplitView,
                })
                const viewStateLeft = winState.views[0]
                // const viewStateRight = winState.views[1]

                // Access isDarkModeActive without modifying it to make mobx trigger the render
                // when isDarkModeActive is modified.

                // We could modify the body's class from here but it's a bad pratice so we
                // do it in componentDidUpdate/componentDidMount instead
                this.settingsState.isDarkModeActive

                return (
                    <Provider settingsState={this.settingsState}>
                        <React.Fragment>
                            <Alert
                                cancelButtonText={t('DIALOG.QUIT.BT_KEEP_TRANSFERS')}
                                confirmButtonText={t('DIALOG.QUIT.BT_STOP_TRANSFERS')}
                                icon="warning-sign"
                                intent={Intent.WARNING}
                                onClose={this.onExitDialogClose}
                                isOpen={isExitDialogOpen}
                            >
                                <p>
                                    <Trans i18nKey="DIALOG.QUIT.CONTENT" count={count}>
                                        There are <b>{{ count }}</b> transfers <b>in progress</b>.<br />
                                        <br />
                                        Exiting the app now will <b>cancel</b> the downloads.
                                    </Trans>
                                </p>
                            </Alert>
                            <PrefsDialog isOpen={isPrefsOpen} onClose={this.closePrefs}></PrefsDialog>
                            <ShortcutsDialog isOpen={isShortcutsOpen} onClose={this.closeShortcuts}></ShortcutsDialog>
                            <MenuAccelerators onExitComboDown={this.onExitComboDown} />
                            <KeyboardHotkeys />
                            <Nav></Nav>
                            <div
                                onClickCapture={this.handleClick}
                                onContextMenuCapture={this.handleClick}
                                className={mainClass}
                            >
                                <LeftPanel hide={!isExplorer}></LeftPanel>
                                <SideView viewState={viewStateLeft} hide={!isExplorer} onPaste={this.onPaste} />
                                {isSplitView && (
                                    <SideView viewState={winState.views[1]} hide={!isExplorer} onPaste={this.onPaste} />
                                )}
                                <Downloads hide={isExplorer} />
                            </div>
                            <LogUI></LogUI>
                        </React.Fragment>
                    </Provider>
                )
            }
        },
    ),
)

const ExplorerApp = withTranslation()(App)

export { ExplorerApp }
