import * as React from "react";
import * as ReactDOM from "react-dom";
import { withNamespaces, WithNamespaces } from "react-i18next";
import { ipcRenderer } from "electron";
import {
    Intent,
    HotkeysTarget,
    Hotkeys,
    Hotkey,
    IHotkeysProps
} from "@blueprintjs/core";
import { inject } from "mobx-react";
import { AppState } from "../../state/appState";
import { FileState } from "../../state/fileState";
import { AppToaster } from "../AppToaster";
import { SettingsState } from "../../state/settingsState";
import { Logger } from "../Log";
import { isMac } from "../../utils/platform";

interface InjectedProps extends WithNamespaces {
    appState: AppState;
    settingsState: SettingsState;
}

@inject("appState", "settingsState")
@HotkeysTarget
class KeyboardHotkeysClass extends React.Component<WithNamespaces> {
    private appState: AppState;

    private get injected() {
        return this.props as InjectedProps;
    }

    constructor(props: WithNamespaces) {
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
    onShowDownloadsTab = () => {
        this.appState.showDownloadsTab();
    };

    onShowExplorerTab = () => {
        this.appState.showExplorerTab();
    };

    onNextView = () => {
        const nextView = this.appState.getActiveView(false);

        this.appState.setActiveView(nextView.viewId);
    };

    onBackwardHistory = () => {
        const cache = this.getActiveFileCache();
        console.log("onBackwardHistory");
        if (cache) {
            console.log("if cache");
            cache.navHistory(-1);
        }
    };

    onForwardHistory = () => {
        const cache = this.getActiveFileCache();
        console.log("onForwardHistory");
        if (cache) {
            console.log("if cache");
            cache.navHistory(1);
        }
    };

    onOpenDevTools = () => {
        ipcRenderer.send("openDevTools");
    };

    onShowHistory = () => {
        const fileCache: FileState = this.getActiveFileCache(true);

        if (fileCache && fileCache.status === "ok") {
            console.log("showHistory");
            fileCache.history.forEach((path, i) => {
                let str = (fileCache.current === i && path + " *") || path;
                Logger.log(str);
            });
        }
    };

    onDebugCache = () => {
        // let i = 0;
        // for (let cache of this.appState.views[0].caches) {
        const cache = this.getActiveFileCache();
        console.log("====");
        console.log("cache selected length", cache.selected.length);
        console.log("cache.selectedId", cache.selectedId);
        console.log("cache.editingId", cache.editingId);
        console.log("===");
        console.log(cache.selected);
        console.log(cache);
        // }
    };

    public renderHotkeys(): React.ReactElement<IHotkeysProps> {
        const t = this.props.t;

        return (
            <Hotkeys>
                <Hotkey
                    global={true}
                    combo="alt + mod + l"
                    label={t("SHORTCUT.MAIN.DOWNLOADS_TAB")}
                    onKeyDown={this.onShowDownloadsTab}
                />

                <Hotkey
                    global={true}
                    combo="alt + mod + e"
                    label={t("SHORTCUT.MAIN.EXPLORER_TAB")}
                    onKeyDown={this.onShowExplorerTab}
                />
                <Hotkey
                    global={true}
                    combo="ctrl + shift + right"
                    label={t("SHORTCUT.MAIN.NEXT_VIEW")}
                    onKeyDown={this.onNextView}
                />
                <Hotkey
                    global={true}
                    combo="ctrl + shift + left"
                    label={t("SHORTCUT.MAIN.PREVIOUS_VIEW")}
                    onKeyDown={this.onNextView}
                />
                {isMac && (
                    <Hotkey
                        global={true}
                        combo="mod + left"
                        label={t("SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY")}
                        onKeyDown={this.onBackwardHistory}
                    />
                )}
                {!isMac && (
                    <Hotkey
                        global={true}
                        combo="alt + left"
                        label={t("SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY")}
                        onKeyDown={this.onBackwardHistory}
                    />
                )}
                {isMac && (
                    <Hotkey
                        global={true}
                        combo="mod + right"
                        label={t("SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY")}
                        onKeyDown={this.onForwardHistory}
                    />
                )}
                {!isMac && (
                    <Hotkey
                        global={true}
                        combo="alt + right"
                        label={t("SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY")}
                        onKeyDown={this.onForwardHistory}
                    />
                )}
                <Hotkey
                    global={true}
                    combo="alt + mod + i"
                    label={t("SHORTCUT.OPEN_DEVTOOLS")}
                    onKeyDown={this.onOpenDevTools}
                />
                {/* debug only shortcuts */}
                <Hotkey
                    global={true}
                    combo="mod + h"
                    label={t("SHORTCUT.ACTIVE_VIEW.VIEW_HISTORY")}
                    preventDefault={true}
                    onKeyDown={this.onShowHistory}
                    group={t("SHORTCUT.GROUP.ACTIVE_VIEW")}
                />
                <Hotkey
                    global={true}
                    combo="mod + p"
                    label="view cache"
                    preventDefault={true}
                    onKeyDown={this.onDebugCache}
                    group={t("SHORTCUT.GROUP.ACTIVE_VIEW")}
                />
            </Hotkeys>
        ) as React.ReactElement<IHotkeysProps>;
    }

    render(): JSX.Element {
        // we need to render something otherwise hotkeys won't work
        return <div />;
    }
}

const KeyboardHotkeys = withNamespaces()(KeyboardHotkeysClass);

export { KeyboardHotkeys };
