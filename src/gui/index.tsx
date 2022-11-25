import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { HotkeysProvider } from '@blueprintjs/core'
import { configure } from 'mobx'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'mobx-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ipcRenderer } from 'electron'
import process from 'process'
import child_process from 'child_process'

import { ExplorerApp } from '$src/components/App'
import { i18n } from '$src/locale/i18n'
import { SettingsState } from '$src/state/settingsState'
// register Fs that will be available in React-Explorer
// I guess there is a better place to do that
import { FsGeneric } from '$src/services/plugins/FsGeneric'
import { FsWsl } from '$src/services/plugins/FsWsl'
import { FsLocal } from '$src/services/plugins/FsLocal'
import { registerFs } from '$src/services/Fs'
import { AppState } from '$src/state/appState'

configure({
    enforceActions: 'observed',
    computedRequiresReaction: true,
    reactionRequiresObservable: true,
    // observableRequiresReaction: true,
    safeDescriptors: window.ENV.CY ? false : true,
})

function initFS() {
    if ((process && process.env && process.env.NODE_ENV === 'test') || window.ENV.CY) {
        registerFs(FsGeneric)
    } else {
        registerFs(FsWsl)
        registerFs(FsLocal)
    }
}

class App {
    appState: AppState

    constructor() {
        this.appState = new AppState()
    }

    // debug stuff
    createTestFolder(): Promise<void> {
        return new Promise((resolve) => {
            // Development stuff: create fake directory for testing
            // const exec = require('child_process').exec;
            const exec = child_process.exec
            exec('/Users/leo/tmp_ftp.sh', (err: Error) => {
                if (err) {
                    console.log('error preparing fake folders', err)
                }

                resolve()
            })
        })
    }

    init = async (): Promise<void> => {
        if (window.ENV.NODE_ENV !== 'production') {
            await this.createTestFolder()
        }
        initFS()
        debugger
        await this.appState.loadSettingsAndPrepareViews()
        // we need for translations to be ready too
        await i18n.promise
        debugger
        this.renderApp()
    }

    renderApp = async (): Promise<void> => {
        document.body.classList.add('loaded')

        ReactDOM.render(
            <DndProvider backend={HTML5Backend}>
                <I18nextProvider i18n={i18n.i18next}>
                    <Provider appState={this.appState}>
                        <HotkeysProvider>
                            <ExplorerApp />
                        </HotkeysProvider>
                    </Provider>
                </I18nextProvider>
            </DndProvider>,
            document.getElementById('root'),
        )
    }
}

;(async () => {
    await new Promise((res) => setTimeout(res, 1000))
    const app = new App()
    app.init()
})()
