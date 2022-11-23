import * as React from 'react'
import { TreeNodeInfo, Tree, Icon, Intent, Classes, IconName, ProgressBar } from '@blueprintjs/core'
import { intentClass } from '@blueprintjs/core/lib/esm/common/classes'
import { reaction, toJS, IReactionDisposer, IObservableArray } from 'mobx'
import { inject } from 'mobx-react'
import i18next from 'i18next'
import { withTranslation, WithTranslation } from 'react-i18next'
import classNames from 'classnames'

import { AppState } from '$src/state/appState'
import type { TransferState, FileTransfer } from '$src/state/transferState'
import { formatBytes } from '$src/utils/formatBytes'
import { AppAlert } from '$src/components/AppAlert'
import CONFIG from '$src/config/appConfig'
import { isWin } from '$src/utils/platform'
import { TypeIcons } from '$src/constants/icons'
import { TransferListState } from '$src/state/transferListState'

interface Props extends WithTranslation {
    hide: boolean
}

interface InjectedProps extends Props {
    appState: AppState
}

interface Expandables {
    [key: string]: boolean
}

interface State {
    nodes: TreeNodeInfo[]
    expandedNodes: Expandables
}

interface NodeData {
    transferElement: FileTransfer
    transferId: number
}

class DownloadsClass extends React.Component<Props, State> {
    private disposer: IReactionDisposer
    private appState: AppState
    private transferListState: TransferListState

    constructor(props: Props) {
        super(props)

        this.appState = this.injected.appState
        this.transferListState = this.appState.transferListState

        this.state = {
            nodes: this.getTreeData(this.transferListState.transfers),
            expandedNodes: {},
        }

        this.installReaction()

        // nodes are only generated after the transfers have changed
        // changing the language will cause a new render, but with the
        // same nodes (using the previous language)
        // we listen for the languageChange event and re-generated the nodes
        // with the updated language
        this.bindLanguageChange()
    }

    private installReaction(): void {
        this.disposer = reaction(
            (): IObservableArray<TransferState> => {
                return toJS(this.transferListState.transfers)
            },
            (transfers: TransferState[]): void => {
                this.setState({ nodes: this.getTreeData(transfers) })
            },
            {
                delay: 500,
            },
        )
    }

    private bindLanguageChange = (): void => {
        i18next.on('languageChanged', this.onLanguageChanged)
    }

    private unbindLanguageChange = (): void => {
        i18next.off('languageChanged', this.onLanguageChanged)
    }

    public onLanguageChanged = (/* lang: string */): void => {
        const nodes = this.getTreeData(this.transferListState.transfers)
        this.setState({ nodes })
    }

    private get injected(): InjectedProps {
        return this.props as InjectedProps
    }

    componentWillUnMount(): void {
        this.unbindLanguageChange()
    }

    private handleNodeCollapse = (node: TreeNodeInfo): void => {
        const { expandedNodes } = this.state
        expandedNodes[node.id] = false
        node.isExpanded = false

        this.setState(this.state)
    }

    private handleNodeExpand = (node: TreeNodeInfo): void => {
        const { expandedNodes } = this.state
        expandedNodes[node.id] = true
        node.isExpanded = true
        this.setState(this.state)
    }

    showTransferAlert(): Promise<boolean> {
        const { t } = this.injected

        return AppAlert.show(t('DIALOG.STOP_TRANSFER.MESSAGE'), {
            cancelButtonText: t('DIALOG.STOP_TRANSFER.BT_CANCEL'),
            confirmButtonText: t('DIALOG.STOP_TRANSFER.BT_OK'),
            intent: Intent.WARNING,
            icon: 'warning-sign',
        })
    }

    async onCloseClick(transferId: number): Promise<void> {
        const transfer = this.transferListState.getTransfer(transferId)

        if (transfer.hasEnded) {
            this.transferListState.removeTransfer(transferId)
        } else {
            const cancel = await this.showTransferAlert()
            if (cancel) {
                this.transferListState.removeTransfer(transferId)
            }
        }
    }

    onNodeDoubleClick = (node: TreeNodeInfo, nodePath: number[]): void => {
        // no first-level: this is a file
        if (nodePath.length > 1) {
            const transfer = (node.nodeData as NodeData).transferElement
            const transferId = (node.nodeData as NodeData).transferId
            if (transfer.status === 'done') {
                this.appState.openTransferredFile(transferId, transfer.file)
            }
        }
    }

    onNodeClick = (node: TreeNodeInfo, nodePath: number[]): void => {
        // first-level node
        if (nodePath.length === 1) {
            const { expandedNodes } = this.state
            node.isExpanded = !node.isExpanded
            expandedNodes[node.id] = node.isExpanded

            this.setState(this.state)
        }
    }

    getIntent(transfer: TransferState): Intent {
        console.log(transfer.status, transfer)
        const status = transfer.status
        let intent: Intent = Intent.NONE
        if (!status.match(/queued|calculating/)) {
            intent = status.match(/error|cancelled/)
                ? Intent.DANGER
                : status.match(/started/)
                ? Intent.PRIMARY
                : Intent.SUCCESS
            if (status !== 'started') {
                // some errors
                const errors = transfer.errors
                if (errors) {
                    console.log('errors', errors, transfer.elements.length)
                    intent = errors === transfer.elements.length ? Intent.DANGER : Intent.WARNING
                }
            }
        }

        return intent
    }

    getTransferIcon(intent: Intent): JSX.Element {
        return <Icon icon="dot" className={Classes.TREE_NODE_ICON} intent={intent}></Icon>
    }

    getFileIcon(filetype: string): IconName {
        return (filetype && TypeIcons[filetype]) || TypeIcons['any']
    }

    createTransferLabel(transfer: TransferState, className: string): JSX.Element {
        const { t } = this.injected
        const sizeFormatted = formatBytes(transfer.size)
        const ended = transfer.hasEnded
        const transferSize = (transfer.status !== 'calculating' && sizeFormatted) || ''
        const currentSize = ended ? sizeFormatted : formatBytes(transfer.progress)
        const percent = transfer.status === 'calculating' ? 0 : transfer.progress / transfer.size
        const errors = transfer.errors
        const rightLabel = ended
            ? errors
                ? t('DOWNLOADS.FINISHED_ERRORS')
                : t('DOWNLOADS.FINISHED')
            : t('DOWNLOADS.PROGRESS', { current: currentSize, size: transferSize })

        return (
            <span className={className}>
                {!ended && <ProgressBar value={percent} intent={Intent.PRIMARY} animate={false}></ProgressBar>}
                {rightLabel}
                <Icon
                    className="action"
                    onClick={(e) => {
                        e.stopPropagation()
                        this.onCloseClick(transfer.id)
                    }}
                    intent="danger"
                    icon="small-cross"
                />
            </span>
        )
    }

    createFileRightLabel(file: FileTransfer): JSX.Element {
        const { t } = this.injected
        const fileProgress = formatBytes(file.progress)
        const fileSize = formatBytes(file.file.length)
        const started = file.status.match(/started/)
        const queued = file.status.match(/queued/)
        const done = file.status.match(/done/)
        const isError = file.status.match(/error/)
        const isCancelled = file.status.match(/cancelled/)
        let errorMessage = ''

        const spanClass = classNames({
            [Classes.INTENT_DANGER]: isError,
            [Classes.INTENT_SUCCESS]: done,
        })

        if (isError) {
            errorMessage = (isError && file.error && file.error.message) || t('DOWNLOADS.ERROR')
        } else if (isCancelled) {
            errorMessage = (isCancelled && file.error && file.error.message) || t('DOWNLOADS.CANCELLED')
        }

        return (
            <span className={spanClass}>
                {started && t('DOWNLOADS.PROGRESS', { current: fileProgress, size: fileSize })}
                {queued && t('DOWNLOADS.QUEUED')}
                {!started && !queued && (done ? fileSize : errorMessage)}
            </span>
        )
    }

    getTreeData(transfers: TransferState[]): TreeNodeInfo[] {
        const treeData: TreeNodeInfo[] = []

        for (const transfer of transfers) {
            const intent = this.getIntent(transfer)
            const className = intentClass(intent)
            const sep = isWin ? '\\' : '/'
            const node: TreeNodeInfo = {
                id: transfer.id,
                hasCaret: true,
                icon: this.getTransferIcon(intent),
                label: (
                    <span className={className}>
                        {' '}
                        {transfer.srcName} ⇢ {transfer.dstName}
                    </span>
                ),
                secondaryLabel: this.createTransferLabel(transfer, className),
                isExpanded: !!this.state.expandedNodes[transfer.id],
                childNodes: [],
            }

            let i = 0
            for (const element of transfer.elements) {
                if (!element.file.isDir || element.status === 'error') {
                    const id = transfer.id + '_' + i
                    const { file } = element
                    const filetype = file.type

                    node.childNodes.push({
                        id: id,
                        icon: file.isDir ? 'folder-close' : this.getFileIcon(filetype),
                        label: element.subDirectory ? element.subDirectory + sep + file.fullname : file.fullname,
                        secondaryLabel: this.createFileRightLabel(element),
                        nodeData: {
                            transferElement: element,
                            transferId: transfer.id,
                        },
                    })
                    i++
                }
            }

            treeData.push(node)
        }

        return treeData
    }

    componentWillUnmount(): void {
        this.disposer()
    }

    renderTransferTree(): JSX.Element {
        // console.log('render');
        const { nodes } = this.state
        const { t } = this.props

        if (nodes.length) {
            return (
                <Tree
                    className={`downloads ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`}
                    contents={nodes}
                    onNodeCollapse={this.handleNodeCollapse}
                    onNodeExpand={this.handleNodeExpand}
                    onNodeClick={this.onNodeClick}
                    onNodeDoubleClick={this.onNodeDoubleClick}
                />
            )
        } else {
            return (
                <div className="downloads empty">
                    <Icon iconSize={80} icon="document" color="#d9dde0"></Icon>
                    <p style={{ textAlign: 'center' }}>{t('DOWNLOADS.EMPTY_TITLE')}</p>
                </div>
            )
        }
    }

    render(): React.ReactNode {
        if (this.props.hide) {
            return null
        } else {
            return this.renderTransferTree()
        }
    }
}

const Downloads = withTranslation()(inject('appState')(DownloadsClass))

export { Downloads }
