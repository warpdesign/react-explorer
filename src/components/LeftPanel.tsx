import * as React from "react";
import { Tree, ITreeNode } from "@blueprintjs/core";
import { observer, inject } from "mobx-react";
import { withNamespaces, WithNamespaces } from 'react-i18next';
import classNames from "classnames";
import { IReactionDisposer, reaction, toJS } from "mobx";
import i18next from 'i18next';
import { USERNAME } from "../utils/platform";
import Icons from "../constants/icons";
import { FavoritesState, Favorite } from "../state/favoritesState";
import { AppState } from "../state/appState";
import { AppAlert } from "./AppAlert";
import CONFIG from '../config/appConfig'

require("../css/favoritesPanel.css");

interface LeftPanelState {
    nodes: ITreeNode<string>[];
    selectedNode: ITreeNode<string>;
}

interface IProps extends WithNamespaces {
    hide: boolean;
}

interface InjectedProps extends IProps {
    appState: AppState;
}

@inject('appState')
@observer
export class LeftPanelClass extends React.Component<IProps, LeftPanelState> {
    favoritesState: FavoritesState;
    disposers:Array<IReactionDisposer> = new Array();

    constructor(props:IProps) {
        super(props);

        const { t } = props;

        this.state = {
            nodes: [
                {
                    id: 0,
                    hasCaret: true,
                    isExpanded: true,
                    label: t('FAVORITES_PANEL.SHORTCUTS'),
                    childNodes: []
                },
                {
                    id: 1,
                    hasCaret: true,
                    isExpanded: true,
                    label: t('FAVORITES_PANEL.PLACES'),
                    childNodes: []
                }
            ],
            selectedNode: null
        };

        this.favoritesState = this.injected.appState.favoritesState;

        this.installReaction();
        this.bindLanguageChange();
    }

    private bindLanguageChange = () => {
        console.log('languageChanged');
        i18next.on('languageChanged', this.onLanguageChanged);
    }

    private unbindLanguageChange = () => {
        i18next.off('languageChanged', this.onLanguageChanged);
    }

    public onLanguageChanged = (lang: string) => {
        console.log('building nodes', lang);
        this.buildNodes(this.favoritesState);
    }    

    private get injected() {
        return this.props as InjectedProps;
    }

    componentWillUnmount() {
        this.disposers.forEach(disposer => disposer());
        this.unbindLanguageChange();
    }

    private installReaction() {
        this.disposers.push(reaction(
            () => toJS(this.favoritesState.places),
            (_: Favorite[]) => {
                if (!this.props.hide) {
                    console.log('places updated: need to rebuild nodes');
                    this.buildNodes(this.favoritesState);
                }
            })
        );
    }

    /**
     * 
     * @param path string attempts to find the first node with the given path
     * 
     * @returns ITreeNode<string> | null
     */
    getNodeFromPath(path:string):ITreeNode<string> {
        const { nodes } = this.state;
        const shortcuts = nodes[0].childNodes;

        const found = shortcuts.find(node => node.nodeData === path);
        
        if (found) {
            return found;
        } else {
            const places = nodes[1].childNodes;
            return places.find(node => node.nodeData === path);
        }
    }

    setActiveNode(path:string) {
        const { nodes } = this.state;
        nodes.forEach(node => 
            node.childNodes.forEach(childNode => childNode.isSelected = false)
        );

        // get active path based on path
        const selectedNode = this.getNodeFromPath(path);
        if (selectedNode) {
            selectedNode.isSelected = true;
        }
    }

    getActiveCachePath():string {
        const { appState } = this.injected;
        const activeCache = appState.getActiveCache();

        if (activeCache) {
            return activeCache.path;
        } else {
            return '';
        }
    }

    onNodeClick = (node: ITreeNode<string>) => {
        const { appState } = this.injected;
        const activeCache = appState.getActiveCache();

        if (activeCache && activeCache.status === 'ok') {
            activeCache.cd(node.nodeData)
            .catch((err: any) => {
                AppAlert.show(`${err.message} (${err.code})`, {
                    intent: 'danger'
                });
            });
        }
    }

    onNodeToggle = (node: ITreeNode<string>) => {
        node.isExpanded = !node.isExpanded;
        this.setState(this.state);
    }

    buildNodes(favorites:FavoritesState) {
        const { t } = this.props;
        const { nodes } = this.state;
        const shortcuts = nodes[0];
        const places = nodes[1];

        shortcuts.childNodes = favorites.shortcuts.map((shortcut, i) => ({
            id: `s_${shortcut.path}`,
            key: `s_${shortcut.path}`,
            label: <span title={shortcut.path}>
                    {shortcut.label === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${shortcut.label}`)}
                    </span>,
            icon: Icons[shortcut.label],
            nodeData: shortcut.path
        }));

        places.childNodes = favorites.places.map((place) => ({
            id: `p_${place.path}`,
            key: `p_${place.path}`,
            label: <span title={place.path}>{place.label}</span>,
            icon: place.icon,
            nodeData: place.path
        }));

        // update root nodes label too
        places.label = t('FAVORITES_PANEL.PLACES');
        shortcuts.label = t('FAVORITES_PANEL.SHORTCUTS');

        this.setState(this.state);
    }

    render() {
        console.log('LeftPanel.render');
        const path = this.getActiveCachePath();
        this.setActiveNode(path);
        const { nodes } = this.state;
        const classnames = classNames(`favoritesPanel ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`, {
            hidden: this.props.hide
        });

        return <Tree 
            contents={nodes}
            onNodeClick={this.onNodeClick}
            onNodeCollapse={this.onNodeToggle}
            onNodeExpand={this.onNodeToggle}
            className={classnames} />;
    }
}

const LeftPanel = withNamespaces()(LeftPanelClass);

export { LeftPanel };
