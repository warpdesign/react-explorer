import React from 'react'
import { MobXProviderContext } from 'mobx-react'
import { ViewState } from '$src/state/viewState'
import { AppState } from '$src/state/appState'
import { SettingsState } from '$src/state/settingsState'

interface Stores {
    viewState?: ViewState
    appState?: AppState
    settingsState?: SettingsState
}

export const useStores = (...storeIds: string[]) => {
    const AllStores = React.useContext(MobXProviderContext)
    const stores: Stores = {}

    for (const id of storeIds) {
        if (!AllStores[id]) {
            throw `No MboXProvider for '${id}'!`
        }
        stores[id as keyof Stores] = AllStores[id]
    }
    return stores
}
