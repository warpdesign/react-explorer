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
    const supportedErrors =
        /ENOTFOUND|ECONNREFUSED|ENOENT|EPERM|EACCES|EIO|ENOSPC|EEXIST|EHOSTDOWN|ENOTDIR|NODEST|530|550|EROS/
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

    switch (supportedErrors.test(niceError.code.toString())) {
        case true:
            niceError.message = t(`ERRORS.${niceError.code.toString()}`)
            break

        case false:
            if (niceError.code === 'BAD_FILENAME') {
                const acceptedChars = isWin ? t('ERRORS.WIN_VALID_FILENAME') : t('ERRORS.UNIX_VALID_FILENAME')
                niceError.message =
                    t('ERRORS.BAD_FILENAME', { entry: (error as IOError).newName }) + '. ' + acceptedChars
            } else {
                niceError.message = t('ERRORS.UNKNOWN')
            }
    }

    return niceError
}
