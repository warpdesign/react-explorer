import * as React from 'react'
import { withTranslation, WithTranslation } from 'react-i18next'
import { Classes, Intent } from '@blueprintjs/core'
import { inject } from 'mobx-react'

import { WithMenuAccelerators, Accelerators, Accelerator } from '$src/components/hoc/WithMenuAccelerators'
import { isMac } from '$src/utils/platform'
import { isEditable } from '$src/utils/dom'
import { AppState } from '$src/state/appState'
import { FileState } from '$src/state/fileState'
import { AppToaster } from '$src/components/AppToaster'
import { SettingsState } from '$src/state/settingsState'

interface Props extends WithTranslation {
    onExitComboDown: () => void
}

interface InjectedProps extends Props {
    appState: AppState
    settingsState: SettingsState
}

class MenuAcceleratorsClass extends React.Component<Props> {
    private appState: AppState

    private get injected(): InjectedProps {
        return this.props as InjectedProps
    }

    constructor(props: Props) {
        super(props)

        this.appState = this.injected.appState
    }

    copyTextToClipboard(fileCache: FileState, filesOnly = false): void {
        this.appState.clipboard.copySelectedItemsPath(fileCache, filesOnly)
    }

    private getActiveFileCache(ignoreStatus = false): FileState {
        const state = this.appState.isExplorer && this.appState.getActiveCache()

        if (ignoreStatus || !state) {
            return state
        } else {
            return ignoreStatus ? state : (state.status === 'ok' && state) || null
        }
    }

    /**
     * Event Handlers
     */
    onCopyPath = (): void => {
        const fileCache = this.getActiveFileCache()
        if (fileCache) {
            this.copyTextToClipboard(fileCache)
        }
    }

    onCopyFilename = (): void => {
        const fileCache = this.getActiveFileCache()
        if (fileCache) {
            this.copyTextToClipboard(fileCache, true)
        }
    }

    onOpenShortcuts = (): void => {
        this.appState.isShortcutsOpen = true
    }

    onOpenPrefs = (): void => {
        this.appState.isPrefsOpen = true
    }

    onReloadFileView = (): void => {
        if (this.appState.isExplorer) {
            this.appState.refreshActiveView(/*this.state.activeView*/)
        } else {
            console.log('downloads active, no refresh')
        }
    }

    onToggleHiddenFiles = (): void => {
        const fileCache = this.getActiveFileCache()
        fileCache.setShowHiddenFiles(!fileCache.showHiddenFiles)
    }

    onOpenTerminal = async (_: string, data: { viewId: number; tabIndex: number }) => {
        let cache: FileState

        if (!data || typeof data.viewId === 'undefined') {
            cache = this.getActiveFileCache()
        } else {
            const winState = this.appState.winStates[0]
            const view = winState.views[data.viewId]
            cache = view.caches[data.tabIndex]
        }

        if (cache.status !== 'ok' || cache.error) {
            return
        }

        const isOverlayOpen = document.body.classList.contains(Classes.OVERLAY_OPEN)

        if (cache && !isOverlayOpen && !isEditable(document.activeElement)) {
            const resolvedPath = cache.getAPI().resolve(cache.path)
            const { settingsState, t } = this.injected
            const terminalCmd = settingsState.getTerminalCommand(resolvedPath)
            try {
                await cache.openTerminal(terminalCmd)
            } catch (e) {
                AppToaster.show({
                    message: t('ERRORS.OPEN_TERMINAL_FAILED'),
                    icon: 'warning-sign',
                    intent: Intent.WARNING,
                    timeout: 0,
                })
            }
        }
    }

    cycleTab = (direction: 1 | -1): void => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0]
            const viewState = winState.activeView
            viewState.cycleTab(direction)
        }
    }

    onNextTab = (): void => {
        this.cycleTab(1)
    }

    onPreviousTab = (): void => {
        this.cycleTab(-1)
    }

    onNewTab = (): void => {
        if (this.appState.isExplorer) {
            const { settingsState } = this.injected
            const { defaultFolder, defaultViewMode } = settingsState
            const winState = this.appState.winStates[0]
            const viewState = winState.activeView
            viewState.addCache(defaultFolder, viewState.getVisibleCacheIndex() + 1, {
                activateNewCache: true,
                viewmode: defaultViewMode,
            })
            console.log('need to create a new tab')
        }
    }

    onCloseTab = (): void => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0]
            const viewState = winState.activeView
            const activeTabIndex = viewState.getVisibleCacheIndex()
            viewState.closeTab(activeTabIndex)
        }
    }

    onToggleSplitView = (): void => {
        if (this.appState.isExplorer) {
            this.appState.toggleSplitViewMode()
        }
    }

    onForward = (): void => {
        const cache = this.getActiveFileCache()
        cache && cache.navHistory(1)
    }

    onBack = (): void => {
        const cache = this.getActiveFileCache()
        cache && cache.navHistory(-1)
    }

    onParent = (): void => {
        const cache = this.getActiveFileCache()
        !isEditable(document.activeElement) && cache && cache.openParentDirectory()
    }

    onRename = (): void => {
        this.appState.startEditingFile(this.getActiveFileCache())
    }

    onToggleIconViewMode = (): void => {
        const cache = this.getActiveFileCache()
        cache.viewmode !== 'icons' && cache.setViewMode('icons')
    }

    onToggleTableViewMode = (): void => {
        const cache = this.getActiveFileCache()
        cache.viewmode !== 'details' && cache.setViewMode('details')
    }

    renderMenuAccelerators(): React.ReactElement {
        return (
            <Accelerators>
                <Accelerator combo="CmdOrCtrl+Shift+C" onClick={this.onCopyPath}></Accelerator>
                <Accelerator combo="CmdOrCtrl+Shift+N" onClick={this.onCopyFilename}></Accelerator>
                <Accelerator combo="CmdOrCtrl+S" onClick={this.onOpenShortcuts}></Accelerator>
                <Accelerator combo="CmdOrCtrl+," onClick={this.onOpenPrefs}></Accelerator>
                <Accelerator combo="CmdOrCtrl+R" onClick={this.onReloadFileView}></Accelerator>
                <Accelerator combo="CmdOrCtrl+H" onClick={this.onToggleHiddenFiles}></Accelerator>
                <Accelerator combo="CmdOrCtrl+Q" onClick={this.props.onExitComboDown}></Accelerator>
                <Accelerator combo="CmdOrCtrl+K" onClick={this.onOpenTerminal}></Accelerator>
                <Accelerator combo="Ctrl+Tab" onClick={this.onNextTab}></Accelerator>
                <Accelerator combo="Ctrl+Shift+Tab" onClick={this.onPreviousTab}></Accelerator>
                <Accelerator combo="CmdOrCtrl+T" onClick={this.onNewTab}></Accelerator>
                <Accelerator combo="CmdOrCtrl+W" onClick={this.onCloseTab}></Accelerator>
                <Accelerator combo="CmdOrCtrl+Shift+Alt+V" onClick={this.onToggleSplitView}></Accelerator>
                <Accelerator combo={isMac ? 'Cmd+Left' : 'Alt+Left'} onClick={this.onBack}></Accelerator>
                <Accelerator combo={isMac ? 'Cmd+Right' : 'Alt+Right'} onClick={this.onForward}></Accelerator>
                <Accelerator combo="Backspace" onClick={this.onParent}></Accelerator>
                <Accelerator combo="rename" onClick={this.onRename}></Accelerator>
                <Accelerator combo="CmdOrCtrl+1" onClick={this.onToggleIconViewMode}></Accelerator>
                <Accelerator combo="CmdOrCtrl+2" onClick={this.onToggleTableViewMode}></Accelerator>
            </Accelerators>
        )
    }

    render(): JSX.Element {
        return null
    }
}

const MenuAccelerators = withTranslation()(
    inject('appState', 'settingsState')(WithMenuAccelerators(MenuAcceleratorsClass)),
)

export { MenuAccelerators }
