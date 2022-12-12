import React from 'react'
import type { ReactElement } from 'react'
import { render, screen, configure, waitForElementToBeRemoved, RenderOptions } from '@testing-library/react'
import { within } from '@testing-library/dom'
import type { MatcherFunction } from '@testing-library/react'
import { Provider } from 'mobx-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { i18n } from './i18n'
import { I18nextProvider } from 'react-i18next'
import { Classes, HotkeysProvider } from '@blueprintjs/core'
import { vol } from 'memfs'
import userEvent from '@testing-library/user-event'
import { configure as configureMobx } from 'mobx'

import { registerFs } from '$src/services/Fs'
import { FsVirtual } from '$src/services/plugins/FsVirtual'
import en from '$src/locale/lang/en.json'
const i18next = i18n.i18next

// jest doesn't have require.context so we patch this include
// to require the expected data
jest.mock('$src/locale/i18n', () => ({
    i18n: {
        i18next,
    },
    languageList: ['en', 'fr'],
}))
jest.mock('electron', () => ({
    shell: {
        openPath: jest.fn(),
    },
    ipcRenderer: {
        on: jest.fn(),
        removeListener: jest.fn(),
        sendSync: jest.fn(),
        invoke: jest.fn(
            (command: string) =>
                new Promise((res) => {
                    switch (command) {
                        case 'window:getCustomSettings':
                            res({
                                splitView: false,
                            })
                            break

                        case 'app:getLocale':
                            res('en')
                            break

                        case 'nativeTheme:shouldUseDarkColors':
                            res(false)
                            break

                        default:
                            console.warn(`unhandled ipcrenderer ${command}`)
                    }
                }),
        ),
    },
}))

jest.mock('$src/utils/debounce', () => ({
    debounce: (fn: any) => fn,
}))
jest.mock('$src/utils/throttle', () => ({
    throttle: (fn: any) => fn,
}))
import { SettingsState } from '$src/state/settingsState'
import { AppState } from '$src/state/appState'
import { ViewState } from '$src/state/viewState'

interface ProvidersAndRenderOptions extends RenderOptions {
    providerProps?: {
        settingsState?: SettingsState
        appState?: AppState
        viewState?: ViewState
    }
}

const customRender = (
    ui: ReactElement,
    { providerProps = { settingsState: new SettingsState('2.31') }, ...renderOptions }: ProvidersAndRenderOptions = {},
) =>
    render(
        <DndProvider backend={HTML5Backend}>
            <Provider {...providerProps}>
                <I18nextProvider i18n={i18n.i18next}>
                    <HotkeysProvider>{ui}</HotkeysProvider>
                </I18nextProvider>
            </Provider>
        </DndProvider>,
        renderOptions,
    )

function withMarkup(query: (f: MatcherFunction) => HTMLElement) {
    return (text: string | RegExp) =>
        query((content: string, node: Element | null) => {
            const didMatch = (node: Element) => {
                const expected = node.textContent

                return (typeof text !== 'string' && text.test(expected)) || text === expected
            }

            const childrenMatch = Array.from(node.children).every((child) => !didMatch(child))

            return didMatch(node) && childrenMatch
        })
}

const setup = (jsx: ReactElement, options = {}) => {
    const user = userEvent.setup()

    const selectBPOption = async (label: string, optionLabel: string) => {
        // FIXME: we wait for animations and this take quite some time (~ 400ms)
        // we should find a way to disable them otherwise tests will take a long time
        const selectButton = screen.getByText(label).nextElementSibling.querySelector('[role="combobox"]')
        const id = selectButton.getAttribute('aria-controls')

        await user.click(selectButton)

        const select = await screen.findByTestId(id)
        await user.click(within(select).getByText(optionLabel))

        await waitForElementToBeRemoved(select)
    }

    return {
        user,
        selectBPOption,
        ...customRender(jsx, options),
    }
}

const wait = (delay = 0) => new Promise((res) => setTimeout(res, delay))

const isSelected = (element: HTMLElement) => element.classList.contains(Classes.INTENT_PRIMARY)

const t = i18n.i18next.t
const LOCALE_EN = en.translations

configure({
    testIdAttribute: 'id',
})

// disable safeDescriptors so that we can spy on mobx actions
configureMobx({ safeDescriptors: false })

registerFs(FsVirtual)
;(global as unknown as Window).ENV = {
    CY: false,
    VERSION: 'jest',
    HASH: '',
    NODE_ENV: 'production',
    BUILD_DATE: new Date().toString(),
}

vol.fromJSON(
    {
        dir1: null,
        foo1: '',
        foo2: '',
        '.hidden': '',
    },
    '/virtual',
)

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render, setup, withMarkup, isSelected, LOCALE_EN, userEvent, t, i18next, wait }
