import React from 'react'
import { render, setup, screen, waitFor, t, fireEvent, waitForElementToBeRemoved } from 'rtl'

import { AppState } from '$src/state/appState'
import { ViewState } from '$src/state/viewState'

import { Toolbar } from '..'
import { optionKey } from '$src/utils/platform'
import { HistoryEntry } from '$src/state/fileState'

const CODES = {
    L: 76,
}

const fakeHistory: HistoryEntry[] = [
    {
        path: 'a',
        sortMethod: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        viewmode: 'details',
    },
    {
        path: 'b',
        sortMethod: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        viewmode: 'details',
    },
    {
        path: 'c',
        sortMethod: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        viewmode: 'details',
    },
    {
        path: 'd',
        sortMethod: 'name',
        sortOrder: 'asc',
        showHiddenFiles: false,
        viewmode: 'details',
    },
]

describe('Toolbar', () => {
    const options = {
        providerProps: {
            appState: null as AppState,
            viewState: null as ViewState,
        },
    }

    const PROPS = {
        active: true,
    }

    beforeEach(async () => {
        const appState = new AppState()
        const { providerProps } = options
        providerProps.appState = appState
        await options.providerProps.appState.loadSettingsAndPrepareViews()
        providerProps.viewState = appState.winStates[0].activeView
        await waitFor(() => expect(providerProps.viewState.getVisibleCache().status).toBe('ok'))
        jest.clearAllMocks()
    })

    it('should display toolbar', async () => {
        const { user, container } = setup(<Toolbar {...PROPS} />, options)

        expect(screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER'))).toBeInTheDocument()

        // buttons
        expect(screen.getByTitle(t('TOOLBAR.BACK'))).toBeInTheDocument()
        expect(screen.getByTitle(t('TOOLBAR.FORWARD'))).toBeInTheDocument()
        expect(screen.getByTitle(t('TOOLBAR.PARENT'))).toBeInTheDocument()
        expect(screen.getByTitle(t('TOOLBAR.CHANGE_VIEW'))).toBeInTheDocument()
        expect(screen.getByTitle(t('TOOLBAR.CHANGE_SORT_METHOD'))).toBeInTheDocument()
        expect(container.querySelector('[data-icon="arrow-right"]')).toBeInTheDocument()

        await user.click(container.querySelector('[data-icon="caret-down"]'))

        expect(screen.getByText(t('COMMON.MAKEDIR'))).toBeInTheDocument()
        expect(screen.getByText(t('FILEMENU.PASTE', { count: 0 })))
        expect(screen.getByText(t('FILEMENU.DELETE', { count: 0 })))
    })

    it('should disable toolbar buttons', () => {
        const cache = options.providerProps.viewState.getVisibleCache()
        jest.spyOn(cache, 'isRoot').mockImplementation(() => true)
        render(<Toolbar {...PROPS} />, options)

        expect(screen.getByTitle(t('TOOLBAR.BACK'))).toBeDisabled()
        expect(screen.getByTitle(t('TOOLBAR.FORWARD'))).toBeDisabled()
        expect(screen.getByTitle(t('TOOLBAR.PARENT'))).toBeDisabled()
    })

    it('should enable toolbar buttons', () => {
        const cache = options.providerProps.viewState.getVisibleCache()
        // enable back button
        cache.current = 2
        // enable foward button
        cache.history.push(...fakeHistory)

        render(<Toolbar {...PROPS} />, options)

        expect(screen.getByTitle(t('TOOLBAR.BACK'))).toBeEnabled()
        expect(screen.getByTitle(t('TOOLBAR.FORWARD'))).toBeEnabled()
        expect(screen.getByTitle(t('TOOLBAR.PARENT'))).toBeEnabled()
    })

    describe('interactions', () => {
        it('should go backwards when clicking on back button', async () => {
            const cache = options.providerProps.viewState.getVisibleCache()
            jest.spyOn(cache, 'navHistory').mockImplementation()

            // enable back button
            cache.current = 2

            const { user } = setup(<Toolbar {...PROPS} />, options)

            await user.click(screen.getByTitle(t('TOOLBAR.BACK')))

            expect(cache.navHistory).toHaveBeenCalledWith(-1)
        })

        it('should go forward when clicking on back button', async () => {
            const cache = options.providerProps.viewState.getVisibleCache()
            jest.spyOn(cache, 'navHistory').mockImplementation()

            // enable foward button
            cache.history.push(...fakeHistory)

            const { user } = setup(<Toolbar {...PROPS} />, options)

            await user.click(screen.getByTitle(t('TOOLBAR.FORWARD')))

            expect(cache.navHistory).toHaveBeenCalledWith(1)
        })

        it('should go up when clicking on back button', async () => {
            const cache = options.providerProps.viewState.getVisibleCache()
            jest.spyOn(cache, 'openParentDirectory').mockImplementation()

            // enable foward button
            cache.history.push(...fakeHistory)

            const { user } = setup(<Toolbar {...PROPS} />, options)

            await user.click(screen.getByTitle(t('TOOLBAR.PARENT')))

            expect(cache.openParentDirectory).toHaveBeenCalled()
        })

        describe('path input', () => {
            it('should enter path when typing text in the path', async () => {
                const newValue = '/foo'
                const { user } = setup(<Toolbar {...PROPS} />, options)

                const input = screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER'))

                input.focus()

                user.paste(newValue)

                expect(input).toHaveValue(newValue)
            })

            it('should focus input when pressing focus shortcut', async () => {
                const { container } = setup(<Toolbar {...PROPS} />, options)

                // Not an ideal solution but we cannot use user.keyboard since Blueprint
                // is using the deprecated event.which property of the event that's received
                // and user.keyboard doesn't set this property on the event object.
                //
                // Also note that we check for ctrlKey & not metaKey which will work even
                // when running on a Mac:
                // because Blueprint is also using a deprecated property navigator.platform
                // to detect macOS and in jest navigator.platform === ''
                //
                // see: https://github.com/palantir/blueprint/discussions/5891
                fireEvent.keyDown(container, {
                    which: CODES.L,
                    ctrlKey: true,
                })

                expect(screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER'))).toHaveFocus()
            })

            it('should select input text when focusing input', () => {
                render(<Toolbar {...PROPS} />, options)

                const input = screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER')) as HTMLInputElement
                const value = input.value
                input.focus()

                // Note: an easier way would be to check window.getSelection()
                // but right now calling input.select() in jsdom doesn't
                // update the document's selection
                //
                // see: https://github.com/jsdom/jsdom/issues/2995
                expect(input.selectionStart).toEqual(0)
                expect(input.selectionEnd).toEqual(value.length)
            })

            it('should restore previous value when input loses focus', async () => {
                const newValue = '/bar'

                const { user } = setup(<Toolbar {...PROPS} />, options)

                const input = screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER')) as HTMLInputElement
                const previousValue = input.value
                input.focus()

                await user.paste(newValue)

                expect(input).toHaveValue(newValue)

                input.blur()
                expect(input).toHaveValue(previousValue)
            })

            it('should attempt to load new directory when pressing enter key', async () => {
                const cache = options.providerProps.viewState.getVisibleCache()
                jest.spyOn(cache, 'cd').mockImplementation()

                const { user } = setup(<Toolbar {...PROPS} />, options)

                const input = screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER')) as HTMLInputElement
                input.focus()

                await user.paste('/foo')
                await user.keyboard('{Enter}')

                expect(cache.cd).toHaveBeenCalledWith('/foo', '')

                expect(input).not.toHaveFocus()
            })

            it('should attempt to load new directory when clicking on submit button', async () => {
                const cache = options.providerProps.viewState.getVisibleCache()
                jest.spyOn(cache, 'cd').mockImplementation()

                const { user, container } = setup(<Toolbar {...PROPS} />, options)

                const input = screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER')) as HTMLInputElement
                input.focus()

                await user.paste('/foo')
                await user.click(container.querySelector('[data-icon="arrow-right"]'))

                expect(cache.cd).toHaveBeenCalledWith('/foo', '')
            })

            it('should show an alert then restore previous value when the user clicked on the submit button and the cache failed to change directory', async () => {
                const error = {
                    code: 'CODE',
                    message: 'Oops!',
                }
                const cache = options.providerProps.viewState.getVisibleCache()
                jest.spyOn(cache, 'cd').mockRejectedValue(error)

                const { user, container } = setup(<Toolbar {...PROPS} />, options)

                const input = screen.getByPlaceholderText(t('COMMON.PATH_PLACEHOLDER')) as HTMLInputElement
                const previousPath = input.value
                input.focus()

                await user.paste('/foo')
                await user.click(container.querySelector('[data-icon="arrow-right"]'))

                expect(cache.cd).toHaveBeenCalledWith('/foo', '')

                await screen.findByText(`${error.message} (${error.code})`)

                // click on ok
                await user.click(screen.getByText(t('COMMON.OK')))

                // check that previous path has been restored
                expect(input).toHaveValue(previousPath)
            })
        })
    })

    describe('makedir', () => {
        it.todo('should open makedir dialog when pressing shortcut (need to find a way to generate menu accelerators)')

        it('should open makedir dialog when clicking on makedir button', async () => {
            const { user, container } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('COMMON.MAKEDIR')))

            await screen.findByText(t('COMMON.MAKEDIR'))
        })

        it('should close makedir dialog when clicking on cancel', async () => {
            const { user, container } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('COMMON.MAKEDIR')))

            await user.click(screen.getByText(t('COMMON.CANCEL')))

            await waitForElementToBeRemoved(() => screen.queryByText(t('COMMON.MAKEDIR')))
        })

        it('should attempt to create & read dir when validating a new folder', async () => {
            const newDir = 'new_dir'
            const cache = options.providerProps.viewState.getVisibleCache()
            const currentDir = cache.path
            const newPath = `${currentDir}/${newDir}`

            jest.spyOn(cache, 'makedir').mockResolvedValue(newPath)
            jest.spyOn(cache, 'cd').mockResolvedValue(undefined)

            const { user, container } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('COMMON.MAKEDIR')))

            await user.type(screen.getByPlaceholderText(t('DIALOG.MAKEDIR.NAME')), newDir)

            await user.keyboard(`{${optionKey}>}{Enter}`)

            await waitForElementToBeRemoved(() => screen.queryByText(t('COMMON.MAKEDIR')))

            expect(cache.makedir).toHaveBeenCalledWith(currentDir, newDir)

            // should navigate to the newly created directory
            expect(cache.cd).toHaveBeenCalledWith(newPath)
        })

        it('should attempt to create dir when validating a new folder', async () => {
            const newDir = 'new_dir'
            const cache = options.providerProps.viewState.getVisibleCache()
            const currentDir = cache.path
            const newPath = `${currentDir}/${newDir}`

            jest.spyOn(cache, 'makedir').mockResolvedValue(newPath)
            jest.spyOn(cache, 'reload').mockReturnValue()

            const { user, container } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('COMMON.MAKEDIR')))

            await user.type(screen.getByPlaceholderText(t('DIALOG.MAKEDIR.NAME')), newDir)

            await user.keyboard('{Enter}')

            await waitForElementToBeRemoved(() => screen.queryByText(t('COMMON.MAKEDIR')))

            expect(cache.makedir).toHaveBeenCalledWith(currentDir, newDir)

            // should navigate to the newly created directory
            expect(cache.reload).toHaveBeenCalled()
        })

        it('should show an alert if an error ocurred created the directory', async () => {
            const newDir = 'new_dir'
            const cache = options.providerProps.viewState.getVisibleCache()
            const error = {
                message: 'Oops!',
            }

            jest.spyOn(cache, 'makedir').mockRejectedValue(error)

            const { user, container } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('COMMON.MAKEDIR')))

            await user.type(screen.getByPlaceholderText(t('DIALOG.MAKEDIR.NAME')), newDir)

            await user.keyboard('{Enter}')

            await waitForElementToBeRemoved(() => screen.queryByText(t('COMMON.MAKEDIR')))

            await screen.findByText(t('ERRORS.CREATE_FOLDER', { message: error.message }))
        })
    })

    describe('paste', () => {
        beforeEach(() => {
            const cache = options.providerProps.viewState.getVisibleCache()
            // add a file to the clipboard so that paste option gets enabled
            options.providerProps.appState.clipboard.setClipboard(cache, [cache.files[0]])
        })

        it('should attempt to paste when clicking on paste button', async () => {
            const { appState, viewState } = options.providerProps
            const cache = viewState.getVisibleCache()

            jest.spyOn(appState, 'paste')
            const { user, container } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('FILEMENU.PASTE', { count: 1 })))

            expect(appState.paste).toHaveBeenCalledWith(cache)
        })
    })

    describe('delete', () => {
        it('should attempt to delete files when clicking on delete button', async () => {
            const { appState, viewState } = options.providerProps
            jest.spyOn(appState, 'delete')
            const cache = viewState.getVisibleCache()
            cache.addToSelection(cache.files[0])

            const { container, user } = setup(<Toolbar {...PROPS} />, options)

            await user.click(container.querySelector('[data-icon="caret-down"]'))

            await user.click(screen.getByText(t('FILEMENU.DELETE', { count: 1 })))

            expect(appState.delete).toHaveBeenCalled()
        })

        it.todo('should show delete alert when pressing delete shortcut (need to trigger combo)')
    })
})
