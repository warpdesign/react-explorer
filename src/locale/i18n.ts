import i18next from 'i18next';
import * as en from './lang/en.json';
import * as fr from './lang/fr.json';

    i18next
        .init({
        lng: 'en',
        // we init with resources
        resources: {
            en: en,
            fr: fr
        },
        fallbackLng: 'en',
        debug: true,

        // have a common namespace used around the full app
        ns: ['translations'],
        defaultNS: 'translations',

        interpolation: {
            escapeValue: false, // not needed for react!!
            formatSeparator: ','
        },
        react: {
            wait: true
        }
    });

export default i18next;
