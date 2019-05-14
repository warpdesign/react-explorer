import * as React from 'react';
import { ITreeNode, Tree, Icon } from '@blueprintjs/core';
import { AppState } from '../state/appState';
import { inject } from 'mobx-react';
import { Batch } from '../transfers/batch';
import { reaction, toJS, IReactionDisposer } from 'mobx';
import i18next from 'i18next';
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { formatBytes } from '../utils/formatBytes';

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

        // nodes are only generated after the transfers have changed
        // changing the language will cause a new render, but with the
        // same nodes (using the previous language)
        // we listen for the languageChange event and re-generated the nodes
        // with the updated language
        this.bindLanguageChange();
    }

    private installReaction() {
        this.disposer = reaction(
            () => { return toJS(this.appState.transfers) },
            (transfers: Batch[]) => {
                this.setState({ nodes: this.getTreeData(transfers) });
            }
        );
    }

    private bindLanguageChange = () => {
        i18next.on('languageChanged', this.onLanguageChanged);
    }

    private unbindLanguageChange = () => {
        i18next.off('languageChanged', this.onLanguageChanged);
    }

    public onLanguageChanged = (lang: string) => {
        const nodes = this.getTreeData(this.appState.transfers);
        this.setState({ nodes });
    }

    private get injected() {
        return this.props as InjectedProps;
    }

    componentWillUnMount() {
        this.unbindLanguageChange();
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

    onCloseClick(transferId: number, fileId: number) {
        const appState = this.appState;
        const transfer = appState.getTransfer(transferId);
        if (transfer.hasEnded) {
            appState.removeTransfer(transferId);
        }
    }

    getTreeData(transfers: Batch[]) {
        const treeData: ITreeNode[] = [];

        for (let transfer of transfers) {
            const sizeStr = transfer.status !== 'calculating' && formatBytes(transfer.size) || '';
            const transferProgress = formatBytes(transfer.progress);

            const node: ITreeNode =
            {
                id: transfer.id,
                hasCaret: true,
                icon: "duplicate",
                label: `${transfer.srcName} ⇢ ${transfer.dstName}`,
                secondaryLabel: (<span>{`${transfer.status} - ${transferProgress} ${sizeStr}`} <Icon className="action" onClick={() => this.onCloseClick(transfer.id, -1)} intent="danger" icon="small-cross" /></span>),
                isExpanded: !!this.state.expandedNodes[transfer.id],
                childNodes: []
            };

            let i = 0;
            for (let file of transfer.files) {
                if (!file.file.isDir) {
                    const fileProgress = formatBytes(file.progress);
                    const id = transfer.id + '_' + i;
                    // console.log(file.file.dir.split('/')[file.file.dir.split('/').length -1]);
                    node.childNodes.push({
                        id: id,
                        icon: 'document',
                        label: file.subDirectory ? (file.subDirectory + '/' + file.file.fullname) : file.file.fullname,
                        secondaryLabel: (<span>{`${file.status} - ${fileProgress}`} <Icon className="action" onClick={() => this.onCloseClick(transfer.id, i)} intent="danger" icon="small-cross" /></span>)
                    });
                    i++;
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

        console.log('render downloads tree', t('DOWNLOADS.EMPTY_TITLE'));

        if (nodes.length) {
            return (
                <Tree
                    className="downloads"
                    contents={nodes}
                    onNodeCollapse={this.handleNodeCollapse}
                    onNodeExpand={this.handleNodeExpand}
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
