/**
 * @jest-environment jsdom
 */
import React from 'react'
import { within } from '@testing-library/dom'

import { screen, setup, render, t, isSelected, waitFor, wait } from 'rtl'
import { ViewState } from '$src/state/viewState'

import { FileView } from '..'
import { SettingsState } from '$src/state/settingsState'
import { AppState } from '$src/state/appState'

describe('FileView', () => {
    const options = {
        providerProps: {
            appState: null as AppState,
            settingsState: null as SettingsState,
            viewState: null as ViewState,
        },
    }

    beforeEach(async () => {
        const appState = new AppState()
        const { providerProps } = options
        providerProps.appState = appState
        providerProps.settingsState = appState.settingsState
        await options.providerProps.appState.loadSettingsAndPrepareViews()
        providerProps.viewState = appState.winStates[0].getActiveView()
        await waitFor(() => expect(providerProps.viewState.getVisibleCache().status).toBe('ok'))
        jest.clearAllMocks()
    })

    it('should show nodes', () => {
        render(<FileView hide={false} />, options)

        const files = options.providerProps.viewState.getVisibleCache().files
        files.forEach((file) => expect(screen.getByText(file.fullname)).toBeInTheDocument())
    })

    describe('interactions', () => {
        it('should select file when clicking on a file', async () => {
            const { user } = setup(<FileView hide={false} />, options)

            const cache = options.providerProps.viewState.getVisibleCache()
            const { files, selected } = cache

            await user.click(screen.getByText(files[0].fullname))

            expect(selected.length).toBe(1)
            expect(cache.cursor).toBe(files[0])
        })

        it('should next/previous file when the user presses the down or up arrow key', async () => {
            const { user, container } = setup(<FileView hide={false} />, options)

            const cache = options.providerProps.viewState.getVisibleCache()
            const { files, selected } = cache

            await user.type(container, '{ArrowDown}')

            expect(selected.length).toBe(1)
            expect(cache.cursor).toBe(files[0])

            await user.type(container, '{ArrowDown}')

            expect(cache.cursor).toBe(files[1])

            await user.type(container, '{ArrowUp}')

            expect(cache.cursor).toBe(files[0])
        })

        it('should enable file editing when pressing Enter and a file is selected', async () => {
            const { user, container } = setup(<FileView hide={false} />, options)

            const cache = options.providerProps.viewState.getVisibleCache()

            await user.type(container, '{ArrowDown}{Enter}')

            expect(screen.getByDisplayValue(cache.files[0].fullname)).toBeInTheDocument()
        })

        it('should sort files when clicking on header', async () => {
            const { container, user } = setup(<FileView hide={false} />, options)

            // compare filenames in the dom before...
            const filenames = Array.from(container.querySelectorAll('[data-cy-filename]')).map(
                (element) => element.textContent,
            )

            expect(filenames).toEqual(['dir1', 'dir2', 'foo1', 'foo2'])

            await user.click(screen.getByText('Name'))

            // ... and after clicking on name column
            const filenames2 = Array.from(container.querySelectorAll('[data-cy-filename]')).map(
                (element) => element.textContent,
            )

            expect(filenames2).toEqual(['dir2', 'dir1', 'foo2', 'foo1'])
        })

        it('should reset selection when clicking on blank area', async () => {
            const { container, user } = setup(<FileView hide={false} />, options)

            const cache = options.providerProps.viewState.getVisibleCache()

            // first select a file
            await user.type(container, '{ArrowDown}')

            expect(cache.selected.length).toBe(1)

            // clear file list so that it's easier to click on a blank area
            cache.files.clear()
            cache.allFiles.clear()

            await user.click(screen.getByText(t('COMMON.EMPTY_FOLDER')))

            // check that selectio has been reset
            expect(cache.selected.length).toBe(0)
        })

        it('should open directory when double clicking on a directory', async () => {
            const { viewState, appState } = options.providerProps
            const cache = viewState.getVisibleCache()
            const file = cache.files[0]
            const { user } = setup(<FileView hide={false} />, options)

            jest.spyOn(appState, 'openDirectory')

            await user.dblClick(screen.getByText(file.fullname))

            expect(appState.openDirectory).toHaveBeenCalledWith(
                expect.objectContaining({
                    dir: cache.join(file.dir, file.fullname),
                    fullname: '',
                }),
                true,
            )
        })

        it('should open file when double clicking on a file', async () => {
            const { viewState, appState } = options.providerProps
            const cache = viewState.getVisibleCache()
            const file = cache.files[2]
            const { user } = setup(<FileView hide={false} />, options)

            jest.spyOn(cache, 'openFile')

            await user.dblClick(screen.getByText(file.fullname))

            expect(cache.openFile).toHaveBeenCalledWith(appState, file)
        })

        it.todo('should select all files when pressing meta + a')

        it.todo('should invert selection when pression meta + i')

        it.todo('should open file when pression meta + o')

        it.todo('should show context menu when right clicking on a file')

        it.todo('should restore previous name when canceling edit')

        it.todo('should attempt to rename file when pressing enter in inline edit mode')
    })
})
