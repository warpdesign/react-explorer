import React, { useEffect, useCallback, useState, useRef } from 'react'
import { ipcRenderer } from 'electron'
import { platform } from 'process'
import { FocusStyleManager, Alert, Classes, Intent } from '@blueprintjs/core'
import classNames from 'classnames'
import { Provider, observer } from 'mobx-react'
import { Trans, useTranslation } from 'react-i18next'

import { isMac } from '$src/utils/platform'
import { SideView } from '$src/components/SideView'
import { Downloads } from '$src/components/Downloads'
import { Nav } from '$src/components/Nav'
import { PrefsDialog } from '$src/components/dialogs/PrefsDialog'
import { ShortcutsDialog } from '$src/components/dialogs/ShortcutsDialog'
import { LeftPanel } from '$src/components/LeftPanel'
import { shouldCatchEvent } from '$src/utils/dom'
import { sendFakeCombo } from '$src/utils/keyboard'
import { MenuAccelerators } from '$src/components/shortcuts/MenuAccelerators'
import { KeyboardHotkeys } from '$src/components/shortcuts/KeyboardHotkeys'
import { useStores } from '$src/hooks/useStores'
import { useEventListener } from '$src/hooks/useEventListener'

import Keys from '$src/constants/keys'

import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import '@blueprintjs/popover2/lib/css/blueprint-popover2.css'
import '$src/css/main.css'
import '$src/css/windows.css'
import '$src/css/scrollbars.css'
import { reaction } from 'mobx'
import { ReactiveProperties } from '$src/types'
import { triggerUpdateMenus } from '$src/events'

const App = observer(() => {
    const { appState } = useStores('appState')
    const { t, i18n } = useTranslation()
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
    const refIsOverlayOpen = useRef(document.body.classList.contains('bp4-overlay-open'))

    const {
        settingsState,
        transferListState: { pendingTransfers, totalTransferProgress },
        isPrefsOpen,
        isShortcutsOpen,
        isExplorer,
    } = appState

    const cache = appState.getActiveCache()

    const progress = (pendingTransfers && totalTransferProgress) || -1

    const getReactiveProps = useCallback(() => {
        const activeView = appState.activeView
        const activeCache = activeView.getVisibleCache()
        const fs = activeCache.getFS()
        const API = activeCache.getAPI()

        return {
            // if any of these elements have changed
            // we'll have to update native menus
            status: activeCache.status,
            path: activeCache.path,
            selectedLength: activeCache.selected.length,
            historyLength: activeCache.history.length,
            historyCurrent: activeCache.current,
            isRoot: API.isRoot(activeCache.path),
            isReadonly: fs.options.readonly,
            isIndirect: fs.options.indirect,
            isOverlayOpen: refIsOverlayOpen.current,
            activeViewTabNums: activeView.caches.length,
            isExplorer: appState.isExplorer,
            language: settingsState.lang,
            filesLength: activeCache.files.length,
            clipboardLength: appState.clipboard.files.length,
            activeViewId: activeView.viewId,
        }
    }, [appState])

    useEffect(() => {
        const observer = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (mutation.attributeName === 'class') {
                    refIsOverlayOpen.current = document.body.classList.contains(Classes.OVERLAY_OPEN)
                    triggerUpdateMenus(t('APP_MENUS', { returnObjects: true }), getReactiveProps())
                }
            }
        })

        observer.observe(document.body, { attributes: true })

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        setDarkThemeClass()
    }, [settingsState.isDarkModeActive])

    useEffect(() => {
        !window.ENV.CY && ipcRenderer.invoke('window:setProgressBar', progress)
    }, [progress])

    useEffect(() => {
        // do not show outlines when using the mouse
        FocusStyleManager.onlyShowFocusOnTabs()

        document.body.classList.add('loaded', platform)

        if (window.ENV.CY || window.ENV.NODE_ENV === 'development') {
            window.appState = appState
            window.settingsState = settingsState
            window.renderer = ipcRenderer
        }

        console.log(
            `React-Explorer ${window.ENV.VERSION} - CY: ${window.ENV.CY} - NODE_ENV: ${window.ENV.NODE_ENV} - lang: ${i18n.language}`,
        )
        console.log(`hash=${window.ENV.HASH}`)
        console.log(
            `lang=${settingsState.lang}, darkMode=${settingsState.darkMode}, defaultFolder=${settingsState.defaultFolder}`,
        )

        ipcRenderer.on('exitRequest', onExitRequest)

        return () => {
            ipcRenderer.removeAllListeners('exitRequest')
        }
    }, [])

    const onShortcutsCombo = useCallback((e: KeyboardEvent): void => {
        // Little hack to prevent pressing tab key from focus an element:
        // we prevent the propagation of the tab key keydown event
        // but this will then prevent the menu accelerators from working
        // so we simply send a fakeCombo to avoid that.
        // We could simply disable outline using css but we want to keep
        // the app accessible.
        let caught = false
        if (e.ctrlKey) {
            switch (true) {
                case !window.ENV.CY && !isMac && e.key === Keys.A && shouldCatchEvent(e):
                    caught = true
                    sendFakeCombo('CmdOrCtrl+A')
                    break

                case e.key === Keys.TAB:
                    caught = true
                    const combo = e.shiftKey ? 'Ctrl+Shift+Tab' : 'Ctrl+Tab'
                    sendFakeCombo(combo)
                    break
            }
        } else if (shouldCatchEvent(e) && e.key === Keys.FORWARD_SLASH && e.shiftKey) {
            caught = true
        }

        if (caught) {
            e.stopPropagation()
            e.stopImmediatePropagation()
            e.preventDefault()
        }
    }, [])

    // Install menu reactions to update native menu when needed
    useEffect(() => {
        return reaction(
            (): ReactiveProperties => getReactiveProps(),
            (value) => {
                console.log('something changed!')
                triggerUpdateMenus(t('APP_MENUS', { returnObjects: true }), value)
            },
            {
                equals: (value: ReactiveProperties, previousValue: ReactiveProperties) => {
                    console.log(JSON.stringify(value) === JSON.stringify(previousValue))
                    console.log(JSON.stringify(value))
                    console.log(JSON.stringify(previousValue))

                    return JSON.stringify(value) === JSON.stringify(previousValue)
                },
            },
        )
    }, [])

    useEventListener('keydown', onShortcutsCombo, { capture: true })
    useEventListener(
        'copy',
        useCallback(
            (e: Event): void => {
                if (shouldCatchEvent(e)) {
                    cache && appState.clipboard.setClipboard(cache)
                }
            },
            [appState, cache],
        ),
    )
    useEventListener(
        'paste',
        useCallback(
            (e: Event): void => {
                if (shouldCatchEvent(e)) {
                    cache && appState.paste(cache)
                }
            },
            [appState, cache],
        ),
    )

    const setActiveView = (view: number): void => {
        const winState = appState.winStates[0]
        winState.setActiveView(view)
    }

    /**
     * stop click propagation in case click happens on an inactive sideview:
     * this prevents doing unwanted actions like selected elements when the
     * user simply wants to activate an inactive sideview
     */
    const handleClick = (e: React.MouseEvent): void => {
        const sideview = (e.target as HTMLElement).closest('.sideview')
        const filetable = (e.target as HTMLElement).closest('.fileListSizerWrapper')

        if (sideview) {
            const num = parseInt(sideview.id.replace('view_', ''), 10)
            const winState = appState.winStates[0]
            const view = winState.getView(num)
            if (!view.isActive) {
                // prevent selecting a row when the view gets activated
                // Note: only do that for left click
                // we want right click to activate the inactive view's menu
                if (filetable && e.button === 2) {
                    console.log('preventing event propagation', e.target)
                    e.stopPropagation()
                }
                setActiveView(num)
            }
        }
    }

    const onExitComboDown = (): void => onExitRequest()

    const onExitRequest = useCallback((): void => {
        console.log('exitRequest')
        if (appState && appState.transferListState.pendingTransfers) {
            setIsExitDialogOpen(true)
        } else {
            console.log('sending readyToExit event')
            ipcRenderer.invoke('readyToExit')
        }
    }, [setIsExitDialogOpen, appState.transferListState.pendingTransfers])

    const onExitDialogClose = (valid: boolean): void => {
        setIsExitDialogOpen(false)
        if (!valid) {
            appState.toggleExplorerTab(false)
        } else {
            ipcRenderer.invoke('readyToExit')
        }
    }

    const setDarkThemeClass = (): void => {
        if (settingsState.isDarkModeActive) {
            document.body.classList.add(Classes.DARK)
        } else {
            document.body.classList.remove(Classes.DARK)
        }
    }

    const count = appState.transferListState.pendingTransfers
    const { views, splitView } = appState.winStates[0]
    const mainClass = classNames('main', {
        singleView: !splitView,
        dualView: splitView,
    })

    return (
        <Provider settingsState={settingsState}>
            <React.Fragment>
                <Alert
                    cancelButtonText={t('DIALOG.QUIT.BT_KEEP_TRANSFERS')}
                    confirmButtonText={t('DIALOG.QUIT.BT_STOP_TRANSFERS')}
                    icon="warning-sign"
                    intent={Intent.WARNING}
                    onClose={onExitDialogClose}
                    isOpen={isExitDialogOpen}
                >
                    <p>
                        <Trans i18nKey="DIALOG.QUIT.CONTENT" count={count}>
                            There are <b>{{ count }}</b> transfers <b>in progress</b>.<br />
                            <br />
                            Exiting the app now will <b>cancel</b> the downloads.
                        </Trans>
                    </p>
                </Alert>
                <PrefsDialog isOpen={isPrefsOpen} onClose={() => appState.togglePrefsDialog(false)} />
                <ShortcutsDialog isOpen={isShortcutsOpen} onClose={() => appState.toggleShortcutsDialog(false)} />
                <MenuAccelerators onExitComboDown={onExitComboDown} />
                <KeyboardHotkeys />
                <Nav></Nav>
                <div onClickCapture={handleClick} onContextMenuCapture={handleClick} className={mainClass}>
                    <LeftPanel hide={!isExplorer}></LeftPanel>
                    <SideView viewState={views[0]} hide={!isExplorer} />
                    {splitView && <SideView viewState={views[1]} hide={!isExplorer} />}
                    <Downloads hide={isExplorer} />
                </div>
            </React.Fragment>
        </Provider>
    )
})

export { App }
