import * as React from 'react'
import { Icon, IconSize, Spinner } from '@blueprintjs/core'
import { inject, Provider, observer } from 'mobx-react'
import { withTranslation, WithTranslation } from 'react-i18next'
import {
    DropTargetSpec,
    DropTargetConnector,
    DropTargetMonitor,
    DropTargetCollector,
    ConnectDropTarget,
    DropTarget,
} from 'react-dnd'
import classNames from 'classnames'

import { Statusbar } from '$src/components/Statusbar'
import { Toolbar } from '$src/components/Toolbar'
import { AppState } from '$src/state/appState'
import { LoginDialog } from '$src/components/dialogs/LoginDialog'
import { Overlay } from '$src/components/Overlay'
import { FileTable } from '$src/components/filetable'
import { TabList } from '$src/components/TabList'
import { ViewState } from '$src/state/viewState'
import { CollectedProps, DraggedObject } from '$src/components/filetable/RowRenderer'

interface SideViewProps extends WithTranslation {
    hide: boolean
    viewState: ViewState
    onPaste: () => void
    connectDropTarget?: ConnectDropTarget
    isOver?: boolean
    canDrop?: boolean
}

interface InjectedProps extends SideViewProps {
    appState?: AppState
}

const fileTarget: DropTargetSpec<InjectedProps> = {
    canDrop(props: InjectedProps, monitor): boolean {
        // prevent drag and drop in same sideview for now
        const sourceViewId = monitor.getItem().fileState.viewId
        const viewState = props.viewState
        const fileCache = viewState.getVisibleCache()
        return props.viewState.viewId !== sourceViewId && fileCache.status !== 'busy' && !fileCache.error
    },
    drop(props, monitor, component): void {
        const item = monitor.getItem()
        const sideView = component
        sideView.onDrop(item)
    },
}

const collect: DropTargetCollector<CollectedProps, InjectedProps> = (
    connect: DropTargetConnector,
    monitor: DropTargetMonitor,
) => {
    return {
        connectDropTarget: connect.dropTarget(),
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
    }
}

export const SideViewClass = inject('appState')(
    observer(
        class SideViewClass extends React.Component<InjectedProps> {
            constructor(props: InjectedProps) {
                super(props)
            }

            get injected(): InjectedProps {
                return this.props as InjectedProps
            }

            onValidation = (/*dir: string*/): boolean => {
                return true
            }

            onClose = (): void => {
                // login cancelled
                const { viewState } = this.props
                const fileCache = viewState.getVisibleCache()
                // doesn't work: it keeps the previous fs
                fileCache.revertPath()
            }

            renderSideView(): React.ReactNode {
                const { viewState, connectDropTarget, canDrop, isOver } = this.props
                const fileCache = viewState.getVisibleCache()
                const appState = this.injected.appState
                const active = appState.getViewFromCache(fileCache).isActive
                const dropAndOver = isOver && canDrop
                const divId = 'view_' + viewState.viewId

                const activeClass = classNames('sideview', {
                    active: active,
                    inactive: !active,
                    hidden: this.props.hide,
                    dropTarget: dropAndOver,
                    notDropTarget: isOver && !canDrop,
                })

                const needLogin = fileCache.status === 'login'
                const busy = fileCache.status === 'busy'
                const dropOverlayActive = isOver
                const dropOverlayIcon = isOver && !canDrop ? 'cross' : 'import'

                return connectDropTarget(
                    <div id={divId} className={activeClass}>
                        {needLogin && (
                            <LoginDialog isOpen={needLogin} onValidation={this.onValidation} onClose={this.onClose} />
                        )}
                        <TabList></TabList>
                        <Toolbar active={active && !busy} onPaste={this.props.onPaste} />
                        <FileTable hide={this.props.hide} />
                        <Statusbar />
                        <Overlay active={busy}>
                            <Spinner />
                        </Overlay>
                        <Overlay active={dropOverlayActive}>
                            <Icon icon={dropOverlayIcon} size={80} color="#d9dde0" />
                        </Overlay>
                    </div>,
                )
            }

            onDrop(item: DraggedObject /*| DataTransfer*/) {
                const { appState, viewState } = this.injected
                appState.drop(item, viewState.getVisibleCache())
                debugger
            }

            render(): React.ReactNode {
                const { viewState } = this.props

                return <Provider viewState={viewState}>{this.renderSideView()}</Provider>
            }
        },
    ),
)

const SideViewDD = DropTarget<InjectedProps>('file', fileTarget, collect)(SideViewClass)

const SideView = withTranslation()(SideViewDD)

export { SideView }
