import i18next from 'i18next';
import { ipcRenderer } from 'electron';

const locales: i18next.Resource = {};

function importAllLocales(r: __WebpackModuleApi.RequireContext) {
    r.keys().forEach((key: string) => {
        const code = key.match(/([a-zA-Z]+)\.json$/)[1];
        locales[code] = r(key);
    });
}

importAllLocales(require['context']('./lang/', true, /\.json$/));

i18next.init({
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
        wait: true,
    },
});

i18next.on('languageChanged', (): void => {
    ipcRenderer.invoke('languageChanged', i18next.t('APP_MENUS', { returnObjects: true }));
});

const languageList = Object.keys(locales);

export { i18next, languageList };
