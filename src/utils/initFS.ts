import { registerFs } from '$src/services/Fs'
import { FsWsl } from '$src/services/plugins/FsWsl'
import { FsLocal } from '$src/services/plugins/FsLocal'
import { FsVirtual } from '$src/services/plugins/FsVirtual'
import virtualVolume from '$src/utils/test/virtualVolume'

export default function initFS() {
    if ((process && process.env && process.env.NODE_ENV === 'test') || window.ENV.CY || typeof jest !== 'undefined') {
        // when doing tests in a browser env (Cypress or jest + jsdom),
        // mount a virtual volume instead
        registerFs(FsVirtual)
        virtualVolume()
    } else {
        // TODO: there should be an easy way to automatically register new FS
        registerFs(FsWsl)
        registerFs(FsLocal)
    }
}
