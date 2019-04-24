import * as React from "react";
import { AppState } from "../state/appState";
import { ButtonGroup, Button, Icon } from "@blueprintjs/core";
import { inject, observer } from "mobx-react";
import { WithNamespaces, withNamespaces } from "react-i18next";

export interface TabDescriptor {
    viewId: number;
    path: string;
}

interface TabListProps extends WithNamespaces {
    viewId: number;
}

interface InjectedProps extends TabListProps {
    appState?: AppState;
}

@inject('appState')
@observer
class TabListClass extends React.Component<InjectedProps> {
    constructor(props: InjectedProps) {
        super(props);
    }

    get injected() {
        return this.props as InjectedProps;
    }

    addTab = () => {

    }

    closeTab = () => {
        console.log('closetab');
    }

    render() {
        const { appState } = this.injected;
        const { t } = this.props;
        const viewId = this.props.viewId;
        const caches = appState.getCachesForView(viewId);
        const closeButton = caches.length > 1 && <Icon iconSize={12} htmlTitle={t('TABS.CLOSE')} className="closetab" intent="warning" onClick={this.closeTab} icon="cross"></Icon>;

        return (
            <ButtonGroup className="tablist" alignText="left">
                {
                    caches.map((cache, index) => (
                        <Button key={"" + viewId + index} title={cache.path} intent={!index ? "primary" : "none"} rightIcon={closeButton}>{cache.path}</Button>
                    ))
                }
                <Button icon="add" minimal onClick={this.addTab}></Button>
            </ButtonGroup>
        )
    }
}

const TabList = withNamespaces()(TabListClass);

export { TabList };
