import * as React from 'react';
import { ButtonGroup, Button, Icon, IconName } from '@blueprintjs/core';
import { inject, observer } from 'mobx-react';
import { WithNamespaces, withNamespaces } from 'react-i18next';
import { ViewState } from '../state/viewState';
import { sendFakeCombo } from './WithMenuAccelerators';
import { MenuItemConstructorOptions, ipcRenderer } from 'electron';
import { SettingsState } from '../state/settingsState';
import { ALL_DIRS } from '../utils/platform';
import Icons from '../constants/icons';
import { AppAlert } from './AppAlert';
import { LocalizedError } from '../locale/error';
import { IpcRendererEvent } from 'electron/renderer';

/**
 * Describes a view, the path is the path to its first tab: right now each view is created with only
 * one tab: this may change in the future
 */
export interface ViewDescriptor {
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
    menuIndex = 0;

    /**
     * build a list of { regex, IconName } to match folders with an icon
     * For eg:
     * {
     *    regex: /^/Users/leo$/,
     *    icon: 'home'
     * }
     */
    tabIcons = Object.keys(Icons).map((dirname: string) => ({
        regex: new RegExp(`^${ALL_DIRS[dirname]}$`),
        icon: Icons[dirname],
    }));

    constructor(props: InjectedProps) {
        super(props);
    }

    componentDidMount(): void {
        // add listener
        ipcRenderer.on('context-menu-tab-list:click', this.contextMenuHandler);
    }

    componentWillUnmount(): void {
        // remove listener
        ipcRenderer.removeListener('context-menu-tab-list:click', this.contextMenuHandler);
    }

    contextMenuHandler = (event: IpcRendererEvent, command: string, param?: string) => {
        this.onItemClick(command, param);
    };

    get injected(): InjectedProps {
        return this.props as InjectedProps;
    }

    addTab = (index: number): void => {
        const { viewState, settingsState } = this.injected;

        viewState.addCache(settingsState.defaultFolder, index + 1, true);
    };

    selectTab(tabIndex: number): void {
        const { viewState } = this.injected;
        viewState.setVisibleCache(tabIndex);
    }

    closeTab(tabIndex: number, e?: Event): void {
        const { viewState } = this.injected;

        viewState.closeTab(tabIndex);
        // prevent selectTab handler to be called since the tab will get closed
        e && e.stopPropagation();
        console.log('closetab', tabIndex);
    }

    closeOthers(index: number): void {
        const { viewState } = this.injected;

        viewState.closeOthers(index);
    }

    reloadView(index: number): void {
        const { viewState } = this.injected;
        viewState.caches[index].reload();
    }

    openTerminal(): void {
        const { viewState } = this.injected;
        sendFakeCombo('CmdOrCtrl+K', {
            tabIndex: this.menuIndex,
            viewId: viewState.viewId,
        });
    }

    onContextMenu = (menuIndex: number): void => {
        const tabMenuTemplate = this.getTabMenu();
        this.menuIndex = menuIndex;
        ipcRenderer.invoke('Menu:buildFromTemplate', tabMenuTemplate);
    };

    onItemClick = (id: string, param?: string): void => {
        switch (id) {
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
            case 'OPEN_FOLDER':
                this.onFolderItemClick(param);
                break;
            // case 'OPEN_EXPLORER':
            //     break;
            // case 'COPY_PATH':
            default:
                console.warn('unknown tab context menu command', id);
        }
    };

    onFolderItemClick = (path: string): void => {
        const { viewState } = this.injected;
        const cache = viewState.getVisibleCache();
        if (path) {
            cache
                .openDirectory({
                    dir: cache.path,
                    fullname: path,
                })
                .catch((err: LocalizedError) => {
                    AppAlert.show(`${err.message} (${err.code})`, {
                        intent: 'danger',
                    });
                });
        }
    };

    onFolderContextMenu = (index: number, e: React.MouseEvent): void => {
        const { viewState } = this.injected;

        e.preventDefault();
        e.stopPropagation();

        const cacheUnderMouse = viewState.caches[index];
        const tree = cacheUnderMouse.getAPI().getParentTree(cacheUnderMouse.path);

        const template: MenuItemConstructorOptions[] = tree.map(
            (el: { dir: string; fullname: string; name: string }) => {
                return {
                    label: el.name,
                    id: `OPEN_FOLDER///${el.fullname}`,
                };
            },
        );

        ipcRenderer.invoke('Menu:buildFromTemplate', template);
    };

    getTabMenu(): MenuItemConstructorOptions[] {
        const { t } = this.injected;

        return [
            {
                label: t('TABS.NEW'),
                id: 'NEW_TAB',
            },
            {
                type: 'separator',
            },
            {
                label: t('TABS.REFRESH'),
                id: 'REFRESH',
            },
            {
                type: 'separator',
            },
            {
                label: t('TABS.CLOSE'),
                id: 'CLOSE_TAB',
            },
            {
                label: t('TABS.CLOSE_OTHERS'),
                id: 'CLOSE_OTHERS',
            },
            {
                type: 'separator',
            },
            {
                label: t('APP_MENUS.OPEN_TERMINAL'),
                id: 'OPEN_TERMINAL',
            },
        ];
    }

    getTabIcon(path: string): IconName {
        for (const obj of this.tabIcons) {
            if (obj.regex.test(path)) {
                return obj.icon as IconName;
            }
        }

        return 'folder-close';
    }

    render(): React.ReactNode {
        const { viewState } = this.injected;
        const { t } = this.props;
        const viewId = viewState.viewId;
        const caches = viewState.caches;
        // TODO: this will be created at each render: this should only be re-rendered
        // whenever the language has changed

        return (
            <ButtonGroup fill className="tablist" alignText="center">
                {caches.map((cache, index) => {
                    const closeIcon = caches.length > 1 && (
                        <Icon
                            iconSize={12}
                            htmlTitle={t('TABS.CLOSE')}
                            className="closetab"
                            intent="warning"
                            onClick={this.closeTab.bind(this, index)}
                            icon="cross"
                        ></Icon>
                    );
                    const path = cache.path;
                    const tabIcon = cache.error ? 'issue' : this.getTabIcon(path);
                    const tabInfo = (cache.getFS() && cache.getFS().displaypath(path)) || {
                        fullPath: '',
                        shortPath: '',
                    };

                    return (
                        <Button
                            key={'' + viewId + index}
                            onContextMenu={() => this.onContextMenu(index)}
                            onClick={this.selectTab.bind(this, index)}
                            title={tabInfo.fullPath}
                            intent={cache.isVisible ? 'primary' : 'none'}
                            rightIcon={closeIcon}
                            className="tab"
                        >
                            <Icon
                                onContextMenu={this.onFolderContextMenu.bind(this, index)}
                                className="folder"
                                icon={tabIcon}
                            ></Icon>
                            {tabInfo.shortPath}
                        </Button>
                    );
                })}
                <Button
                    icon="add"
                    className="addtab"
                    minimal
                    title={t('TABS.NEW')}
                    onClick={() => this.addTab(viewState.getVisibleCacheIndex())}
                ></Button>
            </ButtonGroup>
        );
    }
}

const TabList = withNamespaces()(TabListClass);

export { TabList };
