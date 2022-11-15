import React from 'react'
import { MobXProviderContext } from 'mobx-react'

export const useStores = (...storeIds: string[]) => {
    const AllStores = React.useContext(MobXProviderContext)
    const stores: Partial<typeof AllStores> = {}

    for (const id of storeIds) {
        if (!AllStores[id]) {
            throw `No MboXProvider for '${id}'!`
        }
        stores[id] = AllStores[id]
    }
    return stores
}
