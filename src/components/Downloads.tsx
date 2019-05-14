import * as React from 'react';
import { ITreeNode, Tree, Icon, Intent, Classes, IconName, ProgressBar } from '@blueprintjs/core';
import { AppState } from '../state/appState';
import { inject } from 'mobx-react';
import { Batch } from '../transfers/batch';
import { reaction, toJS, IReactionDisposer } from 'mobx';
import i18next from 'i18next';
import { withNamespaces, WithNamespaces } from 'react-i18next';
import { formatBytes } from '../utils/formatBytes';
import { FileTransfer } from '../transfers/fileTransfer';
import classnames from 'classnames';

const TYPE_ICONS: { [key: string]: IconName } = {
    'img': 'media',
    'any': 'document',
    'snd': 'music',
    'vid': 'mobile-video',
    'exe': 'application',
    'arc': 'compressed',
    'doc': 'align-left',
    'cod': 'code'
};

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

    private handleNodeCollapse = (node: ITreeNode) => {
        const { expandedNodes } = this.state;
        expandedNodes[node.id] = false;
        node.isExpanded = false;

        console.log('collapse id', node.id);

        this.setState(this.state);
    };

    private handleNodeExpand = (node: ITreeNode) => {
        const { expandedNodes } = this.state;
        expandedNodes[node.id] = true;
        node.isExpanded = true;
        this.setState(this.state);
    };

    onCloseClick(transferId: number, fileId: number) {
        const appState = this.appState;
        const transfer = appState.getTransfer(transferId);
        if (transfer.hasEnded) {
            appState.removeTransfer(transferId);
        }
    }

    onNodeDoubleClick = (node: ITreeNode, nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        // no first-level: this is a file
        if (nodePath.length > 1) {
            const transfer = (node.nodeData as any).transfer;
            const batchId = (node.nodeData as any).batchId;
            if (transfer.status === 'done') {
                this.appState.openTransferedFile(batchId, transfer.file);
            }
        }
    }

    onNodeClick = (node: ITreeNode, nodePath: number[], e: React.MouseEvent<HTMLElement>) => {
        // first-level node
        if (nodePath.length === 1) {
            const { expandedNodes } = this.state;
            node.isExpanded = !node.isExpanded;
            expandedNodes[node.id] = node.isExpanded;

            this.setState(this.state);
        }
    }

    getTransferIcon(transfer: Batch) {
        const status = transfer.status;
        const intent = status.match(/error|cancelled/) ? Intent.DANGER : ((status === 'done' && Intent.SUCCESS) || Intent.NONE);
        console.log('status', status);

        return (<Icon icon="dot" className={Classes.TREE_NODE_ICON} intent={intent}></Icon>)
    }

    getFileIcon(filetype: string): IconName {
        return filetype && TYPE_ICONS[filetype] || TYPE_ICONS['any'];
    }

    createTransferLabel(transfer: Batch) {
        const { t } = this.injected;
        const sizeFormatted = formatBytes(transfer.size);
        const transferSize = transfer.status !== 'calculating' && sizeFormatted || '';
        const currentSize = formatBytes(transfer.progress);
        const percent = transfer.status === 'calculating' ? 0 : transfer.progress / transfer.size;
        const done = transfer.hasEnded;
        const rightLabel = done ? t('DOWNLOADS.FINISHED', { size: sizeFormatted }) : t('DOWNLOADS.PROGRESS', { current: currentSize, size: transferSize });

        return (
            <span>
                {!done && <ProgressBar value={percent} animate={false}></ProgressBar>}
                {rightLabel}
                <Icon className="action" onClick={() => this.onCloseClick(transfer.id, -1)} intent="danger" icon="small-cross" />
            </span>
        );
    }

    getFileRightLabel(file: FileTransfer) {
        const { t } = this.injected;
        const fileProgress = formatBytes(file.progress);
        const fileSize = formatBytes(file.file.length);
        const started = file.status.match(/started|queued/);
        const done = file.status.match(/done/);
        const isError = file.status.match(/error|cancelled/);
        const spanClass = classnames({
            [Classes.INTENT_DANGER]: isError
        })

        return (<span className={spanClass}>
            {started && t('DOWNLOADS.PROGRESS', { current: fileProgress, size: fileSize })}
            {!started && (done ? fileSize : t('DOWNLOADS.ERROR'))}
        </span>
        );
    }

    getTreeData(transfers: Batch[]) {
        const treeData: ITreeNode[] = [];

        for (let transfer of transfers) {
            const sizeStr = transfer.status !== 'calculating' && formatBytes(transfer.size) || '';
            console.log('progress', transfer.progress);
            const transferProgress = formatBytes(transfer.progress);
            const label = this.createTransferLabel(transfer);

            const node: ITreeNode =
            {
                id: transfer.id,
                hasCaret: true,
                icon: this.getTransferIcon(transfer),
                label: ` ${transfer.srcName} ⇢ ${transfer.dstName}`,
                secondaryLabel: this.createTransferLabel(transfer),
                isExpanded: !!this.state.expandedNodes[transfer.id],
                childNodes: []
            };

            let i = 0;
            for (let file of transfer.files) {
                if (!file.file.isDir) {
                    const id = transfer.id + '_' + i;
                    const filetype = file.file.type;

                    node.childNodes.push({
                        id: id,
                        icon: this.getFileIcon(filetype),
                        label: file.subDirectory ? (file.subDirectory + '/' + file.file.fullname) : file.file.fullname,
                        secondaryLabel: this.getFileRightLabel(file),
                        nodeData: {
                            transfer: file,
                            batchId: transfer.id
                        }
                    });
                    i++;
                    // <Icon className="action" onClick={() => this.onCloseClick(transfer.id, i)} intent="danger" icon="small-cross" /></span>
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
                    onNodeClick={this.onNodeClick}
                    onNodeDoubleClick={this.onNodeDoubleClick}
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
