/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, setup, render, t } from 'rtl'
import { Statusbar } from '../Statusbar'
import { filterFiles, filterDirs } from '$src/utils/fileUtils'
import { ViewState } from '$src/state/viewState'
import { vol } from 'memfs'

describe('Statusbar', () => {
    vol.fromJSON(
        {
            dir1: null,
            foo1: '',
            foo2: '',
            '.hidden': '',
        },
        '/virtual',
    )

    const options = {
        providerProps: {
            viewState: new ViewState(0),
        },
    }

    const buildStatusBarText = () => {
        const cache = options.providerProps.viewState.getVisibleCache()
        const files = filterFiles(cache.files, cache.showHiddenFiles).length
        const folders = filterDirs(cache.files, cache.showHiddenFiles).length

        return `${t('STATUS.FILES', { count: files })}, ${t('STATUS.FOLDERS', {
            count: folders,
        })}`
    }

    beforeEach(async () => {
        options.providerProps.viewState = new ViewState(0)
        const cache = options.providerProps.viewState.addCache('/virtual', -1, true)
        await cache.openDirectory({ dir: '/virtual', fullname: '' })

        jest.clearAllMocks()
    })

    it('should display statusbar text and toggle hidden files button', () => {
        render(<Statusbar />, options)

        expect(screen.getByRole('textbox')).toHaveValue(buildStatusBarText())
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should show hidden files when clicking on toggle hidden files button', async () => {
        const { user } = setup(<Statusbar />, options)

        await user.click(screen.getByRole('button'))

        expect(screen.getByRole('textbox')).toHaveValue(buildStatusBarText())
    })

    it('toggle hidden files button should be hidden if file cache is not valid', () => {
        options.providerProps.viewState.getVisibleCache().setStatus('busy')
        render(<Statusbar />, options)

        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
})
