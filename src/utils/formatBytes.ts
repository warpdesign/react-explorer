import { i18next } from '../locale/i18n';

let translations: any;
let byteFormats: any;

i18next.on('languageChanged', updateTranslations);

export function updateTranslations() {
    translations = i18next.t('COMMON.SIZE', { returnObjects: true });
    byteFormats = Object.keys(translations).map((key) => translations[key]);
}

// took this from stack overflow: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
export function formatBytes(bytes: number): string {
    const i = bytes > 0 ? Math.floor(Math.log2(bytes) / 10) : 0;
    const num = (bytes / Math.pow(1024, i));

    if (!i) {
        return num > 1 ? (num + ' ' + byteFormats[1]) : (num + ' ' + byteFormats[0]);
    } else {
        return (num.toFixed(2)) + ' ' + byteFormats[i + 1];
    }
}

updateTranslations();
