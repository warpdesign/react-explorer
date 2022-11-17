import { Intent } from '@blueprintjs/core'
import React from 'react'
import { Trans } from 'react-i18next'
import { AppAlert } from '../AppAlert'

interface Props {
    confirmButtonText: string
    cancelButtonText: string
}

export const showDeleteConfirmDialog = ({ confirmButtonText, cancelButtonText }: Props): Promise<boolean> =>
    AppAlert.show(
        <p>
            <Trans i18nKey="DIALOG.DELETE.CONFIRM_SIMPLE">
                Are you sure you want to delete the selected file(s)/folder(s)?
                <br />
                <br />
                This action will <b>permanentaly</b> delete the selected elements.
            </Trans>
        </p>,
        {
            cancelButtonText,
            confirmButtonText,
            icon: 'trash',
            intent: Intent.DANGER,
        },
    )
