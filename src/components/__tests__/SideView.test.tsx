import React from 'react'

import { render, screen, vol, t, waitFor, wait } from 'rtl'
import { ViewState } from '$src/state/viewState'
import { AppState } from '$src/state/appState'
import { filterFiles, filterDirs } from '$src/utils/fileUtils'
import { SideView } from '../SideView'

describe('SideView', () => {
    const state = new AppState()
    const options = {
        providerProps: {
            appState: state,
            settingsState: state.settingsState,
        },
    }

    const buildStatusBarText = () => {
        const cache = PROPS.viewState.getVisibleCache()
        const files = filterFiles(cache.files).length
        const folders = filterDirs(cache.files).length

        return `${t('STATUS.FILES', { count: files })}, ${t('STATUS.FOLDERS', {
            count: folders,
        })}`
    }

    const PROPS = {
        hide: false,
        viewState: undefined as ViewState,
    }

    beforeEach(async () => {
        const appState = new AppState()
        const { providerProps } = options
        providerProps.appState = appState
        providerProps.settingsState = appState.settingsState
        await options.providerProps.appState.loadSettingsAndPrepareViews()
        PROPS.viewState = appState.winStates[0].activeView
        await waitFor(() => expect(PROPS.viewState.getVisibleCache().status).toBe('ok'))
        jest.clearAllMocks()
    })

    it('should render SideView', async () => {
        render(<SideView {...PROPS} />, options)

        // tab
        expect(screen.getByText('virtual')).toBeInTheDocument()

        // toolbar
        expect(screen.getByDisplayValue('/virtual')).toBeInTheDocument()

        // files loader
        expect(screen.getByTestId('files-loader-0')).toBeInTheDocument()

        // fileview
        const files = Object.keys(vol.toJSON())
            .map((path) => path.replace('/virtual/', ''))
            .filter((file) => !file.startsWith('.'))

        for (const file of files) {
            expect(await screen.findByText(file)).toBeInTheDocument()
        }

        // status bar
        expect(screen.getByText(buildStatusBarText())).toBeInTheDocument()

        // overlay d&d
        expect(screen.getByTestId('drop-overlay-0')).toBeInTheDocument()
    })

    // does work since we now have a delay before the loader is displayed
    // FIXME: find a way to test this feature that's not too hacky
    it('should show files loader when files are being loaded then hide it', async () => {
        render(<SideView {...PROPS} />, options)

        const loader = screen.getByTestId('files-loader-0')
        const cache = PROPS.viewState.getVisibleCache()

        // Enable fake timers & simulate busy status:
        // we have to do that because the loader will only appear
        // if the cache stays busy long enough.
        jest.useFakeTimers()
        cache.setStatus('busy')
        // run overlay timer so that the active class is applied
        jest.runOnlyPendingTimers()
        expect(loader.classList.contains('active')).toBe(true)

        // check that busy is removed after the cache returns to 'ok' status
        cache.setStatus('ok')
        expect(loader.classList.contains('active')).toBe(false)

        jest.useRealTimers()
    })

    it('should hide sideview if hide prop is true', () => {
        const { container } = render(<SideView {...PROPS} hide={true} />, options)

        expect(container.firstElementChild.classList.contains('hidden')).toBe(true)
    })
})
