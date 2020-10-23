import { i18next } from './i18n';
import { isWin } from '../utils/platform';

export interface LocalizedError {
    code?: string | number;
    message?: string;
}

export interface IOError {
    code: string | number;
    newName?: string;
}

export function getLocalizedError(error: string | IOError): LocalizedError {
    // let niceError = error;
    const niceError: LocalizedError = {};

    if (typeof error === 'string') {
        const str = error as string;

        switch (true) {
            case /EHOSTDOWN/.test(str):
                niceError.code = 'EHOSTDOWN';
                break;

            default:
                niceError.code = 'NOCODE';
                break;
        }
    } else {
        niceError.code = (error as IOError).code;
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

        case 'EIO':
            niceError.message = i18next.t('ERRORS.EIO');
            break;

        case 'ENOSPC':
            niceError.message = i18next.t('ERRORS.ENOSPC');
            break;

        case 'EEXIST':
            niceError.message = i18next.t('ERRORS.EEXIST');
            break;

        case 'BAD_FILENAME':
            const acceptedChars = isWin
                ? i18next.t('ERRORS.WIN_VALID_FILENAME')
                : i18next.t('ERRORS.UNIX_VALID_FILENAME');

            niceError.message =
                i18next.t('ERRORS.BAD_FILENAME', { entry: (error as IOError).newName }) + '. ' + acceptedChars;
            break;

        case 'EHOSTDOWN':
            niceError.message = i18next.t('ERRORS.EHOSTDOWN');
            break;

        case 'ENOTDIR':
            niceError.message = i18next.t('ERRORS.ENOTDIR');
            break;

        case 'NODEST':
            niceError.message = i18next.t('ERRORS.NODEST');
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
