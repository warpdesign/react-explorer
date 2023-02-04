import React from 'react'
import { screen, render, setup, t, isSelected } from 'rtl'

import { Nav } from '../Nav'
import { AppState } from '$src/state/appState'
import { Classes } from '@blueprintjs/core'

describe('Nav', () => {
    const options = {
        providerProps: {
            appState: new AppState(),
        },
    }

    beforeEach(async () => {
        const appState = new AppState()
        options.providerProps.appState = appState
        await options.providerProps.appState.loadSettingsAndPrepareViews()

        jest.spyOn(appState, 'toggleExplorerTab')
        jest.spyOn(appState, 'toggleSplitViewMode')

        jest.clearAllMocks()
    })

    it('should display nav', () => {
        const { container } = render(<Nav />, options)

        expect(screen.getByText(t('APP_MENUS.ABOUT_TITLE'))).toBeInTheDocument()

        const explorerButton = screen.getByRole('button', { name: t('NAV.EXPLORER') })
        expect(explorerButton).toBeInTheDocument()
        expect(isSelected(explorerButton)).toBe(true)

        const downloadsButton = screen.getByRole('button', { name: t('NAV.TRANSFERS') })
        expect(downloadsButton).toBeInTheDocument()
        expect(isSelected(downloadsButton)).toBe(false)

        const splitViewButton = container.querySelector('[data-icon="panel-stats"]')
        expect(splitViewButton).toBeInTheDocument()
        expect(splitViewButton.classList.contains(Classes.INTENT_PRIMARY)).toBe(
            options.providerProps.appState.winStates[0].splitView,
        )
    })

    it('should render badge', () => {
        // simulate 10 running transfers so that the badge is displayed
        jest.spyOn(options.providerProps.appState.transferListState, 'getRunningTransfers').mockReturnValue(10)
        render(<Nav />, options)

        expect(screen.getByText('10')).toBeInTheDocument()
    })

    describe('actions', () => {
        it('should open hamburger menu when clicking on hamburger', async () => {
            const { user } = setup(<Nav />, options)

            await user.click(screen.getByRole('button', { name: t('NAV.TRANSFERS') }))

            expect(options.providerProps.appState.toggleExplorerTab).toHaveBeenCalledWith(false)
        })

        it('should show downloads when clicking on downloads button and show explorer when clicking on explorer button', async () => {
            const { user } = setup(<Nav />, options)

            const transfersButton = screen.getByRole('button', { name: t('NAV.TRANSFERS') })
            const explorerButton = screen.getByRole('button', { name: t('NAV.EXPLORER') })

            await user.click(transfersButton)

            expect(options.providerProps.appState.toggleExplorerTab).toHaveBeenCalledWith(false)
            expect(isSelected(explorerButton)).toBe(false)
            expect(isSelected(transfersButton)).toBe(true)

            await user.click(explorerButton)
            expect(options.providerProps.appState.toggleExplorerTab).toHaveBeenCalledWith(true)
            expect(isSelected(explorerButton)).toBe(true)
            expect(isSelected(transfersButton)).toBe(false)
        })

        it('should toggle splitview when clicking on splitview button', async () => {
            const { user, container } = setup(<Nav />, options)

            const splitViewButton = container.querySelector('[data-icon="panel-stats"]')
            await user.click(splitViewButton)

            expect(options.providerProps.appState.toggleSplitViewMode).toHaveBeenCalled()
        })
    })
})
