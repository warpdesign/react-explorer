import * as React from "react";
import { ButtonGroup, Button, Icon, IconName } from "@blueprintjs/core";
import { inject, observer } from "mobx-react";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { ViewState } from "../state/viewState";
import { sendFakeCombo } from "./WithMenuAccelerators";
import { ContextMenu } from './ContextMenu';
import { MenuItemConstructorOptions, MenuItem } from "electron";
import { SettingsState } from "../state/settingsState";
import { DOWNLOADS_DIR, HOME_DIR, DOCS_DIR, DESKTOP_DIR, MUSIC_DIR, PICTURES_DIR, VIDEOS_DIR } from '../utils/platform';
import { AppAlert } from "./AppAlert";

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
    menuFolderRef: React.RefObject<ContextMenu> = React.createRef();
    menuIndex = 0;

    tabIcons = [{
        regex: new RegExp('^' + DOWNLOADS_DIR + '$'),
        icon: 'download'
    },
    {
        regex: new RegExp('^' + MUSIC_DIR + '$'),
        icon: 'music'
    },
    {
        regex: new RegExp('^' + PICTURES_DIR + '$'),
        icon: 'camera'
    },
    {
        regex: new RegExp('^' + DESKTOP_DIR + '$'),
        icon: 'desktop'
    },
    {
        regex: new RegExp('^' + DOCS_DIR + '$'),
        icon: 'projects'
    },
    {
        regex: new RegExp('^' + HOME_DIR + '$'),
        icon: 'home'
    },
    {
        regex: new RegExp('^' + VIDEOS_DIR + '$'),
        icon: 'video'
    }];

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

    onMenuFolderClick = (item: number) => {
        console.log()
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

    onFolderItemClick = (menuItem: MenuItem & { id: string }) => {
        console.log('folderItem click', menuItem);
        const { viewState } = this.injected;
        const cache = viewState.getVisibleCache();
        if (menuItem.id) {
            cache.openDirectory({
                dir: cache.path,
                fullname: menuItem.id
            }).catch((err) => {
                AppAlert.show(`${err.message} (${err.code})`, {
                    intent: 'danger'
                });
            })
        }
    };

    onFolderContextMenu = (e: React.MouseEvent) => {
        const { t } = this.injected;
        const { viewState } = this.injected;

        e.preventDefault();
        e.stopPropagation();

        // TODO: get path entries
        const cache = viewState.getVisibleCache();
        const tree = cache.getAPI().getParentTree(cache.path);

        const template: MenuItemConstructorOptions[] = tree.map((el: { dir: string, fullname: string, name: string }) => {
            return {
                label: el.name,
                id: el.fullname,
                click: this.onFolderItemClick
            };
        });

        this.menuFolderRef.current.showMenu(template);
    }

    getTabMenu(): MenuItemConstructorOptions[] {
        const { t } = this.injected;

        return [{
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
        }];
    }

    getTabIcon(path: string): IconName {
        for (let obj of this.tabIcons) {
            if (obj.regex.test(path)) {
                return obj.icon as IconName;
            }
        }

        return 'folder-close';
    }

    render() {
        const { viewState } = this.injected;
        const { t } = this.props;
        const viewId = viewState.viewId;
        const caches = viewState.caches;
        // TODO: this will be created at each render: this should only be re-rendered
        // whenever the language has changed
        const tabMenuTemplate = this.getTabMenu();

        return (
            <ButtonGroup fill className="tablist" alignText="center">
                <ContextMenu ref={this.menuRef} onItemClick={this.onMenuClick} template={tabMenuTemplate}></ContextMenu>
                <ContextMenu ref={this.menuFolderRef} onItemClick={this.onMenuFolderClick} template={null}></ContextMenu>
                {
                    caches.map((cache, index) => {
                        const closeIcon = caches.length > 1 && <Icon iconSize={12} htmlTitle={t('TABS.CLOSE')} className="closetab" intent="warning" onClick={this.closeTab.bind(this, index)} icon="cross"></Icon>;
                        const path = cache.path;
                        const tabIcon = cache.error ? 'issue' : this.getTabIcon(path);
                        const tabInfo = cache.getFS() && cache.getFS().displaypath(path) || { fullPath: '', shortPath: '' };

                        return (
                            <Button key={"" + viewId + index} onContextMenu={() => this.onContextMenu(index)} onClick={this.selectTab.bind(this, index)} title={tabInfo.fullPath} intent={cache.isVisible ? "primary" : "none"} rightIcon={closeIcon} className="tab"><Icon onContextMenu={this.onFolderContextMenu} className="folder" icon={tabIcon}></Icon>{tabInfo.shortPath}</Button>
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
