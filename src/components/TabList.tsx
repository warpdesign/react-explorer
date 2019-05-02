import * as React from "react";
import { ButtonGroup, Button, Icon } from "@blueprintjs/core";
import { inject, observer } from "mobx-react";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { ViewState } from "../state/viewState";
import { sendFakeCombo } from "./WithMenuAccelerators";

export interface TabDescriptor {
    viewId: number;
    path: string;
}

interface InjectedProps extends WithNamespaces {
    viewState?: ViewState;
}

@inject('viewState')
@observer
class TabListClass extends React.Component<InjectedProps> {
    constructor(props: InjectedProps) {
        super(props);
    }

    get injected() {
        return this.props as InjectedProps;
    }

    addTab = () => {
        sendFakeCombo('CmdOrCtrl+T');
    }

    selectTab(tabIndex: number) {
        const { viewState } = this.injected;
        viewState.setVisibleCache(tabIndex);
    }

    closeTab(tabIndex: number, e: Event) {
        const { viewState } = this.injected;

        viewState.closeTab(tabIndex);
        // prevent selectTab handler to be called since the tab will get closed
        e.stopPropagation();
        console.log('closetab', tabIndex);
    }

    render() {
        const { viewState } = this.injected;
        const { t } = this.props;
        const viewId = viewState.viewId;
        const caches = viewState.caches;

        return (
            <ButtonGroup fill className="tablist" alignText="center">
                {
                    caches.map((cache, index) => {
                        const closeIcon = cache.isVisible && caches.length > 1 && <Icon iconSize={12} htmlTitle={t('TABS.CLOSE')} className="closetab" intent="warning" onClick={this.closeTab.bind(this, index)} icon="cross"></Icon>;
                        const path = cache.path;
                        const tabInfo = cache.getFS().displaypath(path);
                        console.log('**tab', tabInfo);
                        return (
                            <Button key={"" + viewId + index} onClick={this.selectTab.bind(this, index)} title={tabInfo.fullPath} intent={cache.isVisible ? "primary" : "none"} rightIcon={closeIcon}>{tabInfo.shortPath}</Button>
                        )
                    })
                }
                <Button icon="add" className="addtab" minimal title={t('TABS.NEW')} onClick={this.addTab}></Button>
            </ButtonGroup>
        )
    }
}

const TabList = withNamespaces()(TabListClass);

export { TabList };
