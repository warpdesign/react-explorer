import * as React from 'react'
import { i18n } from '$src/locale/i18n'
import { modals } from '@mantine/modals'
import { AlertProps, Group, Button } from '@mantine/core'
import { IconInfoCircle, IconBan } from '@tabler/icons-react'

interface AlerterProps extends AlertProps {
    intent: Intent
    cancelButtonText?: string
    confirmButtonText?: string
    message: string | React.ReactNode
    modalId: string
}

type Intent = 'danger' | 'info' | 'warning'

const IntentProps = {
    info: {
        buttonColor: 'blue.8',
        color: 'var(--mantine-color-blue-8)',
        icon: IconInfoCircle,
    },
    warning: {
        buttonColor: 'yellow.8',
        color: 'var(--mantine-color-yellow-8)',
        icon: IconInfoCircle,
    },
    danger: {
        buttonColor: 'red.8',
        color: 'var(--mantine-color-red-8)',
        icon: IconBan,
    },
}

export const showAlertModal = (props: AlerterProps): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const { intent, message, modalId, cancelButtonText, confirmButtonText = i18n.i18next.t('COMMON.OK') } = props
        const { color, buttonColor, icon: AlertIcon } = IntentProps[intent]

        modals.open({
            modalId,
            children: (
                <>
                    <Group align="top" wrap="nowrap">
                        <AlertIcon size="64" color={color} />
                        <span>{message}</span>
                    </Group>
                    <Group justify="flex-end" style={{ flex: 1 }}>
                        {cancelButtonText && (
                            <Button
                                onClick={() => {
                                    modals.close(modalId)
                                    resolve(false)
                                }}
                            >
                                {cancelButtonText}
                            </Button>
                        )}
                        {confirmButtonText && (
                            <Button
                                color={buttonColor}
                                onClick={() => {
                                    modals.close(modalId)
                                    resolve(true)
                                }}
                            >
                                {confirmButtonText}
                            </Button>
                        )}
                    </Group>
                </>
            ),
            withCloseButton: false,
            centered: true,
            onClose: () => resolve(false),
        })
    })
}
