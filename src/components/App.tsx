import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager, Icon, HotkeysTarget, Hotkeys, Hotkey, Alert } from "@blueprintjs/core";
import { Provider, observer, inject } from "mobx-react";
import { Navbar, Alignment, Button, Intent } from "@blueprintjs/core";
import { SideView } from "./SideView";
import { LogUI, Logger } from "./Log";
import { Downloads } from "./Downloads";
import { Badge } from "./Badge";
import { ipcRenderer } from "electron";
import { withNamespaces, WithNamespaces, Trans } from 'react-i18next';
import { AppToaster } from "./AppToaster";
import * as process from 'process';
import { remote } from 'electron';
import i18next from '../locale/i18n';
import { FileState } from "../state/fileState";
import { SettingsState } from "../state/settingsState";

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    // activeView: number;
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

        console.log(this.injected.settingsState.lang);

        this.state = { isExitDialogOpen: false };

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        const path = process.platform === "win32" ? remote.app.getPath('temp') : '/tmp/react-explorer';

        this.appState = new AppState([path, path]);

        if (ENV.CY) {
            window.appState = this.appState;
        }

        Logger.success(`React-FTP - CY: ${ENV.CY} - NODE_ENV: ${ENV.NODE_ENV} - lang: ${i18next.language}`);
        // Logger.warn('React-FTP', remote.app.getVersion());
        // Logger.error('React-FTP', remote.app.getVersion());
    }

    addListeners() {
        // prevent builtin hotkeys dialog from opening: there are numerous prolbems with it
        // ** document.addEventListener('keydown', (e) => { console.log('keydown99', e.keyCode, e.which, e.shiftKey); if (e.which === 191 && e.shiftKey) { console.log('stopPropagation'); e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault(); } }, true);
        ipcRenderer.on('exitRequest', (e: Event) => {
            this.onExitRequest(true);
        });
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

    onExitRequest = (winClosed = false) => {
        let shouldCancel = false;

        if (this.appState && this.appState.pendingTransfers) {
            this.setState({ isExitDialogOpen: true });
            shouldCancel = true;
        }  else if (winClosed) {
            ipcRenderer.send('exit');
        }

        return shouldCancel;
    }

    onExitComboDown = (e: KeyboardEvent) => {
        const { t } = this.props;

        if (!this.exitMode && e.keyCode === KEY_Q && e.metaKey) {
            const shouldCancel = this.onExitRequest();

            if (!shouldCancel) {
                // check transfers
                this.lastTimeStamp = new Date().getTime();

                ipcRenderer.send('exitWarning', t('MAIN_PROCESS.PRESS_TO_EXIT'));

                this.exitTimeout = setTimeout(() => {
                    const currentTimeout = new Date().getTime();
                    if (this.exitMode && (currentTimeout - this.lastTimeStamp <= UP_DELAY)) {
                        this.exitMode = false;
                        ipcRenderer.send('exit');
                    } else {
                        ipcRenderer.send('endExitWarning');
                        this.exitMode = false;
                    }
                }, EXIT_DELAY);

                this.exitMode = true;
            }
        } else if (e.keyCode === KEY_Q && this.exitMode) {
            this.lastTimeStamp = new Date().getTime();
        }
    }

    onNextView = () => {
        const nextView = this.appState.caches[0].active ? 1 : 0;

        this.setActiveView(nextView);
    }

    componentDidMount() {
        // listen for events from main process
        this.addListeners();
        this.setDarkTheme();
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
            <Hotkey
                global={true}
                combo="mod + r"
                label={t('SHORTCUT.MAIN.RELOAD_VIEW')}
                preventDefault={true}
                onKeyDown={this.onReloadFileView}
            />
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
                combo="q"
                label={t('SHORTCUT.MAIN.QUIT')}
                onKeyDown={this.onExitComboDown}
            />
            <Hotkey
                global={true}
                combo="mod + q"
                label={t('SHORTCUT.MAIN.QUIT')}
                onKeyDown={this.onExitComboDown}
            />
            <Hotkey
                global={true}
                combo="mod + shift + c"
                label={t('SHORTCUT.ACTIVE_VIEW.COPY_PATH')}
                onKeyDown={this.onCopyPath}>
            </Hotkey>
            <Hotkey
                global={true}
                combo="mod + shift + n"
                label={t('SHORTCUT.ACTIVE_VIEW.COPY_FILENAME')}
                onKeyDown={this.onCopyFilename}>
            </Hotkey>
            <Hotkey
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
            />
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
        if (this.appState.isExplorer) {
            const cache = this.getActiveFileCache();
            cache.navHistory(-1);
        }
    }

    forwardHistory = () => {
        if (this.appState.isExplorer) {
            const cache = this.getActiveFileCache();
            cache.navHistory(1);
        }
    }

    changeLanguage = () => {
        const { settingsState } = this.injected;
        settingsState.setLanguage('en');
    }

    toggleDarkMode = () => {
        document.body.classList.toggle('bp3-dark');
        const { settingsState } = this.injected;
        settingsState.darkMode = true;
    }

    private getActiveFileCache(ignoreStatus = false): FileState {
        const state = this.appState.getActiveCache();

        if (ignoreStatus || !state) {
            return state;
        } else {
            return ignoreStatus ? state : (state.status === 'ok' && state || null);
        }
    }

    private onCopy = () => {
        const fileCache: FileState = this.getActiveFileCache();

        if (fileCache) {
            const num = this.appState.setClipboard(fileCache);

            AppToaster.show({
                message: `${num} element(s) copied to the clipboard`,
                icon: "tick",
                intent: Intent.SUCCESS
            }, undefined, true);
        }
    }

    private onCopyPath = (): void => {

        this.appState.copySelectedItemsPath(this.getActiveFileCache());
    }

    private onCopyFilename = (): void => {
        this.appState.copySelectedItemsPath(this.getActiveFileCache(), true);
    }

    private onPaste = (): void => {
        // TODO: source cache shouldn't be busy as well
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

    setDarkTheme() {
        const { settingsState } = this.injected;
        if (settingsState.isDarkModeActive) {
            document.body.classList.add('bp3-dark');
        } else {
            document.body.classList.remove('bp3-dark');
        }
    }

    render() {
        const { /*isExplorer,*/ /*activeView,*/ isExitDialogOpen } = this.state;
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
                    <Navbar>
                        <Navbar.Group align={Alignment.LEFT}>
                            <Navbar.Heading>React-explorer</Navbar.Heading>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="home" text={t('NAV.EXPLORER')} onClick={this.navClick} intent={isExplorer ? Intent.PRIMARY : 'none'} />
                            <Button style={{ position: 'relative' }} className="bp3-minimal" icon="download" onClick={this.navClick} intent={!isExplorer ? Intent.PRIMARY : 'none'}>{t('NAV.TRANSFERS')}<Badge intent="none" text={badgeText} progress={badgeProgress} /></Button>
                        </Navbar.Group>
                        <Navbar.Group align={Alignment.RIGHT}>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" onClick={this.toggleDarkMode} icon="cog" />
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
