import React from 'react'
import { Trans } from 'react-i18next'
import { i18n } from '$src/locale/i18n'

interface Props {
    count: number
}

export const DeleteConfirmDialog = ({ count }: Props) => {
    return (
        <p>
            <Trans i18nKey="DIALOG.DELETE.CONFIRM" i18n={i18n.i18next} count={count}>
                Are you sure you want to delete <b>{{ count }}</b> file(s)/folder(s)?
                <br />
                <br />
                This action will <b>permanentaly</b> delete the selected elements.
            </Trans>
        </p>
    )
}
