import * as React from 'react'
import { HotkeysTarget2 } from '@blueprintjs/core'
import { withTranslation, WithTranslation } from 'react-i18next'
import { ipcRenderer } from 'electron'
import { inject } from 'mobx-react'

import { AppState } from '$src/state/appState'
import { FileState } from '$src/state/fileState'
import { SettingsState } from '$src/state/settingsState'
import { isMac } from '$src/utils/platform'

interface InjectedProps extends WithTranslation {
    appState: AppState
    settingsState: SettingsState
}

class KeyboardHotkeysClass extends React.Component<WithTranslation> {
    private appState: AppState

    private get injected(): InjectedProps {
        return this.props as InjectedProps
    }

    constructor(props: WithTranslation) {
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
    onShowDownloadsTab = (): void => this.appState.toggleExplorerTab(false)

    onShowExplorerTab = (): void => this.appState.toggleExplorerTab(true)

    onNextView = (): void => {
        const winState = this.appState.winStates[0]
        // do nothing if single view
        if (winState.splitView) {
            // get the view that's not active
            const nextView = winState.inactiveView

            winState.setActiveView(nextView.viewId)
        }
    }

    onBackwardHistory = (): void => {
        const cache = this.getActiveFileCache()
        if (cache) {
            cache.navHistory(-1)
        }
    }

    onForwardHistory = (): void => {
        const cache = this.getActiveFileCache()
        if (cache) {
            cache.navHistory(1)
        }
    }

    onOpenDevTools = (): void => {
        ipcRenderer.invoke('openDevTools')
    }

    onDebugCache = (): void => {
        // let i = 0;
        // for (let cache of this.appState.views[0].caches) {
        const cache = this.getActiveFileCache()
        console.log('====')
        console.log('cache selected length', cache.selected.length)
        console.log('cache.cursor', cache.cursor)
        console.log('cache.editingId', cache.editingId)
        console.log('===')
        console.log(cache.selected)
        console.log(cache)
        // }
    }

    private hotkeys = [
        {
            global: true,
            combo: 'alt + mod + l',
            label: this.injected.t('SHORTCUT.MAIN.DOWNLOADS_TAB'),
            onKeyDown: this.onShowDownloadsTab,
        },
        {
            global: true,
            combo: 'alt + mod + e',
            label: this.injected.t('SHORTCUT.MAIN.EXPLORER_TAB'),
            onKeyDown: this.onShowExplorerTab,
        },
        {
            global: true,
            combo: 'ctrl + shift + right',
            label: this.injected.t('SHORTCUT.MAIN.NEXT_VIEW'),
            onKeyDown: this.onNextView,
        },
        {
            global: true,
            combo: 'ctrl + shift + left',
            label: this.injected.t('SHORTCUT.MAIN.PREVIOUS_VIEW'),
            onKeyDown: this.onNextView,
        },
        ...(isMac
            ? [
                  {
                      global: true,
                      combo: 'mod + left',
                      label: this.injected.t('SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY'),
                      onKeyDown: this.onBackwardHistory,
                  },
              ]
            : []),
        ...(!isMac
            ? [
                  {
                      global: true,
                      combo: 'alt + left',
                      label: this.injected.t('SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY'),
                      onKeyDown: this.onBackwardHistory,
                  },
              ]
            : []),
        ...(isMac
            ? [
                  {
                      global: true,
                      combo: 'mod + right',
                      label: this.injected.t('SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY'),
                      onKeyDown: this.onForwardHistory,
                  },
              ]
            : []),
        ...(!isMac
            ? [
                  {
                      global: true,
                      combo: 'alt + right',
                      label: this.injected.t('SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY'),
                      onKeyDown: this.onForwardHistory,
                  },
              ]
            : []),
        {
            global: true,
            combo: 'alt + mod + i',
            label: this.injected.t('SHORTCUT.OPEN_DEVTOOLS'),
            onKeyDown: this.onOpenDevTools,
        },
        /* debug only shortcuts */
        {
            global: true,
            combo: 'mod + p',
            label: 'view cache',
            preventDefault: true,
            onKeyDown: this.onDebugCache,
            group: this.injected.t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        },
    ]

    render(): JSX.Element {
        // we need to render something otherwise hotkeys won't work
        return (
            <HotkeysTarget2 hotkeys={this.hotkeys}>
                <div />
            </HotkeysTarget2>
        )
    }
}

const KeyboardHotkeys = withTranslation()(inject('appState', 'settingsState')(KeyboardHotkeysClass))

export { KeyboardHotkeys }
