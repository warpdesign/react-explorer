import * as React from "react";
import * as ReactDOM from "react-dom";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { Intent } from "@blueprintjs/core";
import { inject } from "mobx-react";
import {
    WithMenuAccelerators,
    Accelerators,
    Accelerator
} from "../WithMenuAccelerators";
import { isEditable } from "../../utils/dom";
import { AppState } from "../../state/appState";
import { FileState } from "../../state/fileState";
import { AppToaster } from "../AppToaster";
import { SettingsState } from "../../state/settingsState";

interface IProps extends WithNamespaces {
    onExitComboDown: () => void;
}

interface InjectedProps extends IProps {
    appState: AppState;
    settingsState: SettingsState;
}

@inject("appState", "settingsState")
@WithMenuAccelerators
class MenuAcceleratorsClass extends React.Component<IProps> {
    private appState: AppState;

    private get injected() {
        return this.props as InjectedProps;
    }

    constructor(props: IProps) {
        super(props);

        this.appState = this.injected.appState;
    }

    copyTextToClipboard(fileCache: FileState, filesOnly = false) {
        const length = fileCache.selected.length;

        this.appState.copySelectedItemsPath(fileCache, filesOnly);

        if (length) {
            const { t } = this.injected;
            AppToaster.show(
                {
                    message: filesOnly
                        ? t("COMMON.CP_NAMES_COPIED", { count: length })
                        : t("COMMON.CP_PATHS_COPIED", { count: length }),
                    icon: "tick",
                    intent: Intent.NONE
                },
                undefined,
                true
            );
        }
    }

    private getActiveFileCache(ignoreStatus = false): FileState {
        const state = this.appState.getActiveCache();

        if (ignoreStatus || !state) {
            return state;
        } else {
            return ignoreStatus
                ? state
                : (state.status === "ok" && state) || null;
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

    onReloadFileView = () => {
        if (this.appState.isExplorer) {
            console.log("reloading view" /*, this.state.activeView*/);
            this.appState.refreshActiveView(/*this.state.activeView*/);
        } else {
            console.log("downloads active, no refresh");
        }
    };

    onOpenTerminal = (_: string, data: any) => {
        let cache: FileState;

        if (typeof data.viewId === "undefined") {
            cache = this.getActiveFileCache();
        } else {
            const winState = this.appState.winStates[0];
            const view = winState.views[data.viewId];
            cache = view.caches[data.tabIndex];
            if (cache.status !== "ok") {
                cache = null;
            }
        }

        const isOverlayOpen = document.body.classList.contains(
            "bp3-overlay-open"
        );

        if (cache && !isOverlayOpen && !isEditable(document.activeElement)) {
            const resolvedPath = cache.getAPI().resolve(cache.path);
            const { settingsState } = this.injected;
            const terminalCmd = settingsState.getTerminalCommand(resolvedPath);
            cache.openTerminal(terminalCmd);
        }
    };

    cycleTab = (direction: 1|-1) => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0];
            const viewState = winState.getActiveView();
            viewState.cycleTab(direction);
        }
    }

    onNextTab = () => {
        this.cycleTab(1);
    };

    onPreviousTab = () => {
        this.cycleTab(-1);
    };

    onNewTab = () => {
        if (this.appState.isExplorer) {
            const { settingsState } = this.injected;
            const winState = this.appState.winStates[0];
            const viewState = winState.getActiveView();
            viewState.addCache(
                settingsState.defaultFolder,
                viewState.getVisibleCacheIndex() + 1,
                true
            );
            console.log("need to create a new tab");
        }
    };

    onCloseTab = () => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0];
            const viewState = winState.getActiveView();
            const activeTabIndex = viewState.getVisibleCacheIndex();
            viewState.closeTab(activeTabIndex);
        }
    };

    onToggleSplitView = () => {
        if (this.appState.isExplorer) {
            const winState = this.appState.winStates[0];
            winState.toggleSplitViewMode();
        }
    }

    renderMenuAccelerators() {
        return (
            <Accelerators>
                <Accelerator
                    combo="CmdOrCtrl+Shift+C"
                    onClick={this.onCopyPath}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+Shift+N"
                    onClick={this.onCopyFilename}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+S"
                    onClick={this.onOpenShortcuts}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+,"
                    onClick={this.onOpenPrefs}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+R"
                    onClick={this.onReloadFileView}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+Q"
                    onClick={this.props.onExitComboDown}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+K"
                    onClick={this.onOpenTerminal}
                ></Accelerator>
                <Accelerator
                    combo="Ctrl+Tab"
                    onClick={this.onNextTab}
                ></Accelerator>
                <Accelerator
                    combo="Ctrl+Shift+Tab"
                    onClick={this.onPreviousTab}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+T"
                    onClick={this.onNewTab}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+W"
                    onClick={this.onCloseTab}
                ></Accelerator>
                <Accelerator
                    combo="CmdOrCtrl+Shift+Alt+V"
                    onClick={this.onToggleSplitView}
                ></Accelerator>
            </Accelerators>
        );
    }

    render(): JSX.Element {
        return null;
    }
}

const MenuAccelerators = withNamespaces()(MenuAcceleratorsClass);

export { MenuAccelerators };
