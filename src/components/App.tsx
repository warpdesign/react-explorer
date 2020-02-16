import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { platform } from "process";
import { FocusStyleManager, Alert, Classes, Intent } from "@blueprintjs/core";
import classNames from "classnames";
import { Provider, observer, inject } from "mobx-react";
import { SideView } from "./SideView";
import { LogUI, Logger } from "./Log";
import { Downloads } from "./Downloads";
import * as drivelist from "drivelist";
import { remote, ipcRenderer } from "electron";
import { withNamespaces, WithNamespaces, Trans } from "react-i18next";
import { AppToaster } from "./AppToaster";
import { Nav } from "./Nav";
import { i18next } from "../locale/i18n";
import { FileState } from "../state/fileState";
import { SettingsState } from "../state/settingsState";
import { PrefsDialog } from "./dialogs/PrefsDialog";
import { ShortcutsDialog } from "./dialogs/ShortcutsDialog";
import { LeftPanel } from "./LeftPanel";
import { shouldCatchEvent } from "../utils/dom";
import { sendFakeCombo } from "./WithMenuAccelerators";
import { isPackage, isWin } from "../utils/platform";
import { ViewDescriptor } from "./TabList";
import { getLocalizedError } from "../locale/error";
import { MenuAccelerators } from "./shortcuts/MenuAccelerators";
import { KeyboardHotkeys } from "./shortcuts/KeyboardHotkeys";

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");
require("../css/windows.css");
require("../css/scrollbars.css");

interface AppProps extends WithNamespaces {
    initialSettings: {[key: string]: any};
}

interface InjectedProps extends AppProps {
    settingsState: SettingsState;
}

enum KEYS {
    TAB = 9
}

declare var ENV: any;

declare global {
    interface Window {
        appState: AppState;
        settingsState: SettingsState;
        remote: any;
        drivelist:any;
    }
}

@inject("settingsState")
@observer
class App extends React.Component<AppProps> {
    private appState: AppState;

    private get injected() {
        return this.props as InjectedProps;
    }

    constructor(props: AppProps) {
        super(props);

        const { settingsState } = this.injected;

        console.log('App:constructor', props.initialSettings);

        this.state = {};

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        // TODO: in the future this should be stored somewhere and not hardcoded
        const path = settingsState.defaultFolder;
        // This is hardcoded for now but could be saved and restored
        // each time the app is started
        // NOTE: we always create two views with one tab each,
        // even if splitView is not set: this could be improved
        // and the view would need to be created on the fly
        const defaultViews: Array<ViewDescriptor> = [
            { viewId: 0, path: path },
            { viewId: 1, path: path }
        ];

        this.appState = new AppState(defaultViews, {
            splitView: props.initialSettings.splitView
        });

        if (ENV.CY) {
            window.appState = this.appState;
            window.settingsState = settingsState;
            window.remote = remote;
            window.drivelist = drivelist;
        }

        Logger.success(
            `React-Explorer ${ENV.VERSION} - CY: ${ENV.CY} - NODE_ENV: ${ENV.NODE_ENV} - lang: ${i18next.language}`
        );
        Logger.success(`hash=${ENV.HASH}`);
        Logger.success(
            `lang=${settingsState.lang}, darkMode=${settingsState.darkMode}, defaultFolder=${settingsState.defaultFolder}`
        );
        Logger.success(`package=${isPackage}`);
    }

    onShortcutsCombo = (e: KeyboardEvent) => {
        // Little hack to prevent pressing tab key from focus an element:
        // we prevent the propagation of the tab key keydown event
        // but this will then prevent the menu accelerators from working
        // so we simply send a fakeCombo to avoid that.
        // We could simply disable outline using css but we want to keep
        // the app accessible.
        if (e.ctrlKey && e.keyCode === KEYS.TAB) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            const combo = e.shiftKey ? "Ctrl+Shift+Tab" : "Ctrl+Tab";
            sendFakeCombo(combo);
        } else if (shouldCatchEvent(e) && e.which === 191 && e.shiftKey) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    };

    onCopyEvent = (e: Event) => {
        console.log("copied event received!");
        if (shouldCatchEvent(e)) {
            this.onCopy();
        }
    };

    onPasteEvent = (e: Event) => {
        console.log("paste event received!");
        if (shouldCatchEvent(e)) {
            this.onPaste();
        }
    };

    addListeners() {
        // prevent builtin hotkeys dialog from opening: there are numerous problems with it
        document.addEventListener("keydown", this.onShortcutsCombo, true);
        // we need to listen to paste event because when selecting the copy/paste menuItem,
        // Electron won't call the menuItem.onClick event
        document.addEventListener("copy", this.onCopyEvent);
        document.addEventListener("paste", this.onPasteEvent);
        // sent when the window has been closed
        ipcRenderer.on("exitRequest", (e: Event) => this.onExitRequest());
    }

    showDownloadsTab = () => {
        this.appState.showDownloadsTab();
    };

    showExplorerTab = () => {
        this.appState.showExplorerTab();
    };

    setActiveView(view: number) {
        const winState = this.appState.winStates[0];
        winState.setActiveView(view);
    }

    /**
     * stop click propagation in case click happens on an inactive sideview:
     * this prevents doing unwanted actions like selected elements when the
     * user simply wants to activate an inactive sideview
     */
    handleClick = (e: React.MouseEvent) => {
        const sideview = (e.target as HTMLElement).closest(".sideview");
        const filetable = (e.target as HTMLElement).closest(
            ".fileListSizerWrapper"
        );

        if (sideview) {
            const num = parseInt(sideview.id.replace("view_", ""), 10);
            const winState = this.appState.winStates[0];
            const view = winState.getView(num);
            if (!view.isActive) {
                // prevent selecting a row when the view gets activated
                if (filetable) {
                    console.log("preventing event propagation", e.target);
                    e.stopPropagation();
                }
                this.setActiveView(num);
            }
        }
    };

    onExitComboDown = () => {
        this.onExitRequest();
    };

    onExitRequest = () => {
        console.log("exitRequest");
        if (this.appState && this.appState.pendingTransfers) {
            this.setState({ isExitDialogOpen: true });
        } else {
            console.log("sending readyToExit event");
            ipcRenderer.send("readyToExit");
        }
    };

    componentDidMount() {
        // listen for events from main electron process as well as webview
        this.addListeners();
        this.setDarkThemeClass();
        this.setPlatformClass();
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.onShortcutsCombo);
        document.removeEventListener("copy", this.onCopyEvent);
        document.removeEventListener("paste", this.onPasteEvent);
        ipcRenderer.removeAllListeners("exitRequest");
    }

    componentDidUpdate() {
        this.setDarkThemeClass();

        if (!ENV.CY) {
            const progress =
                (this.appState.pendingTransfers &&
                    this.appState.totalTransferProgress) ||
                -1;
            remote.getCurrentWindow().setProgressBar(progress);
        }
    }

    onExitDialogClose = (valid: boolean) => {
        this.appState.isExitDialogOpen = false;
        if (!valid) {
            this.showDownloadsTab();
        } else {
            ipcRenderer.send("readyToExit");
        }
    };

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

    onCopy = () => {
        const fileCache: FileState = this.getActiveFileCache();

        if (fileCache) {
            const { t } = this.injected;
            const num = this.appState.setClipboard(fileCache);

            AppToaster.show(
                {
                    message: t("COMMON.CP_COPIED", { count: num }),
                    icon: "tick",
                    intent: Intent.NONE
                },
                undefined,
                true
            );
        }
    };

    private onPaste = (): void => {
        const fileCache: FileState = this.getActiveFileCache();
        const appState = this.appState;

        if (fileCache && !fileCache.error && appState.clipboard.files.length) {
            this.appState
                .prepareClipboardTransferTo(fileCache)
                .then((noErrors: any) => {
                    const { t } = this.injected;
                    if (noErrors) {
                        AppToaster.show({
                            message: t("COMMON.COPY_FINISHED"),
                            icon: "tick",
                            intent: Intent.SUCCESS,
                            timeout: 3000
                        });
                    } else {
                        AppToaster.show({
                            message: t("COMMON.COPY_WARNING"),
                            icon: "warning-sign",
                            intent: Intent.WARNING,
                            timeout: 5000
                        });
                    }
                })
                .catch((err: any) => {
                    const { t } = this.injected;
                    const localizedError = getLocalizedError(err);
                    const message = err.code
                        ? t("ERRORS.COPY_ERROR", {
                              message: localizedError.message
                          })
                        : t("ERRORS.COPY_UNKNOWN_ERROR");

                    AppToaster.show({
                        message: message,
                        icon: "error",
                        intent: Intent.DANGER,
                        timeout: 5000
                    });
                });
        }
    };

    closePrefs = () => {
        this.appState.isPrefsOpen = false;
    };

    closeShortcuts = () => {
        this.appState.isShortcutsOpen = false;
    };

    setDarkThemeClass() {
        const { settingsState } = this.injected;
        if (settingsState.isDarkModeActive) {
            document.body.classList.add(Classes.DARK);
        } else {
            document.body.classList.remove(Classes.DARK);
        }
    }

    setPlatformClass() {
        if (isWin) {
            document.body.classList.add("windows");
        }
    }

    render() {
        const {
            isPrefsOpen,
            isShortcutsOpen,
            isExitDialogOpen
        } = this.appState;
        const { settingsState } = this.injected;
        const isExplorer = this.appState.isExplorer;
        const count = this.appState.pendingTransfers;
        const { t } = this.props;
        const winState = this.appState.winStates[0];
        const isSplitView = winState.splitView;
        const mainClass = classNames(`main ${platform}`, {
            singleView: !isSplitView,
            dualView: isSplitView
        });
        const viewStateLeft = winState.views[0];
        const viewStateRight = winState.views[1];

        // Access isDarkModeActive without modifying it to make mobx trigger the render
        // when isDarkModeActive is modified.

        // We could modify the body's class from here but it's a bad pratice so we
        // do it in componentDidUpdate/componentDidMount instead
        settingsState.isDarkModeActive;

        return (
            <Provider appState={this.appState}>
                <React.Fragment>
                    <Alert
                        cancelButtonText={t("DIALOG.QUIT.BT_KEEP_TRANSFERS")}
                        confirmButtonText={t("DIALOG.QUIT.BT_STOP_TRANSFERS")}
                        icon="warning-sign"
                        intent={Intent.WARNING}
                        onClose={this.onExitDialogClose}
                        isOpen={isExitDialogOpen}
                    >
                        <p>
                            <Trans i18nKey="DIALOG.QUIT.CONTENT" count={count}>
                                There are <b>{{ count }}</b> transfers{" "}
                                <b>in progress</b>.<br />
                                <br />
                                Exiting the app now will <b>cancel</b> the
                                downloads.
                            </Trans>
                        </p>
                    </Alert>
                    <PrefsDialog
                        isOpen={isPrefsOpen}
                        onClose={this.closePrefs}
                    ></PrefsDialog>
                    <ShortcutsDialog
                        isOpen={isShortcutsOpen}
                        onClose={this.closeShortcuts}
                    ></ShortcutsDialog>
                    <MenuAccelerators onExitComboDown={this.onExitComboDown} />
                    <KeyboardHotkeys />
                    <Nav></Nav>
                    <div onClickCapture={this.handleClick} className={mainClass}>
                        <LeftPanel hide={!isExplorer}></LeftPanel>
                        <SideView
                            viewState={viewStateLeft}
                            hide={!isExplorer}
                            onPaste={this.onPaste}
                        />
                        <SideView
                            viewState={viewStateRight}
                            hide={!isExplorer || !isSplitView}
                            onPaste={this.onPaste}
                        />
                        <Downloads hide={isExplorer} />
                    </div>
                    <LogUI></LogUI>
                </React.Fragment>
            </Provider>
        );
    }
}

const ExplorerApp = withNamespaces()(App);

export { ExplorerApp };
