import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager, Icon } from "@blueprintjs/core";
import { Provider, observer } from "mobx-react";
import { Navbar, Alignment, Button, Intent } from "@blueprintjs/core";
import { SideView } from "./SideView";
import { LogUI } from "./Log";
import { Downloads } from "./Downloads";
import { Badge } from "./Badge";

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    isExplorer: boolean;
    activeView: number;
}

@observer
export class ReactApp extends React.Component<{}, IState> {
    private appState: AppState;

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

