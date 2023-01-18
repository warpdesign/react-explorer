import React from 'react'
import { Icon } from '@blueprintjs/core'
import { useTranslation } from 'react-i18next'

import type { TStatus } from '$src/state/fileState'

export const Placeholder = ({ error, status }: { error: boolean; status: TStatus }): JSX.Element => {
    const { t } = useTranslation()

    // we don't want to show empty + loader at the same time
    if (status !== 'busy') {
        const placeholder = (error && t('COMMON.NO_SUCH_FOLDER')) || t('COMMON.EMPTY_FOLDER')
        const icon = error ? 'warning-sign' : 'tick-circle'
        return (
            <div className="empty">
                <Icon icon={icon} iconSize={40} />
                {placeholder}
            </div>
        )
    } else {
        return null
    }
}
