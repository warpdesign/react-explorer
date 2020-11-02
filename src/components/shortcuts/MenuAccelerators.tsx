import * as React from 'react';
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { Intent } from '@blueprintjs/core';
import { inject } from 'mobx-react';
import { WithMenuAccelerators, Accelerators, Accelerator } from '../WithMenuAccelerators';
import { isMac } from '../../utils/platform';
import { isEditable } from '../../utils/dom';
import { AppState } from '../../state/appState';
import { FileState } from '../../state/fileState';
import { AppToaster } from '../AppToaster';
import { SettingsState } from '../../state/settingsState';

interface Props extends WithNamespaces {
    onExitComboDown: () => void;
}

interface InjectedProps extends Props {
    appState: AppState;
    settingsState: SettingsState;
}

@inject('appState', 'settingsState')
@WithMenuAccelerators
class MenuAcceleratorsClass extends React.Component<Props> {
    private appState: AppState;

    private get injected(): InjectedProps {
        return this.props as InjectedProps;
    }

    constructor(props: Props) {
        super(props);

        this.appState = this.injected.appState;
    }

    copyTextToClipboard(fileCache: FileState, filesOnly = false): void {
        const length = fileCache.selected.length;

        this.appState.copySelectedItemsPath(fileCache, filesOnly);

        if (length) {
            const { t } = this.injected;
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
            );
        }
    }

    private getActiveFileCache(ignoreStatus = false): FileState {
        const state = this.appState.isExplorer && this.appState.getActiveCache();

        if (ignoreStatus || !state) {
            return state;
        } else {
            return ignoreStatus ? state : (state.status === 'ok' && state) || null;
        }
    }

    /**
     * Event Handlers
     */
    onCopyPath = (): void => {
        const fileCache = this.getActiveFileCache();
        if (fileCache) {
            this.copyTextToClipboard(fileCache);
        }
    };

    onCopyFilename = (): void => {
        const fileCache = this.getActiveFileCache();
        if (fileCache) {
            this.copyTextToClipboard(fileCache, true);
        }
    };

    onOpenShortcuts = (): void => {
        this.appState.isShortcutsOpen = true;
    };

    onOpenPrefs = (): void => {
        this.appState.isPrefsOpen = true;
    };

    onReloadFileView = (): void => {
        if (this.appState.isExplorer) {
            console.log('reloading view' /*, this.state.activeView*/);
            this.appState.refreshActiveView(/*this.state.activeView*/);
        } else {
            console.log('downloads active, no refresh');
        }
    };

    onOpenTerminal = async (_: string, data: { viewId: number; tabIndex: number }) => {
        let cache: FileState;

        if (!data || typeof data.viewId === 'undefined') {
            cache = this.getActiveFileCache();
        } else {
            const winState = this.appState.winStates[0];
            const view = winState.views[data.viewId];
            cache = view.caches[data.tabIndex];
        }

        if (cache.status !== 'ok' || cache.error) {
            return;
        }

        const isOverlayOpen = document.body.classList.contains('bp3-overlay-open');

        if (cache && !isOverlayOpen && !isEditable(document.activeElement)) {
            const resolvedPath = cache.getAPI().resolve(cache.path);
            const { settingsState, t } = this.injected;
            const terminalCmd = settingsState.getTerminalCommand(resolvedPath);
            const error = await cache.openTerminal(terminalCmd);
            if (error) {
                AppToaster.show({
                    message: t('ERRORS.OPEN_TERMINAL_FAILED'),
                    icon: 'warning-sign',
                    intent: Intent.WARNING,
                    timeout: 0,
                });
            }
        }
    };

    cycleTab = (direction: 1 | -1): void => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0];
            const viewState = winState.getActiveView();
            viewState.cycleTab(direction);
        }
    };

    onNextTab = (): void => {
        this.cycleTab(1);
    };

    onPreviousTab = (): void => {
        this.cycleTab(-1);
    };

    onNewTab = (): void => {
        if (this.appState.isExplorer) {
            const { settingsState } = this.injected;
            const winState = this.appState.winStates[0];
            const viewState = winState.getActiveView();
            viewState.addCache(settingsState.defaultFolder, viewState.getVisibleCacheIndex() + 1, true);
            console.log('need to create a new tab');
        }
    };

    onCloseTab = (): void => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0];
            const viewState = winState.getActiveView();
            const activeTabIndex = viewState.getVisibleCacheIndex();
            viewState.closeTab(activeTabIndex);
        }
    };

    onToggleSplitView = (): void => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0];
            winState.toggleSplitViewMode();
        }
    };

    onForward = (): void => {
        const cache = this.getActiveFileCache();
        cache && cache.navHistory(1);
    };

    onBack = (): void => {
        const cache = this.getActiveFileCache();
        cache && cache.navHistory(-1);
    };

    onParent = (): void => {
        const cache = this.getActiveFileCache();

        !isEditable(document.activeElement) && cache && cache.openParentDirectory();
    };

    renderMenuAccelerators(): React.ReactElement {
        return (
            <Accelerators>
                <Accelerator combo="CmdOrCtrl+Shift+C" onClick={this.onCopyPath}></Accelerator>
                <Accelerator combo="CmdOrCtrl+Shift+N" onClick={this.onCopyFilename}></Accelerator>
                <Accelerator combo="CmdOrCtrl+S" onClick={this.onOpenShortcuts}></Accelerator>
                <Accelerator combo="CmdOrCtrl+," onClick={this.onOpenPrefs}></Accelerator>
                <Accelerator combo="CmdOrCtrl+R" onClick={this.onReloadFileView}></Accelerator>
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
            </Accelerators>
        );
    }

    render(): JSX.Element {
        return null;
    }
}

const MenuAccelerators = withNamespaces()(MenuAcceleratorsClass);

export { MenuAccelerators };
