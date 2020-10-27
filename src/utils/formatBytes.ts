import { i18next } from '../locale/i18n';

let translations: { [key: string]: string };
let byteFormats: Array<string>;

export function updateTranslations(): void {
    translations = i18next.t('COMMON.SIZE', { returnObjects: true });
    byteFormats = Object.keys(translations).map((key) => translations[key]);
}

i18next.on('languageChanged', updateTranslations);

// took this from stack overflow: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
export function formatBytes(bytes: number): string {
    const i = bytes > 0 ? Math.floor(Math.log2(bytes) / 10) : 0;
    const num = bytes / Math.pow(1024, i);

    if (!i) {
        return num > 1 ? num + ' ' + byteFormats[1] : num + ' ' + byteFormats[0];
    } else {
        return num.toFixed(2) + ' ' + byteFormats[i + 1];
    }
}

updateTranslations();
