import * as React from "react";
import { Tree, ITreeNode } from "@blueprintjs/core";
import { observer, inject } from "mobx-react";
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { USERNAME } from "../utils/platform";
import Icons from "../constants/icons";
import { FavoritesState } from "../state/favoritesState";
import { AppState } from "../state/appState";
import { AppAlert } from "./AppAlert";

require("../css/favoritesPanel.css");

interface LeftPanelState {
    nodes: ITreeNode<string>[];
    selectedNode: ITreeNode;
}

interface InjectedProps extends WithNamespaces {
    appState: AppState;
}

@inject('appState')
@observer
export class LeftPanelClass extends React.Component<WithNamespaces, LeftPanelState> {
    favoritesState: FavoritesState;

    constructor(props:WithNamespaces) {
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

        this.favoritesState = new FavoritesState();
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    getItemClassName(path: string) {
        // const { nodes } = this.state;
        // return path === this.state.selectedPath ? 'active' : '';
    }

    onNodeClick = (node: ITreeNode<string>) => {
        const { appState } = this.injected;
        const activeCache = appState.getActiveCache();

        if (activeCache) {
            activeCache.cd(node.nodeData)
            .catch((err: any) => {
                AppAlert.show(`${err.message} (${err.code})`, {
                    intent: 'danger'
                // }).then(() => {
                //     // we restore the wrong path entered and focus the input:
                //     // in case the user made a simple typo he doesn't want
                //     // to type it again
                //     this.setState({ path });
                //     this.input.focus();
                });
            });
        }
    }

    onNodeToggle = (node: ITreeNode<string>) => {
        node.isExpanded = !node.isExpanded;
        this.setState(this.state);
    }

    buildNodes(favorites:FavoritesState) {
        console.log('building nodes');
        const { t } = this.props;
        const { nodes } = this.state;
        const shortcuts = nodes[0];
        const places = nodes[1];

        shortcuts.childNodes = favorites.shortcuts.map((shortcut, i) => ({
            id: `s_${shortcut.path}`,
            key: `s_${shortcut.path}`,
            label: shortcut.label === 'HOME_DIR' ? USERNAME: t(`FAVORITES_PANEL.${shortcut.label}`),
            icon: Icons[shortcut.label],
            title: shortcut.path,
            nodeData: shortcut.path
        }));

        places.childNodes = favorites.places.map((place, i) => ({
            id: `p_${place.path}`,
            key: `p_${place.path}`,
            label: place.label,
            icon: place.icon,
            title: place.path,
            nodeData: place.path
        }));

        console.log('built nodes', shortcuts.childNodes, places.childNodes);
    }

    render() {
        // since we are an observer, render will automatically be called
        // every time favorites are updated
        this.buildNodes(this.favoritesState);
        const { nodes } = this.state;

        return <Tree 
            contents={nodes}
            onNodeClick={this.onNodeClick}
            onNodeCollapse={this.onNodeToggle}
            onNodeExpand={this.onNodeToggle}
            className="favoritesPanel" />;
    }
}

const LeftPanel = withNamespaces()(LeftPanelClass);

export { LeftPanel };
