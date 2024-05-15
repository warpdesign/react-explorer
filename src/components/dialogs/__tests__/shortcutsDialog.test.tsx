import React from 'react'
import { ShortcutsDialog } from '../ShortcutsDialog'
import { render, screen, LOCALE_EN, userEvent } from 'rtl'

describe('ShortcutsDialog', () => {
    const DEFAULT_PROPS = {
        isOpen: true,
        onClose: jest.fn(),
    }

    const exitLabel = LOCALE_EN.SHORTCUT.MAIN.QUIT
    const reloadViewLabel = LOCALE_EN.SHORTCUT.MAIN.RELOAD_VIEW
    const placeholder = LOCALE_EN.DIALOG.SHORTCUTS.FILTER_PLACEHOLDER

    beforeEach(() => jest.resetAllMocks())

    describe('shortcuts list', () => {
        it('should render shortcuts', async () => {
            render(<ShortcutsDialog {...DEFAULT_PROPS} />)
            expect(await screen.findByText(exitLabel)).toBeInTheDocument()
            expect(screen.getByText(reloadViewLabel)).toBeInTheDocument()
        })

        it('should call onClose', async () => {
            const user = userEvent.setup()
            render(<ShortcutsDialog {...DEFAULT_PROPS} />)
            await user.click(screen.getByText(LOCALE_EN.COMMON.CLOSE))
            expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1)
        })
    })

    describe('filter', () => {
        it('should render filter', () => {
            render(<ShortcutsDialog {...DEFAULT_PROPS} />)
            expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
        })

        it('should apply filter', async () => {
            const user = userEvent.setup()
            render(<ShortcutsDialog {...DEFAULT_PROPS} />)
            screen.getByPlaceholderText(placeholder).focus()
            await user.paste(exitLabel.substring(0, 5))

            expect(screen.getByText(exitLabel)).toBeInTheDocument()
            expect(screen.queryByText(reloadViewLabel)).not.toBeInTheDocument()
        })

        it('should show empty message if filter does not return any results', async () => {
            const user = userEvent.setup()
            render(<ShortcutsDialog {...DEFAULT_PROPS} />)
            screen.getByPlaceholderText(placeholder).focus()
            await user.paste('foo_bar')

            expect(screen.getByText(LOCALE_EN.DIALOG.SHORTCUTS.NO_RESULTS)).toBeInTheDocument()
        })
    })
})
