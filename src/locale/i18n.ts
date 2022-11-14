import i18next from 'i18next'
import type { Resource } from 'i18next'
import { ipcRenderer } from 'electron'

const locales: Resource = {}

function importAllLocales(r: __WebpackModuleApi.RequireContext) {
    r.keys().forEach((key: string) => {
        const code = key.match(/([a-zA-Z]+)\.json$/)[1]
        locales[code] = r(key)
    })
}

importAllLocales(require['context']('./lang/', true, /\.json$/))

const i18n = {
    promise: i18next.init({
        lng: 'en',
        // we init with resources
        resources: locales,
        fallbackLng: 'en',
        debug: true,

        // have a common namespace used around the full app
        ns: ['translations'],
        defaultNS: 'translations',

        interpolation: {
            escapeValue: false, // not needed for react!!
            formatSeparator: ',',
        },
        react: {
            // wait: true,
            useSuspense: false,
        },
    }),
    i18next,
}

i18next.on('languageChanged', (lang: string): void => {
    ipcRenderer.invoke('languageChanged', i18next.t('APP_MENUS', { returnObjects: true }), lang)
})

const languageList = Object.keys(locales)

export { i18n, languageList }
