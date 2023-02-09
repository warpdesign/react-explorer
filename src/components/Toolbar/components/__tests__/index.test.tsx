import React from 'react'
import { LayoutName } from '$src/hooks/useLayout'
import { render, screen, t, setup } from 'rtl'

import { getTickIcon, ViewToggle, ViewToggleMenu } from '..'

describe('Toolbar components', () => {
    beforeEach(() => jest.clearAllMocks())

    describe('ViewToggle', () => {
        const PROPS = {
            onClick: jest.fn(),
            layout: 'details' as LayoutName,
        }

        it('should display ViewToggle', () => {
            render(<ViewToggle {...PROPS} />)

            expect(screen.getByTitle(t('TOOLBAR.CHANGE_VIEW'))).toBeInTheDocument()
        })

        it('should show selected layout', async () => {
            const { user } = setup(<ViewToggle {...PROPS} />)

            await user.click(screen.getByTitle(t('TOOLBAR.CHANGE_VIEW')))

            const detailsMenuItem = screen.getByRole('menuitem', { name: t('TOOLBAR.DETAILS_VIEW') })
            expect(detailsMenuItem).toBeInTheDocument()

            expect(detailsMenuItem.querySelector('[data-icon="small-tick"]')).toBeInTheDocument()
        })

        it('should notify parent about view change when clicking on view', async () => {
            const { user } = setup(<ViewToggle {...PROPS} />)

            await user.click(screen.getByTitle(t('TOOLBAR.CHANGE_VIEW')))
            await user.click(screen.getByRole('menuitem', { name: t('TOOLBAR.DETAILS_VIEW') }))

            expect(PROPS.onClick).toHaveBeenCalledWith('details')
        })
    })

    describe('ViewToggleMenu', () => {
        const PROPS = {
            onClick: jest.fn(),
            layout: 'details' as LayoutName,
        }

        it('should display ViewToggleMenu', () => {
            render(<ViewToggleMenu {...PROPS} />)

            expect(screen.getByRole('menuitem', { name: t('TOOLBAR.DETAILS_VIEW') })).toBeInTheDocument()
            expect(screen.getByRole('menuitem', { name: t('TOOLBAR.ICON_VIEW') })).toBeInTheDocument()

            const detailsMenuItem = screen.getByRole('menuitem', { name: t('TOOLBAR.DETAILS_VIEW') })
            expect(detailsMenuItem).toBeInTheDocument()

            expect(detailsMenuItem.querySelector('[data-icon="small-tick"]')).toBeInTheDocument()
        })

        it('should notify parent when the user clicks on a menu item', async () => {
            const { user } = setup(<ViewToggleMenu {...PROPS} />)

            await user.click(screen.getByRole('menuitem', { name: t('TOOLBAR.DETAILS_VIEW') }))

            expect(PROPS.onClick).toHaveBeenCalledWith('details')
        })
    })

    describe('getTickIcon', () => {
        it('should return "tick-icon" if currentLayout equals to wantedLayout', () => {
            expect(getTickIcon('details', 'details')).toBe('small-tick')
        })

        it('should return "tick-icon" if currentLayout does not equal to wantedLayout', () => {
            expect(getTickIcon('details', 'icons')).toBe('blank')
        })
    })
})
