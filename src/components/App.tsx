import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager, Icon, HotkeysTarget, Hotkeys, Hotkey } from "@blueprintjs/core";
import { Provider, observer } from "mobx-react";
import { Navbar, Alignment, Button, Intent } from "@blueprintjs/core";
import { SideView } from "./SideView";
import { LogUI } from "./Log";
import { Downloads } from "./Downloads";
import { Badge } from "./Badge";
import { ipcRenderer } from "electron";

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    isExplorer: boolean;
    activeView: number;
}

const EXIT_DELAY = 1200;
const KEY_Q = 81;
const UP_DELAY = 130;

@observer
export class ReactApp extends React.Component<{}, IState> {
    private appState: AppState;
    private lastTimeStamp: any = 0;
    private exitTimeout: any = 0;
    private exitMode = false;

    constructor(props = {}) {
        super(props);

        this.state = { isExplorer: true, activeView: 0 };

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        this.appState = new AppState();
    }

    navClick = () => {
        this.setState({ isExplorer: !this.state.isExplorer });
    }

    parents(elt: HTMLElement, selector: string): HTMLElement {
        let found:HTMLElement = null;

        while (!found && elt) {
            found = elt.matches(selector) && elt;
            elt = elt.parentElement;
        }

        return found;
    }

    handleClick = (e: React.MouseEvent) => {
        const sideview = this.parents((e.target) as HTMLElement, '.sideview');
        if (sideview) {
            const num = sideview.id.replace('view_', '');
            if (this.state.activeView !== parseInt(num, 10)) {
                console.log('preventing event propagation');
                e.stopPropagation();
            }

            this.setState({
                activeView: parseInt(num, 10)
            });
        }
    }

    // shouldComponentUpdate() {
    //     console.time('App Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('App Render');
    // }

    onExitDown = (e: KeyboardEvent) => {
        if (!this.exitMode && e.keyCode === KEY_Q && e.metaKey) {
            this.lastTimeStamp = new Date().getTime();
            ipcRenderer.send('exitWarning');

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
        } else if (e.keyCode === KEY_Q && this.exitMode) {
            this.lastTimeStamp = new Date().getTime();
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.onExitDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onExitDown);
    }

    render() {
        const { isExplorer, activeView } = this.state;
        const badgeSize = this.appState.pendingTransfers;
        const badgeText = badgeSize && (badgeSize + '') || '';
        const badgeProgress = this.appState.totalTransferProgress;

        return (
            <Provider appState={this.appState}>
                <React.Fragment>
                    <Navbar>
                        <Navbar.Group align={Alignment.LEFT}>
                            <Navbar.Heading>React-explorer</Navbar.Heading>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="home" text="Explorer" onClick={this.navClick} intent={isExplorer ? Intent.PRIMARY : 'none'} />
                            <Button style={{ position: 'relative' }} className="bp3-minimal" icon="download" onClick={this.navClick} intent={!isExplorer ? Intent.PRIMARY : 'none'}>Transfers<Badge intent="none" text={badgeText} progress={badgeProgress} /></Button>
                        </Navbar.Group>
                        <Navbar.Group align={Alignment.RIGHT}>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="cog" />
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

