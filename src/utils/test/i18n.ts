import i18next from 'i18next'
import en from 'locale/lang/en.json'

const i18n = {
    promise: i18next.init({
        lng: 'en',
        // we init with resources
        resources: {
            en,
        },
        fallbackLng: 'en',

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

export { i18n }
