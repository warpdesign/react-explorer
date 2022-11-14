import { i18n } from './i18n'
import { isWin } from '../utils/platform'

export interface LocalizedError {
    code?: string | number
    message?: string
}

export interface IOError {
    code: string | number
    newName?: string
}

export function getLocalizedError(error: string | IOError): LocalizedError {
    const niceError: LocalizedError = {}
    const {
        i18next: { t },
    } = i18n

    if (typeof error === 'string') {
        const str = error as string

        switch (true) {
            case /EHOSTDOWN/.test(str):
                niceError.code = 'EHOSTDOWN'
                break

            default:
                niceError.code = 'NOCODE'
                break
        }
    } else {
        niceError.code = (error as IOError).code
    }

    switch (niceError.code) {
        case 'ENOTFOUND':
            niceError.message = t('ERRORS.ENOTFOUND')
            break

        case 'ECONNREFUSED':
            niceError.message = t('ERRORS.ECONNREFUSED')
            break

        case 'ENOENT':
            niceError.message = t('ERRORS.ENOENT')
            break

        case 'EPERM':
            niceError.message = t('ERRORS.EPERM')
            break

        case 'EACCES':
            niceError.message = t('ERRORS.EACCES')
            break

        case 'EIO':
            niceError.message = t('ERRORS.EIO')
            break

        case 'ENOSPC':
            niceError.message = t('ERRORS.ENOSPC')
            break

        case 'EEXIST':
            niceError.message = t('ERRORS.EEXIST')
            break

        case 'BAD_FILENAME':
            const acceptedChars = isWin ? t('ERRORS.WIN_VALID_FILENAME') : t('ERRORS.UNIX_VALID_FILENAME')

            niceError.message = t('ERRORS.BAD_FILENAME', { entry: (error as IOError).newName }) + '. ' + acceptedChars
            break

        case 'EHOSTDOWN':
            niceError.message = t('ERRORS.EHOSTDOWN')
            break

        case 'ENOTDIR':
            niceError.message = t('ERRORS.ENOTDIR')
            break

        case 'NODEST':
            niceError.message = t('ERRORS.NODEST')
            break

        case 530:
            niceError.message = t('ERRORS.530')
            break

        case 550:
            niceError.message = t('ERRORS.550')
            break

        default:
            debugger
            niceError.message = t('ERRORS.UNKNOWN')
            break
    }

    return niceError
}
