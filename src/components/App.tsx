import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager, Icon, HotkeysTarget, Hotkeys, Hotkey, Alert } from "@blueprintjs/core";
import { Provider, observer } from "mobx-react";
import { Navbar, Alignment, Button, Intent } from "@blueprintjs/core";
import { SideView } from "./SideView";
import { LogUI, Logger } from "./Log";
import { Downloads } from "./Downloads";
import { Badge } from "./Badge";
import { ipcRenderer } from "electron";
import { withNamespaces, WithNamespaces, Trans } from 'react-i18next';
import { updateTranslations } from '../utils/formatBytes';
import i18next from '../locale/i18n';

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    isExplorer: boolean;
    activeView: number;
    isExitDialogOpen: boolean;
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

@observer
@HotkeysTarget
class App extends React.Component<WithNamespaces, IState> {
    private appState: AppState;
    private lastTimeStamp: any = 0;
    private exitTimeout: any = 0;
    private exitMode = false;

    constructor(props: WithNamespaces) {
        super(props);

        this.state = { isExplorer: true, activeView: 0, isExitDialogOpen: false };

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        this.appState = new AppState();

        if (ENV.CY) {
            window.appState = this.appState;
        }

        Logger.success(`React-FTP - CY: ${ENV.CY} - NODE_ENV: ${ENV.NODE_ENV} - lang: ${i18next.language}`);
        // Logger.warn('React-FTP', remote.app.getVersion());
        // Logger.error('React-FTP', remote.app.getVersion());
    }

    addListeners() {
        ipcRenderer.on('exitRequest', (e: Event) => {
            this.onExitRequest(true);
        });
    }

    showDownloadsTab() {
        this.setState({ isExplorer: false });
    }

    navClick = () => {
        this.setState({ isExplorer: !this.state.isExplorer });
    }

    handleClick = (e: React.MouseEvent) => {
        const sideview = (e.target as HTMLElement).closest('.sideview');

        if (sideview) {
            const num = sideview.id.replace('view_', '');
            if (this.state.activeView !== parseInt(num, 10)) {
                console.log('preventing event propagation');
                e.stopPropagation();
                this.setState({
                    activeView: parseInt(num, 10)
                });
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

    // shouldComponentUpdate() {
    //     console.time('App Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('App Render');
    // }

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

    componentDidMount() {
        // listen for events from main process
        this.addListeners();
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
        if (this.state.isExplorer) {
            console.log('reloading view', this.state.activeView);
            this.appState.refreshView(this.state.activeView);
        } else {
            console.log('downloads active, no refresh');
        }
    }

    public renderHotkeys() {
        const t = this.props.t;

        return <Hotkeys>
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
                combo="mod + r"
                label={t('SHORTCUT.MAIN.RELOAD_VIEW')}
                preventDefault={true}
                onKeyDown={this.onReloadFileView}
            />
        </Hotkeys>;
    }

    changeLanguage = () => {
        console.log('changing language to en');
        i18next.changeLanguage('en', (err, t2) => {
            if (err) {
                console.warn('oops, error changing language to en', err);
            }
        });
    }

    render() {
        const { isExplorer, activeView, isExitDialogOpen } = this.state;
        const count = this.appState.pendingTransfers;
        const badgeText = count && (count + '') || '';
        const badgeProgress = this.appState.totalTransferProgress;
        const { t } = this.props;

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
                            <Button className="bp3-minimal" onClick={this.changeLanguage} icon="cog" />
                        </Navbar.Group>
                    </Navbar>
                    <div onClickCapture={this.handleClick} className="main">
                        <SideView active={activeView === 0} hide={!isExplorer} />
                        <SideView active={activeView === 1} hide={!isExplorer} />
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
