/**
 * @jest-environment jsdom
 */
import React from 'react'
import { setup, screen, LOCALE_EN, waitFor } from 'rtl'
import { SettingsState } from '$src/state/settingsState'
import { PrefsDialog } from '../PrefsDialog'
import { ipcRenderer } from 'electron'
import * as FsLocalAll from '$src/services/plugins/FsLocal'

describe('PrefsDialog', () => {
    let settingsState: SettingsState

    const PROPS = {
        isOpen: true,
        onClose: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
        settingsState = new SettingsState('2.31')
    })

    it('should display dialog', () => {
        setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })
        expect(screen.getByText(LOCALE_EN.DIALOG.PREFS.TITLE)).toBeInTheDocument()
        expect(screen.getByText(LOCALE_EN.DIALOG.PREFS.THEME)).toBeInTheDocument()
        expect(screen.getByText(LOCALE_EN.DIALOG.PREFS.LANGUAGE)).toBeInTheDocument()
        expect(screen.getByText(LOCALE_EN.DIALOG.PREFS.DEFAULT_FOLDER)).toBeInTheDocument()
        expect(screen.getByText(LOCALE_EN.DIALOG.PREFS.DEFAULT_TERMINAL)).toBeInTheDocument()
    })

    it('should set language', async () => {
        const { selectBPOption } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })
        const { lang, code } = LOCALE_EN.LANG[0]

        await selectBPOption(LOCALE_EN.DIALOG.PREFS.LANGUAGE, lang)

        expect(settingsState.lang).toBe(code)
    })

    it('should set theme', async () => {
        const { selectBPOption } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })

        expect(settingsState.darkMode).toBe(false)

        await selectBPOption(LOCALE_EN.DIALOG.PREFS.THEME, LOCALE_EN.DIALOG.PREFS.DARK)

        expect(settingsState.darkMode).toBe(true)
    })

    it('should set default folder', async () => {
        const spy = jest.spyOn(settingsState, 'setDefaultFolder')
        jest.spyOn(FsLocalAll, 'FolderExists').mockReturnValue(true)
        const { user } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })
        const defaultFolderInput = screen.getByPlaceholderText(LOCALE_EN.DIALOG.PREFS.DEFAULT_FOLDER)

        await user.clear(defaultFolderInput)
        await user.paste('/virtual/dir1')

        await waitFor(() => expect(spy).toHaveBeenCalled())

        expect(settingsState.defaultFolder).toBe('/virtual/dir1')
        ;(FsLocalAll.FolderExists as jest.Mock).mockReset()
    })

    it('should set terminal', async () => {
        const newTerminal = 'new_terminal'
        const spy = jest.spyOn(settingsState, 'setDefaultTerminal')
        const { user } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })

        const input = screen.getByPlaceholderText(LOCALE_EN.DIALOG.PREFS.DEFAULT_TERMINAL)

        await user.clear(input)
        await user.paste(newTerminal)

        expect(spy).toHaveBeenCalledWith(newTerminal)
        expect(settingsState.defaultTerminal).toBe(newTerminal)
    })

    it('should show error and reset to default if path does not exist', async () => {
        const { user } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })
        screen.getByPlaceholderText(LOCALE_EN.DIALOG.PREFS.DEFAULT_FOLDER).focus()

        await user.paste('foo_bar/')

        expect(await screen.findByText(LOCALE_EN.DIALOG.PREFS.INVALID_FOLDER)).toBeInTheDocument()
    })

    it('should reset prefs', async () => {
        const spy = jest.spyOn(settingsState, 'resetSettings')
        const { user } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })

        await user.click(screen.getByText(LOCALE_EN.DIALOG.PREFS.RESET))

        expect(spy).toHaveBeenCalled()
    })

    it('should call open terminal', async () => {
        const { user } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })
        await user.click(
            screen
                .getByPlaceholderText(LOCALE_EN.DIALOG.PREFS.DEFAULT_TERMINAL)
                .nextElementSibling.querySelector('button'),
        )

        await waitFor(() => expect(ipcRenderer.invoke).toHaveBeenCalled())
    })

    it('should show an alert if specified terminal could not be opened', async () => {
        jest.spyOn(ipcRenderer, 'invoke').mockResolvedValue({
            code: 1,
            terminal: 'foo',
        })
        const { user } = setup(<PrefsDialog {...PROPS} />, { providerProps: { settingsState } })
        const input = screen.getByPlaceholderText(LOCALE_EN.DIALOG.PREFS.DEFAULT_TERMINAL)

        input.focus()
        await user.paste('foo')
        await user.click(input.nextElementSibling.querySelector('button'))

        await waitFor(() => expect(ipcRenderer.invoke).toHaveBeenCalled())

        expect(screen.getByText(/Unable to start specified terminal/)).toBeInTheDocument()
    })
})
