import * as React from "react";
import { ButtonGroup, Button, Icon } from "@blueprintjs/core";
import { inject, observer } from "mobx-react";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { ViewState } from "../state/viewState";
import { sendFakeCombo } from "./WithMenuAccelerators";
import { ContextMenu } from './ContextMenu';
import { MenuItemConstructorOptions, MenuItem } from "electron";
import { SettingsState } from "../state/settingsState";

export interface TabDescriptor {
    viewId: number;
    path: string;
}

interface InjectedProps extends WithNamespaces {
    viewState?: ViewState;
    settingsState?: SettingsState;
}

@inject('viewState', 'settingsState')
@observer
class TabListClass extends React.Component<InjectedProps> {
    menuRef: React.RefObject<ContextMenu> = React.createRef();
    menuIndex = 0;

    constructor(props: InjectedProps) {
        super(props);
    }

    get injected() {
        return this.props as InjectedProps;
    }

    addTab = (index: number) => {
        const { viewState, settingsState } = this.injected;

        viewState.addCache(settingsState.defaultFolder, index + 1, true);
    }

    selectTab(tabIndex: number) {
        const { viewState } = this.injected;
        viewState.setVisibleCache(tabIndex);
    }

    closeTab(tabIndex: number, e?: Event) {
        const { viewState } = this.injected;

        viewState.closeTab(tabIndex);
        // prevent selectTab handler to be called since the tab will get closed
        e && e.stopPropagation();
        console.log('closetab', tabIndex);
    }

    closeOthers(index: number) {
        const { viewState } = this.injected;

        viewState.closeOthers(index);
    }

    reloadView(index: number) {
        const { viewState } = this.injected;
        viewState.caches[index].reload();
    }

    openTerminal() {
        const { viewState } = this.injected;
        sendFakeCombo('CmdOrCtrl+K', {
            tabIndex: this.menuIndex,
            viewId: viewState.viewId
        });
    }

    onMenuClick = (item: number) => {
        console.log('menu Click', item);
    }

    onContextMenu = (menuIndex: number) => {
        this.menuIndex = menuIndex;
        this.menuRef.current.showMenu();
    }

    onItemClick = (menuItem: MenuItem & { id: string }) => {
        switch (menuItem.id) {
            case 'CLOSE_TAB':
                this.closeTab(this.menuIndex);
                break;
            case 'NEW_TAB':
                this.addTab(this.menuIndex);
                break;
            case 'CLOSE_OTHERS':
                this.closeOthers(this.menuIndex);
                break;
            case 'REFRESH':
                this.reloadView(this.menuIndex);
                break;
            case 'OPEN_TERMINAL':
                this.openTerminal();
                break;
            // case 'OPEN_EXPLORER':
            //     break;
            // case 'COPY_PATH':
        }
    }

    render() {
        const { viewState } = this.injected;
        const { t } = this.props;
        const viewId = viewState.viewId;
        const caches = viewState.caches;

        const template: MenuItemConstructorOptions[] = [{
            label: t('TABS.NEW'),
            id: 'NEW_TAB',
            click: this.onItemClick
        }, {
            type: 'separator'
        }, {
            label: t('TABS.REFRESH'),
            id: 'REFRESH',
            click: this.onItemClick
        }, {
            type: 'separator'
        }, {
            label: t('TABS.CLOSE'),
            id: 'CLOSE_TAB',
            click: this.onItemClick
        },
        {
            label: t('TABS.CLOSE_OTHERS'),
            id: 'CLOSE_OTHERS',
            click: this.onItemClick
        }, {
            type: 'separator'
        }, {
            label: t('APP_MENUS.OPEN_TERMINAL'),
            id: 'OPEN_TERMINAL',
            click: this.onItemClick
            // }, {
            //     label: 'open in finder/explorer/manager',
            //     id: 'OPEN_EXPLORER',
            //     click: this.onItemClick
            // }, {
            //     type: 'separator'
            // }, {
            //     label: 'Copy path',
            //     id: 'COPY_PATH',
            //     click: this.onItemClick
            // }];
        }];

        return (
            <ButtonGroup fill className="tablist" alignText="center">
                <ContextMenu ref={this.menuRef} onItemClick={this.onMenuClick} template={template}></ContextMenu>
                {
                    caches.map((cache, index) => {
                        const closeIcon = cache.isVisible && caches.length > 1 && <Icon iconSize={12} htmlTitle={t('TABS.CLOSE')} className="closetab" intent="warning" onClick={this.closeTab.bind(this, index)} icon="cross"></Icon>;
                        const path = cache.path;
                        const tabInfo = cache.getFS().displaypath(path);

                        return (
                            <Button key={"" + viewId + index} onContextMenu={() => this.onContextMenu(index)} onClick={this.selectTab.bind(this, index)} title={tabInfo.fullPath} intent={cache.isVisible ? "primary" : "none"} rightIcon={closeIcon}>{tabInfo.shortPath}</Button>
                        )
                    })
                }
                <Button icon="add" className="addtab" minimal title={t('TABS.NEW')} onClick={() => this.addTab(viewState.getVisibleCacheIndex())}></Button>
            </ButtonGroup>
        )
    }
}

const TabList = withNamespaces()(TabListClass);

export { TabList };
