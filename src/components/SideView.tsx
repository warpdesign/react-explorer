import React from 'react'
import { Icon, Spinner } from '@blueprintjs/core'
import { Provider, observer } from 'mobx-react'
import { useDrop } from 'react-dnd'
import classNames from 'classnames'

import { Statusbar } from '$src/components/Statusbar'
import { Toolbar } from '$src/components/Toolbar'
import { LoginDialog } from '$src/components/dialogs/LoginDialog'
import { Overlay } from '$src/components/Overlay'
import { FileView } from '$src/components/FileView'
import { TabList } from '$src/components/TabList'
import { ViewState } from '$src/state/viewState'
import { DraggedObject } from '$src/types'
import { useStores } from '$src/hooks/useStores'

interface SideViewProps {
    hide: boolean
    viewState: ViewState
}

export const SideView = observer(({ hide, viewState }: SideViewProps) => {
    const { appState } = useStores('appState')
    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: 'file',
            canDrop: ({ fileState }: DraggedObject) => {
                const sourceViewId = fileState.viewId
                const fileCache = viewState.getVisibleCache()
                return viewState.viewId !== sourceViewId && fileCache.status !== 'busy' && !fileCache.error
            },
            drop: (item) => appState.drop(item, viewState.getVisibleCache()),
            collect: (monitor) => ({
                isOver: !!monitor.isOver(),
                canDrop: !!monitor.canDrop(),
            }),
        }),
        [hide],
    )

    const onValidation = (/*dir: string*/): boolean => true

    const onClose = (): void => {
        const fileCache = viewState.getVisibleCache()
        // doesn't work: it keeps the previous fs
        fileCache.revertPath()
    }

    const fileCache = viewState.getVisibleCache()
    const active = appState.getViewFromCache(fileCache).isActive
    const dropAndOver = isOver && canDrop
    const divId = 'view_' + viewState.viewId

    const activeClass = classNames('sideview', {
        active,
        inactive: !active,
        hidden: hide,
        dropTarget: dropAndOver,
        notDropTarget: isOver && !canDrop,
    })

    const needLogin = fileCache.status === 'login'
    const busy = fileCache.status === 'busy'
    const dropOverlayIcon = isOver && !canDrop ? 'cross' : 'import'
    const dropOverlayActive = isOver

    return (
        <Provider viewState={viewState}>
            <div ref={drop} id={divId} className={activeClass}>
                {needLogin && <LoginDialog isOpen={needLogin} onValidation={onValidation} onClose={onClose} />}
                <TabList></TabList>
                <Toolbar active={!busy} />
                <FileView hide={hide} />
                <Statusbar />
                <Overlay id={`files-loader-${viewState.viewId}`} shouldShow={busy} delay={true}>
                    <Spinner />
                </Overlay>
                <Overlay shouldShow={dropOverlayActive} id={`drop-overlay-${viewState.viewId}`}>
                    <Icon icon={dropOverlayIcon} size={80} color="#d9dde0" />
                </Overlay>
            </div>
        </Provider>
    )
})
