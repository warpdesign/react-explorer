import React from 'react'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

import type { TStatus } from '$src/state/fileState'

export const Placeholder = ({ error, status }: { error: boolean; status: TStatus }): JSX.Element | null => {
    const { t } = useTranslation()

    // we don't want to show empty + loader at the same time
    if (status !== 'busy') {
        const placeholder = (error && t('COMMON.NO_SUCH_FOLDER')) || t('COMMON.EMPTY_FOLDER')
        const IconComponent = error ? IconAlertTriangle : IconCircleCheck
        return (
            <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <IconComponent size={40} />
                {placeholder}
            </div>
        )
    } else {
        return null
    }
}
