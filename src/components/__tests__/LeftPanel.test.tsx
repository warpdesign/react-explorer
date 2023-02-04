import React from 'react'

import { render, screen, setup, t, waitForElementToBeRemoved } from 'rtl'
import { IconNames } from '@blueprintjs/icons'
import { AppState } from '$src/state/appState'
import { ALL_DIRS, USERNAME } from '$src/utils/platform'
import { SettingsState } from '$src/state/settingsState'

import { LeftPanel } from '../LeftPanel'

describe('LeftPanel', () => {
    const options = {
        providerProps: {
            appState: null as AppState,
            settingsState: null as SettingsState,
        },
    }

    const PROPS = {
        hide: false,
    }

    const userFolders = Object.entries(ALL_DIRS)

    beforeEach(async () => {
        const appState = new AppState()
        const { providerProps } = options
        providerProps.appState = appState
        providerProps.settingsState = appState.settingsState
        await options.providerProps.appState.loadSettingsAndPrepareViews()
        jest.clearAllMocks()
    })

    it('should render LeftPanel', async () => {
        render(<LeftPanel {...PROPS} />, options)

        expect(screen.getByText(t('FAVORITES_PANEL.SHORTCUTS'))).toBeInTheDocument()

        // check that all user specific directories are displayed
        userFolders.forEach(([id]) => {
            const label = id === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${id}`)
            expect(screen.getByText(label)).toBeInTheDocument()
        })

        expect(screen.getByText(t('FAVORITES_PANEL.PLACES'))).toBeInTheDocument()

        // wsl should not be there if there are no distributions
        expect(screen.queryByText(t('FAVORITES_PANEL.LINUX'))).not.toBeInTheDocument()
    })

    describe('interactions', () => {
        it('should open favorite when clicking on node', async () => {
            const { appState } = options.providerProps

            jest.spyOn(appState, 'openDirectory').mockImplementationOnce(() => Promise.resolve())

            const { user } = setup(<LeftPanel {...PROPS} />, options)

            await user.click(screen.getByText(USERNAME))

            expect(appState.openDirectory).toHaveBeenCalledWith(
                expect.objectContaining({
                    dir: userFolders[0][1],
                    fullname: '',
                }),
                true,
            )
        })

        it('should show an error alert if the folder could not be opened', async () => {
            const { appState } = options.providerProps
            const message = 'oops!'
            const code = 42

            jest.spyOn(appState, 'openDirectory').mockImplementationOnce(() =>
                Promise.reject({
                    message,
                    code,
                }),
            )

            const { user } = setup(<LeftPanel {...PROPS} />, options)

            await user.click(screen.getByText(USERNAME))

            expect(screen.getByText(`${message} (${code})`)).toBeInTheDocument()
        })

        it('should collapse tree when clicking on root label', async () => {
            const { container, user } = setup(<LeftPanel {...PROPS} />, options)

            const toggleElement = container.querySelectorAll(`[data-icon="${IconNames.CHEVRON_RIGHT}"]`)[0]

            console.log(toggleElement)

            await user.click(toggleElement)

            userFolders.forEach(([id]) => {
                const label = id === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${id}`)
                waitForElementToBeRemoved(() => screen.queryByText(label))
            })
        })
    })
})

describe('buildNodes', () => {
    it.todo('should build shortcuts & places nodes')
})
