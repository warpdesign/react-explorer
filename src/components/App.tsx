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

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    isPrefsOpen: boolean;
    isShortcutsOpen: boolean;
    isExitDialogOpen: boolean;
}

interface InjectedProps extends WithNamespaces{
    settingsState:SettingsState
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

        this.appState = new AppState([path, path]);

        if (ENV.CY) {
            window.appState = this.appState;
        }

        Logger.success(`React-FTP ${ENV.VERSION} - CY: ${ENV.CY} - NODE_ENV: ${ENV.NODE_ENV} - lang: ${i18next.language}`);
        Logger.success(`lang=${settingsState.lang}, darkMode=${settingsState.darkMode}, defaultFolder=${settingsState.defaultFolder}`);
        // Logger.warn('React-FTP', remote.app.getVersion());
        // Logger.error('React-FTP', remote.app.getVersion());
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
        // right now lister's selection is lost because
        // switching to downloads destroys the listers
        // and switching back to explorer view creates
        // new listers, which in turns creates new nodes
        // fixing this require a little work so meanwhile
        // this correctly resets the cache's state
        this.appState.clearSelections();
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

    setActiveView(view:number) {
        this.appState.setActiveCache(view);
    }

    handleClick = (e: React.MouseEvent) => {
        const sideview = (e.target as HTMLElement).closest('.sideview');

        if (sideview) {
            const num = parseInt(sideview.id.replace('view_', ''), 10);
            if (this.appState.caches[num].active !== true) {
                console.log('preventing event propagation');
                e.stopPropagation();
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
        }  else {
            ipcRenderer.send('exit');
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
        const nextView = this.appState.caches[0].active ? 1 : 0;

        this.setActiveView(nextView);
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
        this.setDarkTheme();
    }

    onExitDialogClose = (valid:boolean) => {
        this.setState({ isExitDialogOpen: false });
        if (!valid) {
            this.showDownloadsTab();
        } else {
            ipcRenderer.send('exit');
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

    renderMenuAccelerators() {
        return <Accelerators>
            <Accelerator combo="CmdOrCtrl+Shift+C" onClick={this.onCopyPath}></Accelerator>
            <Accelerator combo="CmdOrCtrl+Shift+N" onClick={this.onCopyFilename}></Accelerator>
            <Accelerator combo="CmdOrCtrl+S" onClick={this.onOpenShortcuts}></Accelerator>
            <Accelerator combo="CmdOrCtrl+," onClick={this.onOpenPrefs}></Accelerator>
            <Accelerator combo="CmdOrCtrl+R" onClick={this.onReloadFileView}></Accelerator>
            <Accelerator combo="CmdOrCtrl+Q" onClick={this.onExitComboDown}></Accelerator>
            <Accelerator combo="CmdOrCtrl+K" onClick={this.onOpenTerminal}></Accelerator>
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
        </Hotkeys>;
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

    onOpenTerminal = () => {
        const cache = this.getActiveFileCache();
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
        const caches = this.appState.caches;

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
                            <Navbar.Heading>React-explorer</Navbar.Heading>
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
                        <SideView fileCache={caches[0]} hide={!isExplorer} onPaste={this.onPaste} />
                        <SideView fileCache={caches[1]} hide={!isExplorer} onPaste={this.onPaste} />
                        <Downloads hide={isExplorer}/>
                    </div>
                    <LogUI></LogUI>
                </React.Fragment>
            </Provider>
        );
    }
}

const ReactApp = withNamespaces()(App);

export { ReactApp };
