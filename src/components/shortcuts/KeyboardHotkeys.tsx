import * as React from 'react'
import { withTranslation, WithTranslation } from 'react-i18next'
import { ipcRenderer } from 'electron'
import { Intent, HotkeysTarget2 } from '@blueprintjs/core'
import { inject } from 'mobx-react'
import { AppState } from '../../state/appState'
import { FileState } from '../../state/fileState'
import { AppToaster } from '../AppToaster'
import { SettingsState } from '../../state/settingsState'
import { Logger } from '../Log'
import { isMac } from '../../utils/platform'

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
        const length = fileCache.selected.length

        this.appState.clipboard.copySelectedItemsPath(fileCache, filesOnly)

        if (length) {
            const { t } = this.injected
            AppToaster.show(
                {
                    message: filesOnly
                        ? t('COMMON.CP_NAMES_COPIED', { count: length })
                        : t('COMMON.CP_PATHS_COPIED', { count: length }),
                    icon: 'tick',
                    intent: Intent.NONE,
                },
                undefined,
                true,
            )
        }
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
    onShowDownloadsTab = (): void => {
        this.appState.showDownloadsTab()
    }

    onShowExplorerTab = (): void => {
        this.appState.showExplorerTab()
    }

    onNextView = (): void => {
        const winState = this.appState.winStates[0]
        // do nothing if single view
        if (winState.splitView) {
            // get the view that's not active
            const nextView = winState.getInactiveView()

            winState.setActiveView(nextView.viewId)
        }
    }

    onBackwardHistory = (): void => {
        const cache = this.getActiveFileCache()
        console.log('onBackwardHistory')
        if (cache) {
            console.log('if cache')
            cache.navHistory(-1)
        }
    }

    onForwardHistory = (): void => {
        const cache = this.getActiveFileCache()
        console.log('onForwardHistory')
        if (cache) {
            console.log('if cache')
            cache.navHistory(1)
        }
    }

    onOpenDevTools = (): void => {
        ipcRenderer.invoke('openDevTools')
    }

    onShowHistory = (): void => {
        const fileCache: FileState = this.getActiveFileCache(true)

        if (fileCache && fileCache.status === 'ok') {
            console.log('showHistory')
            fileCache.history.forEach((path, i) => {
                const str = (fileCache.current === i && path + ' *') || path
                Logger.log(str)
            })
        }
    }

    onDebugCache = (): void => {
        // let i = 0;
        // for (let cache of this.appState.views[0].caches) {
        const cache = this.getActiveFileCache()
        console.log('====')
        console.log('cache selected length', cache.selected.length)
        console.log('cache.selectedId', cache.selectedId)
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
            combo: 'mod + h',
            label: this.injected.t('SHORTCUT.ACTIVE_VIEW.VIEW_HISTORY'),
            preventDefault: true,
            onKeyDown: this.onShowHistory,
            group: this.injected.t('SHORTCUT.GROUP.ACTIVE_VIEW'),
        },
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
