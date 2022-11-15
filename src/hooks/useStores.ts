import React from 'react'
import { MobXProviderContext } from 'mobx-react'

export const useStores = <T>(...storeIds: string[]) => {
    const AllStores = React.useContext(MobXProviderContext)
    const stores: { [x: string]: T } = {}

    for (const id of storeIds) {
        if (!AllStores[id]) {
            throw `No MboXProvider for '${id}'!`
        }
        stores[id] = AllStores[id] as T
    }
    return stores
}
