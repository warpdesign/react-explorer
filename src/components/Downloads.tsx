import * as React from 'react';
import { Callout, Code, ITreeNode, Tree, Icon, Button } from '@blueprintjs/core';
import { AppState } from '../state/appState';
import { inject } from 'mobx-react';
import { Batch } from '../transfers/batch';
import { reaction, toJS, IReactionDisposer } from 'mobx';
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { formatBytes } from '../utils/formatBytes';
import { getTargetTagName } from '../utils/dom';

interface IProps extends WithNamespaces {
    hide: boolean;
}

interface InjectedProps extends IProps {
    appState: AppState;
}

interface expandables {
    [key: string]: boolean
}

interface IState {
    nodes: ITreeNode[],
    expandedNodes: expandables
}

@inject('appState')
class DownloadsClass extends React.Component<IProps, IState> {
    private disposer: IReactionDisposer;
    private appState: AppState;

    constructor(props: IProps) {
        super(props);

        this.appState = this.injected.appState;

        this.state = {
            nodes: this.getTreeData(this.appState.transfers),
            expandedNodes: {}
        };

        this.installReaction();
    }

    private installReaction() {
        this.disposer = reaction(
            () => { return toJS(this.appState.transfers) },
            (transfers: Batch[]) => {
                this.setState({ nodes: this.getTreeData(transfers) });
            }
        );
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    private handleNodeCollapse = (nodeData: ITreeNode) => {
        const { expandedNodes } = this.state;
        expandedNodes[nodeData.id] = false;
        nodeData.isExpanded = false;

        this.setState(this.state);
    };

    private handleNodeExpand = (nodeData: ITreeNode) => {
        const { expandedNodes } = this.state;
        expandedNodes[nodeData.id] = true;
        nodeData.isExpanded = true;
        this.setState(this.state);
    };

    private handleActionClick = (nodeData: ITreeNode, nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        console.log('need to handle action click');
    };

    private handleNodeClick = (nodeData: ITreeNode, nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        if (getTargetTagName(e.nativeEvent).match(/svg|path/)) {
            this.handleActionClick(nodeData, nodePath, e);
        } else {
            debugger;
        }
    };

    getTreeData(transfers: Batch[]) {
        const treeData: ITreeNode[] = [];

        for (let transfer of transfers) {
            let i = transfer.id;
            const sizeStr = transfer.status !== 'calculating' && formatBytes(transfer.size) || '';
            const transferProgress = formatBytes(transfer.progress);

            const node: ITreeNode =
            {
                id: i++,
                hasCaret: true,
                icon: "duplicate",
                label: `${transfer.srcName} ⇢ ${transfer.dstName}`,
                secondaryLabel: (<span>{`${transfer.status} - ${transferProgress} ${sizeStr}`} <Icon className="action" intent="danger" icon="small-cross" /></span>),
                isExpanded: !!this.state.expandedNodes[transfer.id],
                childNodes: []
            };

            for (let file of transfer.files) {
                if (!file.file.isDir) {
                    const fileProgress = formatBytes(file.progress);
                    // console.log(file.file.dir.split('/')[file.file.dir.split('/').length -1]);
                    node.childNodes.push({
                        id: i++,
                        icon: 'document',
                        label: file.subDirectory ? (file.subDirectory + '/' + file.file.fullname) : file.file.fullname,
                        secondaryLabel: (<span>{`${file.status} - ${fileProgress}`} <Icon className="action" intent="danger" icon="small-cross" /></span>)
                    });
                }
            }

            treeData.push(node);
        }

        return treeData;
    }

    componentWillUnmount() {
        this.disposer();
    }

    renderTransferTree() {
        console.log('render');
        const { nodes } = this.state;
        const { t } = this.props;

        console.log('render downloads tree');

        if (nodes.length) {
            return (
                <Tree
                    className="downloads"
                    contents={nodes}
                    onNodeCollapse={this.handleNodeCollapse}
                    onNodeExpand={this.handleNodeExpand}
                    onNodeClick={this.handleNodeClick}
                />
            );
        } else {
            return (
                <div className="downloads empty">
                    <Icon iconSize={80} icon="document" color="#d9dde0"></Icon>
                    <p style={{ textAlign: 'center' }}>
                        {t('DOWNLOADS.EMPTY_TITLE')}
                    </p>
                </div>
            );
        }

    }

    // shouldComponentUpdate() {
    //     console.time('Downloads Render');
    //     return true;
    // }

    // componentDidUpdate() {
    //     console.timeEnd('Downloads Render');
    // }

    render() {
        if (this.props.hide) {
            return null;
        } else {
            return this.renderTransferTree();
        }
    }
}

const Downloads = withNamespaces()(DownloadsClass);

export { Downloads };
