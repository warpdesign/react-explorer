import { useHotkeys } from '@mantine/hooks'
import { ipcRenderer } from 'electron'

import { useStores } from '$src/hooks/useStores'
import { FileState } from '$src/state/fileState'
import { isMac } from '$src/utils/platform'

const KeyboardHotkeys = (): JSX.Element | null => {
    const { appState } = useStores('appState')

    const getActiveFileCache = (ignoreStatus = false): FileState => {
        const state = appState.isExplorer && appState.getActiveCache()

        if (ignoreStatus || !state) {
            return state
        } else {
            return ignoreStatus ? state : (state.status === 'ok' && state) || null
        }
    }

    const onShowDownloadsTab = (): void => appState.toggleExplorerTab(false)

    const onShowExplorerTab = (): void => appState.toggleExplorerTab(true)

    const onNextView = (): void => {
        const winState = appState.winStates[0]
        // do nothing if single view
        if (winState.splitView) {
            // get the view that's not active
            const nextView = winState.inactiveView

            winState.setActiveView(nextView.viewId)
        }
    }

    const onBackwardHistory = (): void => {
        const cache = getActiveFileCache()
        if (cache) {
            cache.navHistory(-1)
        }
    }

    const onForwardHistory = (): void => {
        const cache = getActiveFileCache()
        if (cache) {
            cache.navHistory(1)
        }
    }

    const onOpenDevTools = (): void => {
        ipcRenderer.invoke('openDevTools')
    }

    const onDebugCache = (): void => {
        const cache = getActiveFileCache()
        console.log('====')
        console.log('cache selected length', cache.selected.length)
        console.log('cache.cursor', cache.cursor)
        console.log('cache.editingId', cache.editingId)
        console.log('===')
        console.log(cache.selected)
        console.log(cache)
    }

    const backwardHistoryHotkey: [string, (e: KeyboardEvent) => void] = isMac
        ? ['mod+ArrowLeft', onBackwardHistory]
        : ['alt+ArrowLeft', onBackwardHistory]
    const forwardHistoryHotkey: [string, (e: KeyboardEvent) => void] = isMac
        ? ['mod+ArrowRight', onForwardHistory]
        : ['alt+ArrowRight', onForwardHistory]

    useHotkeys([
        ['alt+mod+L', onShowDownloadsTab],
        ['alt+mod+E', onShowExplorerTab],
        ['ctrl+shift+ArrowRight', onNextView],
        ['ctrl+shift+ArrowLeft', onNextView],
        backwardHistoryHotkey,
        forwardHistoryHotkey,
        ['alt+mod+I', onOpenDevTools],
        ['mod+P', onDebugCache],
    ])

    return null
}

export { KeyboardHotkeys }
