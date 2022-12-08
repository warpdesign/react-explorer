/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, setup, render, t, waitFor } from 'rtl'
import { Statusbar } from '../Statusbar'
import { filterFiles, filterDirs } from '$src/utils/fileUtils'
import { File } from '$src/services/Fs'
import { ViewState } from '$src/state/viewState'
import { FileState } from '$src/state/fileState'
import { makeObservable, observable, runInAction } from 'mobx'

describe('Statusbar', () => {
    const cache = makeObservable(
        {
            status: 'ok',
            files: observable<File>([]),
            toggleHiddenFiles: jest.fn((show: boolean) => {
                cache.showHiddenFiles = show
            }),
            showHiddenFiles: false,
            path: '/tmp',
        } as unknown as FileState,
        {
            path: observable,
        },
    )

    const options = {
        providerProps: {
            viewState: {
                getVisibleCache: () => cache,
            } as unknown as ViewState,
        },
    }

    const buildStatusBarText = () => {
        const files = filterFiles(cache.files, cache.showHiddenFiles).length
        const folders = filterDirs(cache.files, cache.showHiddenFiles).length
        return `${t('STATUS.FILES', { count: files })}, ${t('STATUS.FOLDERS', {
            count: folders,
        })}`
    }

    beforeEach(() => {
        cache.status = 'ok'
        cache.showHiddenFiles = false
        cache.files.replace([
            {
                fullname: 'dir1',
                isDir: true,
            } as unknown as File,
            {
                fullname: 'foo1',
                isDir: false,
            } as unknown as File,
            {
                fullname: '.foo2',
                isDir: false,
            } as unknown as File,
        ])

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

    it('toggle hidden files button should be disabled if file cache is not valid', () => {
        cache.status = 'busy'
        render(<Statusbar />, options)

        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should not show hidden files when changing directory', async () => {
        const { user } = setup(<Statusbar />, options)
        await user.click(screen.getByRole('button'))

        expect(cache.showHiddenFiles).toBe(true)
        // update path
        runInAction(() => (cache.path = '/foo'))
        expect(cache.showHiddenFiles).toBe(false)
    })
})
