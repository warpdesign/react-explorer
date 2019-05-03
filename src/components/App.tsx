import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager, Icon, HotkeysTarget, Hotkeys, Hotkey, Alert, Popover, Classes } from "@blueprintjs/core";
import { Provider, observer, inject } from "mobx-react";
import { Navbar, Alignment, Button, Intent } from "@blueprintjs/core";
import { SideView } from "./SideView";
import { LogUI, Logger } from "./Log";
import { Downloads } from "./Downloads";
import { Badge } from "./Badge";
import { ipcRenderer } from "electron";
import { withNamespaces, WithNamespaces, Trans } from 'react-i18next';
import { AppToaster } from "./AppToaster";
import i18next from '../locale/i18n';
import { FileState } from "../state/fileState";
import { SettingsState } from "../state/settingsState";
import { PrefsDialog } from "./dialogs/PrefsDialog";
import { HamburgerMenu } from "./HamburgerMenu";
import { ShortcutsDialog } from "./dialogs/ShortcutsDialog";
import { shouldCatchEvent, isEditable } from "../utils/dom";
import { WithMenuAccelerators, Accelerators, Accelerator } from "./WithMenuAccelerators";
import { remote } from 'electron';
import { isPackage } from '../utils/platform';
import { TabDescriptor } from "./TabList";

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    isPrefsOpen: boolean;
    isShortcutsOpen: boolean;
    isExitDialogOpen: boolean;
}

interface InjectedProps extends WithNamespaces {
    settingsState: SettingsState
}

const EXIT_DELAY = 1200;
const KEY_Q = 81;
const UP_DELAY = 130;

declare var ENV: any;

declare global {
    interface Window {
        appState: AppState;
    }
}

@inject('settingsState')
@observer
@WithMenuAccelerators
@HotkeysTarget
class App extends React.Component<WithNamespaces, IState> {
    private appState: AppState;
    private lastTimeStamp: any = 0;
    private exitTimeout: any = 0;
    private exitMode = false;

    private get injected() {
        return this.props as InjectedProps;
    }

    constructor(props: WithNamespaces) {
        super(props);

        const { settingsState } = this.injected;

        this.state = { isExitDialogOpen: false, isPrefsOpen: false, isShortcutsOpen: false };

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        const path = settingsState.defaultFolder;
        // this is hardcoded for now but could be saved and restored
        // each time the app is started
        // one tab for each view with the same default folder
        const defaultTabs: Array<TabDescriptor> = [
            { viewId: 0, path: path },
            { viewId: 1, path: path }
        ]

        this.appState = new AppState(defaultTabs);

        if (ENV.CY) {
            window.appState = this.appState;
        }

        Logger.success(`React-Explorer ${ENV.VERSION} - CY: ${ENV.CY} - NODE_ENV: ${ENV.NODE_ENV} - lang: ${i18next.language}`);
        Logger.success(`hash=${ENV.HASH}`);
        Logger.success(`lang=${settingsState.lang}, darkMode=${settingsState.darkMode}, defaultFolder=${settingsState.defaultFolder}`);
        Logger.success(`package=${isPackage}`);
    }

    onShortcutsCombo = (e: KeyboardEvent) => {
        if (shouldCatchEvent(e) && e.which === 191 && e.shiftKey) {
            console.log('stopPropagation');
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    onCopyEvent = (e: Event) => {
        console.log('copied event received!');
        if (shouldCatchEvent(e)) {
            this.onCopy();
        }
    }

    onPasteEvent = (e: Event) => {
        console.log('paste event received!');
        if (shouldCatchEvent(e)) {
            this.onPaste();
        }
    }

    addListeners() {
        // prevent builtin hotkeys dialog from opening: there are numerous problems with it
        document.addEventListener('keydown', this.onShortcutsCombo, true);
        // we need to listen to paste event because when selecting the copy/paste menuItem,
        // Electron won't call the menuItem.onClick event
        document.addEventListener('copy', this.onCopyEvent);
        document.addEventListener('paste', this.onPasteEvent);
        // sent when the window has been closed
        ipcRenderer.on('exitRequest', (e: Event) => this.onExitRequest());
    }

    showDownloadsTab = () => {
        this.appState.isExplorer = false;
    }

    showExplorerTab = () => {
        this.appState.isExplorer = true;
    }

    navClick = () => {
        if (this.appState.isExplorer) {
            this.showDownloadsTab();
        } else {
            this.showExplorerTab();
        }
    }

    setActiveView(view: number) {
        this.appState.setActiveView(view);
    }

    handleClick = (e: React.MouseEvent) => {
        const sideview = (e.target as HTMLElement).closest('.sideview');
        const filetable = (e.target as HTMLElement).closest('.fileListSizerWrapper');

        if (sideview) {
            const num = parseInt(sideview.id.replace('view_', ''), 10);
            const view = this.appState.getView(num);
            if (!view.isActive) {
                // prevent selecting a row when the view gets activated
                if (filetable) {
                    console.log('preventing event propagation', e.target);
                    e.stopPropagation();
                }
                this.setActiveView(num);
            }
        }
    }

    onExitComboDown = () => {
        this.onExitRequest();
    }

    onExitRequest = () => {
        console.log('exitRequest');
        if (this.appState && this.appState.pendingTransfers) {
            this.setState({ isExitDialogOpen: true });
        } else {
            console.log('sending readyToExit event');
            ipcRenderer.send('readyToExit');
        }
    }

    // onExitComboDownMac = (e: KeyboardEvent) => {
    //     const { t } = this.props;

    //     if (!this.exitMode && e.keyCode === KEY_Q && e.metaKey) {
    //         const shouldCancel = this.onExitRequest();

    //         if (!shouldCancel) {
    //             // check transfers
    //             this.lastTimeStamp = new Date().getTime();

    //             ipcRenderer.send('exitWarning', t('MAIN_PROCESS.PRESS_TO_EXIT'));

    //             this.exitTimeout = setTimeout(() => {
    //                 const currentTimeout = new Date().getTime();
    //                 if (this.exitMode && (currentTimeout - this.lastTimeStamp <= UP_DELAY)) {
    //                     this.exitMode = false;
    //                     ipcRenderer.send('exit');
    //                 } else {
    //                     ipcRenderer.send('endExitWarning');
    //                     this.exitMode = false;
    //                 }
    //             }, EXIT_DELAY);

    //             this.exitMode = true;
    //         }
    //     } else if (e.keyCode === KEY_Q && this.exitMode) {
    //         this.lastTimeStamp = new Date().getTime();
    //     }
    // }

    onNextView = () => {
        const nextView = this.appState.getActiveView(false);
        // const nextView = this.appState.caches[0].active ? 1 : 0;

        this.setActiveView(nextView.viewId);
    }

    componentDidMount() {
        // listen for events from main process
        this.addListeners();
        this.setDarkTheme();
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onShortcutsCombo);
        document.removeEventListener('copy', this.onCopyEvent);
        document.removeEventListener('paste', this.onPasteEvent);
        ipcRenderer.removeAllListeners('exitRequest');
    }

    componentDidUpdate() {
        const progress = this.appState.pendingTransfers && this.appState.totalTransferProgress || -1;
        this.setDarkTheme();
        console.log('progress', progress);
        remote.getCurrentWindow().setProgressBar(progress);
    }

    onExitDialogClose = (valid: boolean) => {
        this.setState({ isExitDialogOpen: false });
        if (!valid) {
            this.showDownloadsTab();
        } else {
            ipcRenderer.send('readyToExit');
        }
    }

    onReloadFileView = () => {
        if (this.appState.isExplorer) {
            console.log('reloading view'/*, this.state.activeView*/);
            this.appState.refreshActiveView(/*this.state.activeView*/);
        } else {
            console.log('downloads active, no refresh');
        }
    }

    onNextTab = () => {
        if (this.appState.isExplorer) {
            const viewState = this.appState.getActiveView();
            viewState.cycleTab(1);
        }
    }

    onPreviousTab = () => {
        if (this.appState.isExplorer) {
            const viewState = this.appState.getActiveView();
            viewState.cycleTab(-1);
        }
    }

    onNewTab = () => {
        if (this.appState.isExplorer) {
            const { settingsState } = this.injected;
            const viewState = this.appState.getActiveView();
            viewState.addCache(settingsState.defaultFolder, viewState.getVisibleCacheIndex() + 1, true);
            console.log('need to create a new tab');
        }
    }

    onCloseTab = () => {
        if (this.appState.isExplorer) {
            const viewState = this.appState.getActiveView();
            const activeTabIndex = viewState.getVisibleCacheIndex();
            viewState.closeTab(activeTabIndex);
        }
    }

    renderMenuAccelerators() {
        return <Accelerators>
            <Accelerator combo="CmdOrCtrl+Shift+C" onClick={this.onCopyPath}></Accelerator>
            <Accelerator combo="CmdOrCtrl+Shift+N" onClick={this.onCopyFilename}></Accelerator>
            <Accelerator combo="CmdOrCtrl+S" onClick={this.onOpenShortcuts}></Accelerator>
            <Accelerator combo="CmdOrCtrl+," onClick={this.onOpenPrefs}></Accelerator>
            <Accelerator combo="CmdOrCtrl+R" onClick={this.onReloadFileView}></Accelerator>
            <Accelerator combo="CmdOrCtrl+Q" onClick={this.onExitComboDown}></Accelerator>
            <Accelerator combo="CmdOrCtrl+K" onClick={this.onOpenTerminal}></Accelerator>
            <Accelerator combo="Ctrl+Tab" onClick={this.onNextTab}></Accelerator>
            <Accelerator combo="Ctrl+Shift+Tab" onClick={this.onPreviousTab}></Accelerator>
            <Accelerator combo="CmdOrCtrl+T" onClick={this.onNewTab}></Accelerator>
            <Accelerator combo="CmdOrCtrl+W" onClick={this.onCloseTab}></Accelerator>
        </Accelerators>;
    }

    public renderHotkeys() {
        const t = this.props.t;

        return <Hotkeys>
            <Hotkey
                global={true}
                combo="alt + mod + l"
                label={t('SHORTCUT.MAIN.DOWNLOADS_TAB')}
                onKeyDown={this.showDownloadsTab}
            />

            <Hotkey
                global={true}
                combo="alt + mod + e"
                label={t('SHORTCUT.MAIN.EXPLORER_TAB')}
                onKeyDown={this.showExplorerTab}
            />
            <Hotkey
                global={true}
                combo="ctrl + alt + right"
                label={t('SHORTCUT.MAIN.NEXT_VIEW')}
                onKeyDown={this.onNextView}
            />
            <Hotkey
                global={true}
                combo="ctrl + alt + left"
                label={t('SHORTCUT.MAIN.PREVIOUS_VIEW')}
                onKeyDown={this.onNextView}
            />
            {/* <Hotkey
                global={true}
                combo="mod + r"
                label={t('SHORTCUT.MAIN.RELOAD_VIEW')}
                preventDefault={true}
                onKeyDown={this.onReloadFileView}
            /> */}
            <Hotkey
                global={true}
                combo="alt + left"
                label={t('SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY')}
                onKeyDown={this.backwardHistory}
            />
            <Hotkey
                global={true}
                combo="alt + right"
                label={t('SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY')}
                onKeyDown={this.forwardHistory}
            />
            <Hotkey
                global={true}
                combo="alt + mod + i"
                label={t('SHORTCUT.OPEN_DEVTOOLS')}
                onKeyDown={this.openDevTools}
            />
            {/* <Hotkey
                global={true}
                combo="mod + k"
                label={t('SHORTCUT.ACTIVE_VIEW.OPEN_TERMINAL')}
                onKeyDown={this.onOpenTerminal}
            /> */}
            {/* {isMac && (<Hotkey
                global={true}
                combo="q"
                label={t('SHORTCUT.MAIN.QUIT')}
                onKeyDown={this.onExitComboDownMac}
            />)}
            {isMac && (<Hotkey
                global={true}
                combo="mod + q"
                label={t('SHORTCUT.MAIN.QUIT')}
                onKeyDown={this.onExitComboDownMac}
            />)} */}
            {/* <Hotkey
                global={true}
                combo="mod + shift + c"
                label={t('SHORTCUT.ACTIVE_VIEW.COPY_PATH')}
                onKeyDown={this.onCopyPath}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey>
            <Hotkey
                global={true}
                combo="mod + shift + n"
                label={t('SHORTCUT.ACTIVE_VIEW.COPY_FILENAME')}
                onKeyDown={this.onCopyFilename}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}>
            </Hotkey> */}
            {/* <Hotkey
                global={true}
                combo="meta + c"
                label={t('SHORTCUT.ACTIVE_VIEW.COPY')}
                onKeyDown={this.onCopy}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            />
            <Hotkey
                global={true}
                combo="meta + v"
                label={t('SHORTCUT.ACTIVE_VIEW.PASTE')}
                onKeyDown={this.onPaste}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            /> */}
            <Hotkey
                global={true}
                combo="mod + h"
                label={t('SHORTCUT.ACTIVE_VIEW.VIEW_HISTORY')}
                preventDefault={true}
                onKeyDown={this.onShowHistory}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            />
            <Hotkey
                global={true}
                combo="mod + p"
                label="view cache"
                preventDefault={true}
                onKeyDown={this.onDebugCache}
                group={t('SHORTCUT.GROUP.ACTIVE_VIEW')}
            />
        </Hotkeys>;
    }

    onDebugCache = () => {
        let i = 0;
        for (let cache of this.appState.views[0].caches) {
            console.log('cache', cache.selected.length, cache.selected);
        }
    }

    backwardHistory = () => {
        const cache = this.getActiveFileCache();
        if (cache) {
            cache.navHistory(-1);
        }
    }

    forwardHistory = () => {
        const cache = this.getActiveFileCache();
        if (cache) {
            cache.navHistory(1);
        }
    }

    openDevTools = () => {
        ipcRenderer.send('openDevTools');
    }

    onOpenTerminal = (combo: string, data: any) => {
        let cache: FileState;

        if (typeof data.viewId === 'undefined') {
            cache = this.getActiveFileCache();
        } else {
            const view = this.appState.views[data.viewId];
            cache = view.caches[data.tabIndex];
            if (cache.status !== 'ok') {
                cache = null;
            }
        }

        const isOverlayOpen = document.body.classList.contains('bp3-overlay-open');

        if (cache && !isOverlayOpen && !isEditable(document.activeElement)) {
            const resolvedPath = cache.getAPI().resolve(cache.path);
            const { settingsState } = this.injected;
            const terminalCmd = settingsState.getTerminalCommand(resolvedPath);
            cache.openTerminal(terminalCmd);
        }
    }

    private getActiveFileCache(ignoreStatus = false): FileState {
        const state = this.appState.getActiveCache();

        if (ignoreStatus || !state) {
            return state;
        } else {
            return ignoreStatus ? state : (state.status === 'ok' && state || null);
        }
    }

    copyTextToClipboard(fileCache: FileState, filesOnly = false) {
        const length = fileCache.selected.length;

        this.appState.copySelectedItemsPath(fileCache, filesOnly);

        if (length) {
            const { t } = this.injected;
            AppToaster.show({
                message: filesOnly ? t('COMMON.CP_NAMES_COPIED', { count: length }) : t('COMMON.CP_PATHS_COPIED', { count: length }),
                icon: "tick",
                intent: Intent.NONE
            }, undefined, true);
        }
    }

    onCopy = () => {
        const fileCache: FileState = this.getActiveFileCache();

        if (fileCache) {
            const { t } = this.injected;
            const num = this.appState.setClipboard(fileCache);

            AppToaster.show({
                message: t('COMMON.CP_COPIED', { count: num }),
                icon: "tick",
                intent: Intent.NONE
            }, undefined, true);
        }
    }

    onCopyPath = (): void => {
        const fileCache = this.getActiveFileCache();
        if (fileCache) {
            this.copyTextToClipboard(fileCache);
        }
    }

    onCopyFilename = (): void => {
        const fileCache = this.getActiveFileCache();
        if (fileCache) {
            this.copyTextToClipboard(fileCache, true);
        }
    }

    private onPaste = (): void => {
        const fileCache: FileState = this.getActiveFileCache();

        if (fileCache) {
            this.appState.prepareClipboardTransferTo(fileCache);
        }
    }

    private onShowHistory = () => {
        const fileCache: FileState = this.getActiveFileCache(true);

        if (fileCache && fileCache.status === 'ok') {
            console.log('showHistory');
            fileCache.history.forEach((path, i) => {
                let str = fileCache.current === i && path + ' *' || path;
                Logger.log(str);
            });
        }
    }

    onOpenPrefs = () => {
        this.setState({
            isPrefsOpen: true
        });
    }

    closePrefs = () => {
        this.setState({
            isPrefsOpen: false
        });
    }

    onOpenShortcuts = () => {
        this.setState({
            isShortcutsOpen: true
        });
    }

    closeShortcuts = () => {
        this.setState({
            isShortcutsOpen: false
        });
    }

    setDarkTheme() {
        const { settingsState } = this.injected;
        if (settingsState.isDarkModeActive) {
            document.body.classList.add(Classes.DARK);
        } else {
            document.body.classList.remove(Classes.DARK);
        }
    }

    render() {
        const { isShortcutsOpen, isPrefsOpen, isExitDialogOpen } = this.state;
        const { settingsState } = this.injected;
        const isExplorer = this.appState.isExplorer;
        const count = this.appState.pendingTransfers;
        const badgeText = count && (count + '') || '';
        const badgeProgress = this.appState.totalTransferProgress;
        const { t } = this.props;
        const viewStateLeft = this.appState.views[0];
        const viewStateRight = this.appState.views[1];
        // const cacheLeft = this.appState.getViewVisibleCache(0);
        // const cacheRight = this.appState.getViewVisibleCache(1);

        // Access isDarkModeActive without modifying it to make mobx trigger the render
        // when isDarkModeActive is modified.
        // We could modify the body's class from here but it's a bad pratice so we
        // do it in componentDidUpdate/componentDidMount instead
        settingsState.isDarkModeActive;

        return (
            <Provider appState={this.appState}>
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
                                There are <b>{{ count }}</b> transfers <b>in progress</b>.<br /><br />Exiting the app now will <b>cancel</b> the downloads.
                            </Trans>
                        </p>
                    </Alert>
                    <PrefsDialog isOpen={isPrefsOpen} onClose={this.closePrefs}></PrefsDialog>
                    <ShortcutsDialog isOpen={isShortcutsOpen} onClose={this.closeShortcuts}></ShortcutsDialog>
                    <Navbar>
                        <Navbar.Group align={Alignment.LEFT}>
                            <Navbar.Heading>{t('APP_MENUS.ABOUT_TITLE')}</Navbar.Heading>
                            <Navbar.Divider />
                            <Button className={Classes.MINIMAL} icon="home" text={t('NAV.EXPLORER')} onClick={this.navClick} intent={isExplorer ? Intent.PRIMARY : 'none'} />
                            <Button style={{ position: 'relative' }} className={Classes.MINIMAL} icon="download" onClick={this.navClick} intent={!isExplorer ? Intent.PRIMARY : 'none'}>{t('NAV.TRANSFERS')}<Badge intent="none" text={badgeText} progress={badgeProgress} /></Button>
                        </Navbar.Group>
                        <Navbar.Group align={Alignment.RIGHT}>
                            <Navbar.Divider />
                            <Popover content={<HamburgerMenu onOpenShortcuts={this.onOpenShortcuts} onOpenPrefs={this.onOpenPrefs} />}>
                                <Button className={Classes.MINIMAL} icon="menu" />
                            </Popover>
                        </Navbar.Group>
                    </Navbar>
                    <div onClickCapture={this.handleClick} className="main">
                        <SideView viewState={viewStateLeft} hide={!isExplorer} onPaste={this.onPaste} />
                        <SideView viewState={viewStateRight} hide={!isExplorer} onPaste={this.onPaste} />
                        <Downloads hide={isExplorer} />
                    </div>
                    <LogUI></LogUI>
                </React.Fragment>
            </Provider>
        );
    }
}

const ReactApp = withNamespaces()(App);

export { ReactApp };
