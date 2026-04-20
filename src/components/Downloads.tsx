import * as React from 'react'
import { ActionIcon, Box, Collapse, Group, Progress, Stack, Text } from '@mantine/core'
import { IconChevronDown, IconChevronRight, IconCircleFilled, IconFile, IconFolder, IconX } from '@tabler/icons-react'
import { IObservableArray, IReactionDisposer, reaction, runInAction, toJS } from 'mobx'
import { inject } from 'mobx-react'
import { WithTranslation, withTranslation } from 'react-i18next'
import i18next from 'i18next'

import { showAlertModal } from '$src/components/AppAlert'
import CONFIG from '$src/config/appConfig'
import { TypeIconsTabler } from '$src/constants/icons'
import { AppState } from '$src/state/appState'
import { TransferListState } from '$src/state/transferListState'
import type { FileTransfer, TransferState } from '$src/state/transferState'
import { formatBytes } from '$src/utils/formatBytes'
import { isWin } from '$src/utils/platform'

type IntentType = 'none' | 'primary' | 'success' | 'warning' | 'danger'

interface TransferTreeNode {
    transfer: TransferState
    intent: IntentType
}

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
    nodes: TransferTreeNode[]
    expandedNodes: Expandables
}

class DownloadsClass extends React.Component<Props, State> {
    private disposer!: IReactionDisposer
    private appState: AppState
    private transferListState: TransferListState

    constructor(props: Props) {
        super(props)

        this.appState = this.injected.appState
        this.transferListState = this.appState.transferListState

        this.state = {
            nodes: this.getTransferNodes(this.transferListState.transfers),
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
                this.setState({ nodes: this.getTransferNodes(transfers) })
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
        const nodes = this.getTransferNodes(this.transferListState.transfers)
        this.setState({ nodes })
    }

    private get injected(): InjectedProps {
        return this.props as InjectedProps
    }

    componentWillUnMount(): void {
        this.unbindLanguageChange()
    }

    private toggleTransfer = (transferId: number): void => {
        const { expandedNodes } = this.state
        expandedNodes[transferId] = !expandedNodes[transferId]
        this.setState({ expandedNodes })
    }

    showTransferAlert(): Promise<boolean> {
        const { t } = this.injected

        return showAlertModal({
            message: t('DIALOG.STOP_TRANSFER.MESSAGE'),
            cancelButtonText: t('DIALOG.STOP_TRANSFER.BT_CANCEL'),
            confirmButtonText: t('DIALOG.STOP_TRANSFER.BT_OK'),
            intent: 'warning',
            icon: 'warning-sign',
            modalId: 'transfer-alert',
        })
    }

    deleteTransfer(transferId: number) {
        runInAction(() => this.transferListState.removeTransfer(transferId))
    }

    async onCloseClick(transferId: number): Promise<void> {
        const transfer = this.transferListState.getTransfer(transferId)

        if (transfer?.hasEnded()) {
            this.deleteTransfer(transferId)
        } else {
            const cancel = await this.showTransferAlert()
            if (cancel) {
                this.deleteTransfer(transferId)
            }
        }
    }

    onFileDoubleClick = (transferId: number, transfer: FileTransfer): void => {
        if (transfer.status === 'done') {
            this.appState.openTransferredFile(transferId, transfer.file)
        }
    }

    getIntent(transfer: TransferState): IntentType {
        console.log(transfer.status, transfer)
        const status = transfer.status
        let intent: IntentType = 'none'
        if (!status.match(/queued|calculating/)) {
            intent = status.match(/error|cancelled/) ? 'danger' : status.match(/started/) ? 'primary' : 'success'
            if (status !== 'started') {
                // some errors
                const errors = transfer.errors
                if (errors) {
                    console.log('errors', errors, transfer.elements.length)
                    intent = errors === transfer.elements.length ? 'danger' : 'warning'
                }
            }
        }

        return intent
    }

    getIntentColor(intent: IntentType): string {
        const colorMap = {
            none: 'gray',
            primary: 'blue',
            success: 'green',
            warning: 'yellow',
            danger: 'red',
        }
        return colorMap[intent]
    }

    getTransferIcon(intent: IntentType): JSX.Element {
        return <IconCircleFilled size={16} color={`var(--mantine-color-${this.getIntentColor(intent)}-6)`} />
    }

    getFileIcon(filetype: string): React.ComponentType {
        return (filetype && TypeIconsTabler[filetype]) || TypeIconsTabler['any']
    }

    createTransferLabel(transfer: TransferState, className: string): JSX.Element {
        const { t } = this.injected
        const sizeFormatted = formatBytes(transfer.size)
        const ended = transfer.hasEnded()
        const transferSize = (transfer.status !== 'calculating' && sizeFormatted) || ''
        const currentSize = ended ? sizeFormatted : formatBytes(transfer.progress)
        const percent = transfer.status === 'calculating' ? 0 : (transfer.progress / transfer.size) * 100
        const errors = transfer.errors
        const rightLabel = ended
            ? errors
                ? t('DOWNLOADS.FINISHED_ERRORS')
                : t('DOWNLOADS.FINISHED')
            : t('DOWNLOADS.PROGRESS', { current: currentSize, size: transferSize })

        return (
            <span className={className}>
                {!ended && (
                    <Progress
                        value={percent}
                        color="blue"
                        size="xs"
                        style={{ minWidth: '100px', display: 'inline-block', marginRight: '8px' }}
                    />
                )}
                {rightLabel}
                <ActionIcon
                    className="action"
                    onClick={(e) => {
                        e.stopPropagation()
                        this.onCloseClick(transfer.id)
                    }}
                    color="red"
                    variant="transparent"
                    size="sm"
                >
                    <IconX size={14} />
                </ActionIcon>
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

        const color = isError ? 'red' : done ? 'green' : undefined

        if (isError) {
            errorMessage = (isError && file.error && file.error.message) || t('DOWNLOADS.ERROR')
        } else if (isCancelled) {
            errorMessage = (isCancelled && file.error && file.error.message) || t('DOWNLOADS.CANCELLED')
        }

        return (
            <Text size="sm" c={color}>
                {started && t('DOWNLOADS.PROGRESS', { current: fileProgress, size: fileSize })}
                {queued && t('DOWNLOADS.QUEUED')}
                {!started && !queued && (done ? fileSize : errorMessage)}
            </Text>
        )
    }

    getTransferNodes(transfers: TransferState[]): TransferTreeNode[] {
        return transfers.map((transfer) => ({
            transfer,
            intent: this.getIntent(transfer),
        }))
    }

    componentWillUnmount(): void {
        this.disposer()
    }

    renderTransferTree(): JSX.Element {
        const { nodes, expandedNodes } = this.state
        const { t } = this.props
        const sep = isWin ? '\\' : '/'

        if (nodes.length) {
            return (
                <Stack gap={0} className={`downloads ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`}>
                    {nodes.map(({ transfer, intent }) => {
                        const isExpanded = expandedNodes[transfer.id]
                        const color = this.getIntentColor(intent)
                        const ChevronIcon = isExpanded ? IconChevronDown : IconChevronRight

                        return (
                            <Box key={transfer.id}>
                                <Group
                                    gap="xs"
                                    p="xs"
                                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--mantine-color-gray-3)' }}
                                    onClick={() => this.toggleTransfer(transfer.id)}
                                >
                                    <ChevronIcon size={16} />
                                    <IconCircleFilled size={12} color={`var(--mantine-color-${color}-6)`} />
                                    <Text size="sm" style={{ flex: 1 }}>
                                        {transfer.srcName} ⇢ {transfer.dstName}
                                    </Text>
                                    {this.createTransferLabel(transfer, '')}
                                </Group>
                                <Collapse in={isExpanded}>
                                    <Stack gap={0} pl="xl">
                                        {transfer.elements.map((element, i) => {
                                            if (!element.file.isDir || element.status === 'error') {
                                                const { file } = element
                                                const filetype = file.type
                                                const FileIcon = file.isDir ? IconFolder : this.getFileIcon(filetype)
                                                const fileName = element.subDirectory
                                                    ? element.subDirectory + sep + file.fullname
                                                    : file.fullname

                                                return (
                                                    <Group
                                                        key={`${transfer.id}_${i}`}
                                                        gap="xs"
                                                        p="xs"
                                                        style={{
                                                            cursor: element.status === 'done' ? 'pointer' : 'default',
                                                            borderBottom: '1px solid var(--mantine-color-gray-2)',
                                                        }}
                                                        onDoubleClick={() =>
                                                            this.onFileDoubleClick(transfer.id, element)
                                                        }
                                                    >
                                                        <FileIcon size={16} />
                                                        <Text size="sm" style={{ flex: 1 }}>
                                                            {fileName}
                                                        </Text>
                                                        {this.createFileRightLabel(element)}
                                                    </Group>
                                                )
                                            }
                                            return null
                                        })}
                                    </Stack>
                                </Collapse>
                            </Box>
                        )
                    })}
                </Stack>
            )
        } else {
            return (
                <div className="downloads empty">
                    <IconFile size={80} color="var(--mantine-color-gray-5)" />
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
