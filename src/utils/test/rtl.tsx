import React from 'react'
import type { ReactElement } from 'react'
import { render, screen, configure, waitForElementToBeRemoved } from '@testing-library/react'
import { within } from '@testing-library/dom'
import type { MatcherFunction } from '@testing-library/react'
import { Provider } from 'mobx-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { i18n } from './i18n'
import { I18nextProvider } from 'react-i18next'
import { HotkeysProvider } from '@blueprintjs/core'
import userEvent from '@testing-library/user-event'
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
    ipcRenderer: {
        on: jest.fn(),
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

type Query = (f: MatcherFunction) => HTMLElement

const LOCALE_EN = en.translations

const customRender = (
    ui: ReactElement,
    { providerProps = { settingsState: new SettingsState('2.31') }, ...renderOptions } = {},
) =>
    render(
        <DndProvider backend={HTML5Backend}>
            <Provider {...providerProps}>
                <I18nextProvider i18n={i18n.i18next}>
                    <HotkeysProvider>{ui}</HotkeysProvider>
                </I18nextProvider>
            </Provider>
        </DndProvider>,
    )

function withMarkup(query: Query) {
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

const t = i18n.i18next.t

configure({
    testIdAttribute: 'id',
})

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render, setup, withMarkup, LOCALE_EN, userEvent, t, i18next }
