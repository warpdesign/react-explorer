/**
 * @jest-environment jsdom
 */
import React from 'react'
import { screen, render, setup, t } from 'rtl'
import { HamburgerMenu } from '../HamburgerMenu'

describe('Badge', () => {
    const PROPS = {
        onOpenPrefs: jest.fn(),
        onOpenShortcuts: jest.fn(),
    }

    beforeEach(() => jest.clearAllMocks())

    it('should show badge', () => {
        render(<HamburgerMenu {...PROPS} />)

        expect(screen.getByText(t('NAV.PREFS'))).toBeInTheDocument()
        expect(screen.getByText(t('NAV.SHORTCUTS'))).toBeInTheDocument()
    })

    it('should call onOpenPrefs when clicking on prefs menu item', async () => {
        const { user } = setup(<HamburgerMenu {...PROPS} />)

        await user.click(screen.getByText(t('NAV.PREFS')))

        expect(PROPS.onOpenPrefs).toHaveBeenCalled()
    })

    it('should call onOpenSHortcuts when clicking on shortcuts menu item', async () => {
        const { user } = setup(<HamburgerMenu {...PROPS} />)

        await user.click(screen.getByText(t('NAV.SHORTCUTS')))

        expect(PROPS.onOpenShortcuts).toHaveBeenCalled()
    })
})
