import i18next from './i18n';
import { isWin } from '../utils/platform';

export function getLocalizedError(error: any) {
    let niceError = error;

    if (typeof error.code === 'undefined') {
        debugger;
        niceError = {};

        switch (true) {
            case /EHOSTDOWN/.test(error):
                niceError.code = 'EHOSTDOWN';
                break;

            default:
                niceError.code = 'NOCODE';
                break;
        }
    }

    switch (niceError.code) {
        case 'ENOTFOUND':
            niceError.message = i18next.t('ERRORS.ENOTFOUND');
            break;

        case 'ECONNREFUSED':
            niceError.message = i18next.t('ERRORS.ECONNREFUSED');
            break;

        case 'ENOENT':
            niceError.message = i18next.t('ERRORS.ENOENT');
            break;

        case 'EPERM':
            niceError.message = i18next.t('ERRORS.EPERM');
            break;

        case 'EACCES':
            niceError.message = i18next.t('ERRORS.EACCES');
            break;

        case 'EEXIST':
            niceError.message = i18next.t('ERRORS.EEXIST');
            break;

        case 'BAD_FILENAME':
            const acceptedChars = isWin ? i18next.t('ERRORS.WIN_VALID_FILENAME') : i18next.t('ERRORS.UNIX_VALID_FILENAME');

            niceError.message = i18next.t('ERRORS.BAD_FILENAME', { entry: error.newName }) + '. ' + acceptedChars;
            break;

        case 'EHOSTDOWN':
            niceError.message = i18next.t('ERRORS.EHOSTDOWN');
            break;

        case 'NOT_A_DIR':
            niceError.message = i18next.t('ERRORS.NOT_A_DIR');
            break;

        case 530:
            niceError.message = i18next.t('ERRORS.530');
            break;

        case 550:
            niceError.message = i18next.t('ERRORS.550');
            break;

        default:
            debugger;
            niceError.message = i18next.t('ERRORS.UNKNOWN');
            break;
    }

    return niceError;
}