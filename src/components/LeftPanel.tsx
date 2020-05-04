import * as React from 'react';
import { Tree, ITreeNode } from '@blueprintjs/core';
import { observer, inject } from 'mobx-react';
import { withNamespaces, WithNamespaces } from 'react-i18next';
import classNames from 'classnames';
import { IReactionDisposer, reaction, toJS, IObservableArray } from 'mobx';
import i18next from 'i18next';
import { USERNAME, isMac } from '../utils/platform';
import Icons from '../constants/icons';
import { FavoritesState, Favorite } from '../state/favoritesState';
import { AppState } from '../state/appState';
import { AppAlert } from './AppAlert';
import CONFIG from '../config/appConfig';

require('../css/favoritesPanel.css');

interface LeftPanelState {
    nodes: ITreeNode<string>[];
    selectedNode: ITreeNode<string>;
}

interface Props extends WithNamespaces {
    hide: boolean;
}

interface InjectedProps extends Props {
    appState: AppState;
}

@inject('appState')
@observer
export class LeftPanelClass extends React.Component<Props, LeftPanelState> {
    favoritesState: FavoritesState;
    disposers: Array<IReactionDisposer> = [];

    constructor(props: Props) {
        super(props);

        const { t } = props;

        this.state = {
            nodes: [
                {
                    id: 0,
                    hasCaret: true,
                    isExpanded: true,
                    label: t('FAVORITES_PANEL.SHORTCUTS'),
                    childNodes: [],
                },
                {
                    id: 1,
                    hasCaret: true,
                    isExpanded: true,
                    label: t('FAVORITES_PANEL.PLACES'),
                    childNodes: [],
                },
            ],
            selectedNode: null,
        };

        this.favoritesState = this.injected.appState.favoritesState;

        this.installReaction();
        this.bindLanguageChange();
    }

    private bindLanguageChange = (): void => {
        console.log('languageChanged');
        i18next.on('languageChanged', this.onLanguageChanged);
    };

    private unbindLanguageChange = (): void => {
        i18next.off('languageChanged', this.onLanguageChanged);
    };

    public onLanguageChanged = (lang: string): void => {
        console.log('building nodes', lang);
        this.buildNodes(this.favoritesState);
    };

    private get injected(): InjectedProps {
        return this.props as InjectedProps;
    }

    componentWillUnmount(): void {
        this.disposers.forEach((disposer) => disposer());
        this.unbindLanguageChange();
    }

    private installReaction(): void {
        this.disposers.push(
            reaction(
                (): IObservableArray<Favorite> => toJS(this.favoritesState.places),
                (/*_: Favorite[]*/): void => {
                    if (!this.props.hide) {
                        console.log('places updated: need to rebuild nodes');
                        this.buildNodes(this.favoritesState);
                    }
                },
            ),
        );
    }

    /**
     *
     * @param path string attempts to find the first node with the given path
     *
     * @returns ITreeNode<string> | null
     */
    getNodeFromPath(path: string): ITreeNode<string> {
        const { nodes } = this.state;
        const shortcuts = nodes[0].childNodes;

        const found = shortcuts.find((node) => node.nodeData === path);

        if (found) {
            return found;
        } else {
            const places = nodes[1].childNodes;
            return places.find((node) => node.nodeData === path);
        }
    }

    setActiveNode(path: string): void {
        const { nodes } = this.state;
        nodes.forEach((node) => node.childNodes.forEach((childNode) => (childNode.isSelected = false)));

        // get active path based on path
        const selectedNode = this.getNodeFromPath(path);
        if (selectedNode) {
            selectedNode.isSelected = true;
        }
    }

    getActiveCachePath(): string {
        const { appState } = this.injected;
        const activeCache = appState.getActiveCache();

        if (activeCache) {
            return activeCache.path;
        } else {
            return '';
        }
    }

    openFavorite(path: string, sameView: boolean): void {
        const { appState } = this.injected;
        if (sameView) {
            const activeCache = appState.getActiveCache();
            if (activeCache && activeCache.status === 'ok') {
                activeCache.cd(path);
            }
        } else {
            const winState = appState.winStates[0];
            const viewState = winState.getInactiveView();

            if (!winState.splitView) {
                winState.toggleSplitViewMode();
            } else {
                winState.setActiveView(viewState.viewId);
            }

            if (viewState.getVisibleCache().path !== path) {
                viewState.addCache(path, -1, true);
            }
        }
    }

    onNodeClick = async (node: ITreeNode<string>, _: number[], e: React.MouseEvent<HTMLElement>): Promise<void> => {
        try {
            await this.openFavorite(node.nodeData, !(isMac ? e.altKey : e.ctrlKey));
        } catch (err) {
            AppAlert.show(`${err.message} (${err.code})`, {
                intent: 'danger',
            });
        }
    };

    onNodeToggle = (node: ITreeNode<string>): void => {
        node.isExpanded = !node.isExpanded;
        this.setState(this.state);
    };

    buildNodes(favorites: FavoritesState): void {
        const { t } = this.props;
        const { nodes } = this.state;
        const shortcuts = nodes[0];
        const places = nodes[1];

        shortcuts.childNodes = favorites.shortcuts.map((shortcut) => ({
            id: `s_${shortcut.path}`,
            key: `s_${shortcut.path}`,
            label: (
                <span title={shortcut.path}>
                    {shortcut.label === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${shortcut.label}`)}
                </span>
            ),
            icon: Icons[shortcut.label],
            nodeData: shortcut.path,
        }));

        places.childNodes = favorites.places.map((place) => ({
            id: `p_${place.path}`,
            key: `p_${place.path}`,
            label: <span title={place.path}>{place.label}</span>,
            icon: place.icon,
            nodeData: place.path,
        }));

        // update root nodes label too
        places.label = t('FAVORITES_PANEL.PLACES');
        shortcuts.label = t('FAVORITES_PANEL.SHORTCUTS');

        this.setState(this.state);
    }

    render(): JSX.Element {
        console.log('LeftPanel.render');
        const path = this.getActiveCachePath();
        this.setActiveNode(path);
        const { nodes } = this.state;
        const classnames = classNames(`favoritesPanel ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`, {
            hidden: this.props.hide,
        });

        return (
            <Tree
                contents={nodes}
                onNodeClick={this.onNodeClick}
                onNodeCollapse={this.onNodeToggle}
                onNodeExpand={this.onNodeToggle}
                className={classnames}
            />
        );
    }
}

const LeftPanel = withNamespaces()(LeftPanelClass);

export { LeftPanel };
