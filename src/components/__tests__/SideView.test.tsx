/**
 * @jest-environment jsdom
 */
import React from 'react'

import { render, screen, vol, t, waitFor } from 'rtl'
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
        onPaste: jest.fn(),
        viewState: undefined as ViewState,
    }

    beforeEach(async () => {
        const appState = new AppState()
        const { providerProps } = options
        providerProps.appState = appState
        providerProps.settingsState = appState.settingsState
        await options.providerProps.appState.loadSettingsAndPrepareViews()
        PROPS.viewState = appState.winStates[0].getActiveView()

        jest.clearAllMocks()
    })

    it('should render SideView', async () => {
        render(<SideView {...PROPS} />, options)

        // // tab
        expect(screen.getByText('virtual')).toBeInTheDocument()

        // // toolbar
        expect(screen.getByDisplayValue('/virtual')).toBeInTheDocument()

        // // files loader
        expect(screen.getByTestId('files-loader-0')).toBeInTheDocument()

        // // fileview
        const files = Object.keys(vol.toJSON())
            .map((path) => path.replace('/virtual/', ''))
            .filter((file) => !file.startsWith('.'))
        for (const file of files) {
            expect(await screen.findByText(file)).toBeInTheDocument()
        }

        // status bar
        expect(screen.getByDisplayValue(buildStatusBarText())).toBeInTheDocument()

        // overlay d&d
        expect(screen.getByTestId('overlay')).toBeInTheDocument()
    })

    it('should show files loader when files are being loaded then hide it', async () => {
        render(<SideView {...PROPS} />, options)

        const loader = screen.getByTestId('files-loader-0')

        // loader is active when loading
        expect(loader.classList.contains('active')).toBe(true)

        // ... and is inactive when loading is over
        await waitFor(() => expect(loader.classList.contains('active')).toBe(false))
    })

    it('should hide sideview if hide prop is true', () => {
        const { container } = render(<SideView {...PROPS} hide={true} />, options)

        expect(container.firstElementChild.classList.contains('hidden')).toBe(true)
    })
})
