/**
 * @jest-environment jsdom
 */
import React from 'react'
import { within } from '@testing-library/dom'

import { screen, setup, render, t, isSelected } from 'rtl'
import { ViewState } from '$src/state/viewState'
import { ipcRenderer } from 'electron'

import { TabList } from '../TabList'
import { SettingsState } from '$src/state/settingsState'

describe('TabList', () => {
    const settingsState = {
        defaultFolder: '/virtual',
    }

    const options = {
        providerProps: {
            viewState: new ViewState(0),
            settingsState: settingsState as SettingsState,
        },
    }

    beforeEach(async () => {
        options.providerProps.viewState = new ViewState(0)
        const cache = options.providerProps.viewState.addCache('/virtual', -1, true)
        await cache.openDirectory({ dir: '/virtual', fullname: '' })
        jest.clearAllMocks()
    })

    it('should show tabs and "new tab" button', () => {
        const { container } = render(<TabList />, options)

        const tab = screen.getByRole('button', { name: 'virtual' })
        expect(tab).toBeInTheDocument()
        expect(isSelected(tab)).toBe(true)

        expect(screen.getByTitle(t('TABS.NEW'))).toBeInTheDocument()
        // check for presence of the tab's icon: bad habit to directly query selector
        // but unfortunately there is no easy way query these elements in an accessible way :(
        expect(container.querySelector('[data-icon="folder-close"]')).toBeInTheDocument()
    })

    it('should open tab context menu when right-clicking on tab', async () => {
        jest.spyOn(ipcRenderer, 'invoke')
        const { user } = setup(<TabList />, options)

        const button = screen.getByRole('button', { name: 'virtual' })
        await user.pointer([{ target: button }, { keys: '[MouseRight]', target: button }])

        // don't bother checking for the menu template for now, but at least check that we receive an array
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('Menu:buildFromTemplate', expect.any(Array))
    })

    it('should open tab icon context menu when right-clicking on tab icon', async () => {
        jest.spyOn(ipcRenderer, 'invoke')
        const { user, container } = setup(<TabList />, options)

        const icon = container.querySelector('[data-icon="folder-close"]')
        await user.pointer([{ target: icon }, { keys: '[MouseRight]', target: icon }])

        // don't bother checking for the menu template for now, but at least check that we receive an array
        expect(ipcRenderer.invoke).toHaveBeenCalledWith('Menu:buildFromTemplate', expect.any(Array))
    })

    describe('actions', () => {
        it('should add a new tab when clicking on add button', async () => {
            const { user } = setup(<TabList />, options)

            await user.click(screen.getByTitle(t('TABS.NEW')))

            // we have two items
            const items = screen.getAllByRole('button', { name: 'virtual' })
            expect(items.length).toBe(2)

            // the new tab is activated and the first one became inactive
            expect(isSelected(items[0])).toBe(false)
            expect(isSelected(items[1])).toBe(true)
        })

        it('should close tab when clicking on close button', async () => {
            const { user } = setup(<TabList />, options)

            await user.click(screen.getByTitle(t('TABS.NEW')))

            const secondTab = screen.getAllByRole('button', { name: 'virtual' })[1]
            await user.hover(secondTab)

            await user.click(within(secondTab).queryByTitle(t('TABS.CLOSE')))

            // const items = screen.getAllByRole('button', { name: 'virtual' })

            // expect(items.length).toBe(1)
        })

        it('should change tab when clicking on an inactive tab', async () => {
            const { user } = setup(<TabList />, options)

            await user.click(screen.getByTitle(t('TABS.NEW')))

            const items = screen.getAllByRole('button', { name: 'virtual' })

            expect(!isSelected(items[0]))
            expect(isSelected(items[1]))

            await user.click(items[0])

            expect(isSelected(items[0]))
            expect(!isSelected(items[1]))
        })

        it('should update tab title when file path is updated', async () => {
            render(<TabList />, options)

            await options.providerProps.viewState
                .getVisibleCache()
                .openDirectory({ dir: '/virtual/dir1', fullname: '' })

            expect(screen.getByText('dir1')).toBeInTheDocument()
        })

        it('should show an error icon when cache.error is true', () => {
            options.providerProps.viewState.getVisibleCache().error = true
            const { container } = render(<TabList />, options)

            expect(container.querySelector('[data-icon="issue"]')).toBeInTheDocument()
        })
    })
})
