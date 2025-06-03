import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { HotkeysProvider } from '@blueprintjs/core'
import { configure } from 'mobx'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'mobx-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import process from 'process'

import { App } from '$src/components/App'
import { i18n } from '$src/locale/i18n'
import { AppState } from '$src/state/appState'
import initFS from '$src/utils/initFS'

configure({
    enforceActions: 'observed',
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    // observableRequiresReaction: true,
    safeDescriptors: window.ENV.CY ? false : true,
})

const bootstrap = async () => {
    const appState = new AppState()

    initFS()

    await appState.loadSettingsAndPrepareViews()

    await i18n.promise

    const root = ReactDOM.createRoot(document.getElementById('root'))

    root.render(
        <DndProvider backend={HTML5Backend}>
            <I18nextProvider i18n={i18n.i18next}>
                <Provider appState={appState}>
                    <HotkeysProvider>
                        <App />
                    </HotkeysProvider>
                </Provider>
            </I18nextProvider>
        </DndProvider>,
    )
}

bootstrap()
