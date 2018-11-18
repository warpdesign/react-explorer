import { AppState } from "../state/appState";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { FocusStyleManager, Icon } from "@blueprintjs/core";
import { Provider } from "mobx-react";
import { Navbar, Alignment, Button, Intent } from "@blueprintjs/core";
import { SideView } from "./SideView";
import { LogUI } from "./Log";
import { Downloads } from "./Downloads";
import { Badge } from "./Badge";
import { INTENT_PRIMARY } from "@blueprintjs/core/lib/esm/common/classes";

require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("../css/main.css");

interface IState {
    isExplorer: boolean;
    activeView: number;
}

export class ReactApp extends React.Component<{}, IState> {
    private appState: AppState;

    constructor(props = {}) {
        super(props);

        this.state = { isExplorer: true, activeView: -1 };

        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs();

        this.appState = new AppState();
    }

    navClick = () => {
        this.setState({ isExplorer: !this.state.isExplorer });
    }

    handleClick = (e: React.MouseEvent) => {
        console.log(e);
    }

    render() {
        const { isExplorer } = this.state;

        return (
            <Provider appState={this.appState}>
                <React.Fragment>
                    <Navbar>
                        <Navbar.Group align={Alignment.LEFT}>
                            <Navbar.Heading>React-explorer</Navbar.Heading>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="home" text="Explorer" onClick={this.navClick} intent={isExplorer ? Intent.PRIMARY : 'none'} />
                            <Button className="bp3-minimal" icon="download" onClick={this.navClick} intent={!isExplorer ? Intent.PRIMARY : 'none'}>Transfers<Badge intent="danger" text="2"/></Button>
                        </Navbar.Group>
                        <Navbar.Group align={Alignment.RIGHT}>
                            <Navbar.Divider />
                            <Button className="bp3-minimal" icon="cog" />
                        </Navbar.Group>
                    </Navbar>
                    <div onClick={this.handleClick} className="main">
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