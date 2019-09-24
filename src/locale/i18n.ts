import i18next from 'i18next';
import { ipcRenderer } from 'electron';

const locales: any = {};

function importAllLocales(r: any) {
    r.keys().forEach((key: any) => {
        const code = key.match(/([a-zA-Z]+)\.json$/)[1];
        locales[code] = r(key);
    });
}

importAllLocales(require['context']('./lang/', true, /\.json$/));

i18next
    .init({
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
            formatSeparator: ','
        },
        react: {
            wait: true
        }
    });

i18next.on('languageChanged', () => {
    ipcRenderer.send('languageChanged', i18next.t('APP_MENUS', { returnObjects: true }));
});

export { i18next };
