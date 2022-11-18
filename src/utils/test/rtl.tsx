import React from 'react'
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { makeAutoObservable } from 'mobx'
import { Provider } from 'mobx-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { i18n } from './i18n'
import { I18nextProvider } from 'react-i18next'
import { HotkeysProvider } from '@blueprintjs/core'
import userEvent from '@testing-library/user-event'
import en from 'locale/lang/en.json'

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

// re-export everything
export * from '@testing-library/react'

const t = i18n.i18next.t

// override render method
export { customRender as render, LOCALE_EN, userEvent, t }
