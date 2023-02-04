import { AppState } from '$src/state/appState'
import React from 'react'
import { screen, render, setup, t } from 'rtl'
import { FileMenu } from '../FileMenu'

describe('FileMenu', () => {
    const appState = {
        clipboard: {
            files: [''],
        },
    }

    const OPTIONS = {
        providerProps: {
            appState: appState as unknown as AppState,
        },
    }

    const PROPS = {
        selectedItemsLength: 3,
        isDisabled: false,
        onFileAction: jest.fn(),
    }

    beforeEach(() => jest.clearAllMocks())

    const items = [
        {
            label: t('COMMON.MAKEDIR'),
            action: 'makedir',
        },
        {
            label: t('FILEMENU.PASTE', { count: appState.clipboard.files.length }),
            action: 'paste',
        },
        {
            label: t('FILEMENU.DELETE', { count: PROPS.selectedItemsLength }),
            action: 'delete',
        },
    ]

    const getMenuItem = (label: string) => screen.getByRole('menuitem', { name: label })

    it('should display FileMenu', () => {
        render(<FileMenu {...PROPS} />, OPTIONS)
        items.forEach(({ label }) => {
            expect(getMenuItem(label)).toBeInTheDocument()
        })
    })

    it('should call item action when clicking on menu item', async () => {
        const { user } = setup(<FileMenu {...PROPS} />, OPTIONS)
        items.forEach(async ({ label, action }) => {
            await user.click(getMenuItem(label))
            expect(PROPS.onFileAction).toHaveBeenCalledWith(action)
        })
    })

    it('should disable menu items when isDisabled prop is true', () => {
        const props = { ...PROPS, isDisabled: true }

        const { user } = setup(<FileMenu {...props} />, OPTIONS)

        items.forEach(async ({ label, action }) => {
            await user.click(getMenuItem(label))
            expect(PROPS.onFileAction).not.toHaveBeenCalledWith(action)
        })
    })

    it('should disable individual menu items when disable condition is met', () => {
        const props = { ...PROPS, selectedItemsLength: 0 }
        const options = {
            providerProps: {
                appState: {
                    clipboard: {
                        files: [],
                    },
                } as unknown as AppState,
            },
        }

        const items = [
            {
                label: t('COMMON.MAKEDIR'),
                action: 'makedir',
            },
            {
                label: t('FILEMENU.PASTE', { count: 0 }),
                action: 'paste',
            },
            {
                label: t('FILEMENU.DELETE', { count: 0 }),
                action: 'delete',
            },
        ]

        const { user } = setup(<FileMenu {...props} />, options)

        items.forEach(async ({ label, action }) => {
            await user.click(getMenuItem(label))
            expect(PROPS.onFileAction).not.toHaveBeenCalledWith(action)
        })
    })
})
