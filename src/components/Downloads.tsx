import * as React from 'react';
import { Callout, Code, ITreeNode, Tree, Icon, Button } from '@blueprintjs/core';
import { AppState } from '../state/appState';
import { inject } from 'mobx-react';
import { Batch } from '../transfers/batch';
import { reaction, toJS, IReactionDisposer } from 'mobx';
import { throws } from 'assert';

interface IProps {
    hide: boolean;
}

interface InjectedProps extends IProps {
    appState: AppState;
}

interface IState {
    nodes: ITreeNode[]
}

@inject('appState')
export class Downloads extends React.Component<IProps, IState> {
    private disposer: IReactionDisposer;
    private appState: AppState;

    constructor(props: IProps) {
        super(props);

        this.appState = this.injected.appState;

        this.state = {
            nodes: this.getTreeData(this.appState.transfers)
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
        nodeData.isExpanded = false;
        this.setState(this.state);
    };

    private handleNodeExpand = (nodeData: ITreeNode) => {
        nodeData.isExpanded = true;
        this.setState(this.state);
    };

    private handleActionClick = (nodeData: ITreeNode, nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        console.log('need to handle action click');
    };

    private handleNodeClick = (nodeData: ITreeNode, nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).tagName.toLowerCase().match(/svg|path/)) {
            this.handleActionClick(nodeData, nodePath, e);
        } else {

        }
    };

    getTreeData(transfers: Batch[]) {
        const treeData: ITreeNode[] = [];

        for (let transfer of transfers) {
            let i = transfer.id;
            const node: ITreeNode =
            {
                id: i++,
                hasCaret: true,
                icon: "folder-close",
                label: `${transfer.srcName} ⇢ ${transfer.dstName}`,
                secondaryLabel: (<span>{`${transfer.status} - ${transfer.progress}`} <Icon className="action" intent="danger" icon="small-cross" /></span>),
                isExpanded: true,
                childNodes: []
            };

            for (let file of transfer.files) {
                if (!file.file.isDir) {
                    node.childNodes.push({
                        id: i++,
                        icon: 'document',
                        label: file.file.fullname,
                        secondaryLabel: (<span>{`${file.status} - ${file.progress}`} <Icon className="action" intent="danger" icon="small-cross" /></span>)
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
                <Callout className="downloads" title="No downloads yet :)" intent="success" icon="tick-circle">
                    This section will help you monitor <Code>transfers</Code> that are in progress.
                </Callout>
            );
        }

    }

    render() {
        if (this.props.hide) {
            return null;
        } else {
            return this.renderTransferTree();
        }
    }
}