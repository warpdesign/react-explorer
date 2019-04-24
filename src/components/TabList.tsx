import * as React from "react";
import { AppState } from "../state/appState";
import { ButtonGroup, Button, Icon } from "@blueprintjs/core";
import { inject, observer } from "mobx-react";

export interface TabDescriptor {
    viewId: number;
    path: string;
}

interface TabListProps {
    viewId: number;
}

interface InjectedProps extends TabListProps {
    appState?: AppState;
}

@inject('appState')
@observer
export class TabListClass extends React.Component<InjectedProps> {
    constructor(props: InjectedProps) {
        super(props);
    }

    get injected() {
        return this.props as InjectedProps;
    }

    addTab = () => {

    }

    closeTab = () => {

    }

    render() {
        const { appState } = this.injected;
        const viewId = this.props.viewId;
        const caches = appState.getCachesForView(viewId);
        const closeButton = <Icon className="small" onClick={this.closeTab} icon="cross"></Icon>;

        return (
            <ButtonGroup className="tablist" alignText="left">
                {
                    caches.map((cache, index) => (
                        <Button icon="database" key={"" + viewId + index} intent={!index ? "primary" : "none"} rightIcon={closeButton}>{cache.path}</Button>
                    ))
                }
                <Button icon="add" minimal onClick={this.addTab}></Button>
            </ButtonGroup>
        )
    }
}