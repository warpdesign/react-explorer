import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    AppShell,
    Button as ButtonMantine,
    Modal,
    Radio,
    Select,
    Stack,
    Text,
    TextInput,
    colorsTuple,
    createTheme,
    virtualColor,
} from '@mantine/core'
import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import classNames from 'classnames'
import { ipcRenderer, webFrame } from 'electron'
import { reaction } from 'mobx'
import { Provider, observer } from 'mobx-react'
import { platform } from 'process'
import { Trans, useTranslation } from 'react-i18next'

import { PreviewDialog } from './dialogs/PreviewDialog'
import { Downloads } from '$src/components/Downloads'
import { LeftPanel } from '$src/components/LeftPanel'
import { Nav } from '$src/components/Nav'
import { SideView } from '$src/components/SideView'
import { PrefsDialog } from '$src/components/dialogs/PrefsDialog'
import { ShortcutsDialog } from '$src/components/dialogs/ShortcutsDialog'
import { KeyboardHotkeys } from '$src/components/shortcuts/KeyboardHotkeys'
import { MenuAccelerators } from '$src/components/shortcuts/MenuAccelerators'
import Keys from '$src/constants/keys'
import { triggerUpdateMenus } from '$src/events'
import { useEventListener } from '$src/hooks/useEventListener'
import { useStores } from '$src/hooks/useStores'
import { ReactiveProperties } from '$src/types'
import { shouldCatchEvent } from '$src/utils/dom'
import { sendFakeCombo } from '$src/utils/keyboard'
import { isMac } from '$src/utils/platform'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '$src/css/main.css'
import '$src/css/mantine-extensions.css'

const theme = createTheme({
    colors: {
        ['blue-background-dark']: colorsTuple('#293742'),
        ['blue-background-light']: colorsTuple('#ced9e080'),
        ['gray-light']: colorsTuple('#4a5056'),
        ['gray-dark']: colorsTuple('#eeeeee'),
        background: virtualColor({
            light: 'blue-background-light',
            dark: 'blue-background-dark',
            name: 'background',
        }),
        button: virtualColor({
            light: 'gray-light',
            dark: 'gray-dark',
            name: 'button',
        }),
    },
    components: {
        Select: Select.extend({
            styles: {
                label: { paddingBottom: '.2rem' },
            },
        }),
        TextInput: TextInput.extend({
            styles: {
                label: { paddingBottom: '.2rem' },
            },
        }),
        RadioGroup: Radio.Group.extend({
            styles: {
                label: { paddingBottom: '.2rem' },
            },
        }),
        Button: ButtonMantine.extend({
            styles: {
                inner: { justifyContent: 'left' },
            },
        }),
    },
})

const App = observer(() => {
    const { appState } = useStores('appState')
    const { t, i18n } = useTranslation()
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
    const refIsOverlayOpen = useRef(document.querySelector('[data-mantine-portal]') !== null)

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
            // enable when FsZip is merged
            isReadonly: false,
            isIndirect: false,
            historyLength: activeCache.history.length,
            historyCurrent: activeCache.current,
            isRoot: API.isRoot(activeCache.path),
            // isReadonly: activeCache.getFS().options.readonly,
            // isIndirect: activeCache.getFS().options.indirect,
            isOverlayOpen: refIsOverlayOpen.current,
            activeViewTabNums: activeView.caches.length,
            isExplorer: appState.isExplorer,
            language: settingsState.lang,
            filesLength: activeCache.files.length,
            clipboardLength: appState.clipboard.files.length,
            activeViewId: activeView.viewId,
            viewMode: activeView.getVisibleCache().viewmode,
            sortMethod: activeView.getVisibleCache().sortMethod,
            sortOrder: activeView.getVisibleCache().sortOrder,
            // missing: about opened, tab: is it needed?
        }
    }, [appState])

    useEffect(() => {
        const observer = new MutationObserver((mutationList) => {
            for (const mutation of mutationList) {
                if (mutation.attributeName === 'class' || mutation.type === 'childList') {
                    refIsOverlayOpen.current = document.querySelector('[data-mantine-portal]') !== null
                    triggerUpdateMenus(
                        t('APP_MENUS', { returnObjects: true }) as Record<string, string>,
                        getReactiveProps(),
                    )
                }
            }
        })

        observer.observe(document.body, { attributes: true, childList: true, subtree: true })

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        setDarkThemeClass()
    }, [settingsState.isDarkModeActive])

    useEffect(() => {
        !window.ENV.CY && ipcRenderer.invoke('window:setProgressBar', progress)
    }, [progress])

    useEffect(() => {
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

        webFrame.setVisualZoomLevelLimits(1, 4)

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
                triggerUpdateMenus(t('APP_MENUS', { returnObjects: true }) as Record<string, string>, value)
            },
            {
                equals: (value: ReactiveProperties, previousValue: ReactiveProperties) =>
                    JSON.stringify(value) === JSON.stringify(previousValue),
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
     * this prevents doing unwanted actions like selecting elements when the
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
        // Mantine handles dark mode via forceColorScheme prop, no need for body class
    }

    const count = appState.transferListState.pendingTransfers
    const { views, splitView } = appState.winStates[0]
    const mainClass = classNames('main', {
        singleView: !splitView,
        dualView: splitView,
    })

    return (
        <Provider settingsState={settingsState}>
            <MantineProvider theme={theme} forceColorScheme={(settingsState.isDarkModeActive && 'dark') || 'light'}>
                <Notifications position="top-center" />
                <ModalsProvider>
                    <AppShell
                        transitionDuration={0}
                        header={{ height: 50 }}
                        navbar={{
                            width: 200,
                            breakpoint: 'xs',
                            collapsed: { mobile: !isExplorer, desktop: !isExplorer },
                        }}
                        className={mainClass}
                    >
                        <Modal
                            opened={isExitDialogOpen}
                            onClose={() => onExitDialogClose(false)}
                            title={t('DIALOG.QUIT.TITLE')}
                            closeOnEscape={true}
                        >
                            <Stack gap="md">
                                <Text>
                                    <Trans
                                        i18nKey="DIALOG.QUIT.CONTENT"
                                        count={count}
                                        tOptions={{ interpolation: { prefix: '[[', suffix: ']]' } }}
                                    >
                                        There are <b>[[ count ]]</b> transfers <b>in progress</b>.<br />
                                        <br />
                                        Exiting the app now will <b>cancel</b> the downloads.
                                    </Trans>
                                </Text>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <ButtonMantine onClick={() => onExitDialogClose(false)} variant="default">
                                        {t('DIALOG.QUIT.BT_KEEP_TRANSFERS')}
                                    </ButtonMantine>
                                    <ButtonMantine onClick={() => onExitDialogClose(true)} color="red">
                                        {t('DIALOG.QUIT.BT_STOP_TRANSFERS')}
                                    </ButtonMantine>
                                </div>
                            </Stack>
                        </Modal>
                        <PrefsDialog isOpen={isPrefsOpen} onClose={() => appState?.togglePrefsDialog(false)} />
                        <ShortcutsDialog
                            isOpen={isShortcutsOpen}
                            onClose={() => appState?.toggleShortcutsDialog(false)}
                        />
                        <MenuAccelerators onExitComboDown={onExitComboDown} />
                        <KeyboardHotkeys />
                        <AppShell.Header>
                            <Nav />
                        </AppShell.Header>
                        {/* <div onClickCapture={handleClick} onContextMenuCapture={handleClick} className={mainClass}> */}
                        <AppShell.Navbar>
                            <LeftPanel hide={!isExplorer} />
                        </AppShell.Navbar>
                        <AppShell.Main h="100%" display={'flex'}>
                            {<SideView viewState={views[0]} hide={!isExplorer} />}
                            {splitView && <SideView viewState={views[1]} hide={!isExplorer} />}
                            <Downloads hide={isExplorer} />
                        </AppShell.Main>
                        {/* </div> */}
                        {cache?.cursor && <PreviewDialog />}
                    </AppShell>
                </ModalsProvider>
            </MantineProvider>
        </Provider>
    )
})

export { App }
