import React from 'react'
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import type { MatcherFunction } from '@testing-library/react'
import { makeAutoObservable } from 'mobx'
import { Provider } from 'mobx-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { i18n } from './i18n'
import { I18nextProvider } from 'react-i18next'
import { HotkeysProvider } from '@blueprintjs/core'
import userEvent from '@testing-library/user-event'
import en from '$src/locale/lang/en.json'

type Query = (f: MatcherFunction) => HTMLElement

const LOCALE_EN = en.translations

class State {
    lang = 'fr'
    darkMode = false
    splitView = false

    constructor() {
        makeAutoObservable(this)
    }
}

const renderWithProviders = (jsx: React.ReactElement, providers = {}) => {
    const settingsState = new State()
    return render(<Provider {...providers}>{jsx}</Provider>)
}

const AllTheProviders = ({ children }: { children: ReactElement }) => {
    const settingsState = new State()
    return (
        <DndProvider backend={HTML5Backend}>
            <Provider settingsState={settingsState}>
                <I18nextProvider i18n={i18n.i18next}>
                    <HotkeysProvider>{children}</HotkeysProvider>
                </I18nextProvider>
            </Provider>
        </DndProvider>
    )
}

const customRender = (ui: ReactElement, options = {}) => render(ui, { wrapper: AllTheProviders, ...options })

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

const setup = (jsx: ReactElement) => ({
    user: userEvent.setup(),
    ...customRender(jsx),
})

const t = i18n.i18next.t
const i18next = i18n.i18next

// jest doesn't have require.context so we patch this include
// to require the expected data
jest.mock('$src/locale/i18n', () => ({
    i18n: {
        i18next,
    },
}))

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render, setup, withMarkup, LOCALE_EN, userEvent, t, i18next }
