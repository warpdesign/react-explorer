import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager } from "@blueprintjs/core";
import { Provider } from "mobx-react";
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
}

export class ReactApp extends React.Component<{}, IState> {
    private appState: AppState;

    constructor(props = {}) {
        super(props);

        this.state = { isExplorer: true };

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        this.appState = new AppState();
    }

    navClick = () => {
        this.setState({ isExplorer: !this.state.isExplorer });
    }

    render() {
        const { isExplorer } = this.state;

        return (
            <Provider appState={this.appState}>
                <React.Fragment>
                    <Navbar>
                        <Navbar.Group align={Alignment.LEFT}>
                            <Navbar.Heading>React-ftp</Navbar.Heading>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="home" text="Explorer" onClick={this.navClick} intent={isExplorer ? Intent.PRIMARY : 'none'} />
                            <Button className="bp3-minimal" icon="download" onClick={this.navClick} intent={!isExplorer ? Intent.PRIMARY : 'none'}>Transfers<Badge intent="danger" text="2"/></Button>
                        </Navbar.Group>
                        <Navbar.Group align={Alignment.RIGHT}>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="cog" />
                        </Navbar.Group>
                    </Navbar>
                    <div className="main">
                        <SideView hide={!isExplorer} />
                        <SideView hide={!isExplorer} />
                        <Downloads hide={isExplorer}/>
                    </div>
                    <LogUI></LogUI>
                </React.Fragment>
            </Provider>
        );
    }
}