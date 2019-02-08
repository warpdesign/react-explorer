import i18next from 'i18next';
import * as en from './lang/en.json';
import * as fr from './lang/fr.json';
import { ipcRenderer } from 'electron';

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

i18next.on('languageChanged', () => {
    ipcRenderer.send('languageChanged', i18next.t('APP_MENUS', { returnObjects: true }));
});

export default i18next;
