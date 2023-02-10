import React from 'react'
import { screen, setup, render, t, userEvent } from 'rtl'
import { Statusbar } from '../Statusbar'
import { filterFiles, filterDirs } from '$src/utils/fileUtils'
import { ViewState } from '$src/state/viewState'

describe('Statusbar', () => {
    const options = {
        providerProps: {
            viewState: new ViewState(0),
        },
    }

    const buildStatusBarText = () => {
        const cache = options.providerProps.viewState.getVisibleCache()
        const files = filterFiles(cache.files).length
        const folders = filterDirs(cache.files).length

        return `${t('STATUS.FILES', { count: files })}, ${t('STATUS.FOLDERS', {
            count: folders,
        })}`
    }

    beforeEach(async () => {
        options.providerProps.viewState = new ViewState(0)
        const cache = options.providerProps.viewState.addCache('/virtual', -1, {
            activateNewCache: true,
            viewmode: 'details',
        })
        await cache.openDirectory({ dir: '/virtual', fullname: '' })

        jest.clearAllMocks()
    })

    it('should display statusbar text and toggle hidden files button', () => {
        render(<Statusbar />, options)

        expect(screen.getByText(buildStatusBarText())).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should show hidden files when clicking on toggle hidden files button', async () => {
        const { user } = setup(<Statusbar />, options)

        await user.click(screen.getByRole('button'))

        expect(screen.getByText(buildStatusBarText())).toBeInTheDocument()
    })

    it('toggle hidden files button should be inactive if cache is not ready', async () => {
        const user = userEvent.setup()
        const cache = options.providerProps.viewState.getVisibleCache()
        expect(cache.showHiddenFiles).toBe(false)

        render(<Statusbar />, options)

        // set cache status to busy & attempt to toggle show hidden files
        cache.setStatus('busy')
        await user.click(screen.queryByRole('button'))

        expect(cache.showHiddenFiles).toBe(false)
    })
})
