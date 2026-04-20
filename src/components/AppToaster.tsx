import { notifications } from '@mantine/notifications'
import { ReactNode } from 'react'

const TOAST_TIMEOUT = 2000

export interface IToasterOpts {
    message: string | JSX.Element
    icon?: ReactNode
    color?: 'red' | 'green' | 'blue' | 'yellow'
    timeout?: number
}

let lastToast = ''

export const AppToaster = {
    show: (opts: IToasterOpts, key?: string, dismissPrev = false): string => {
        if (dismissPrev && lastToast) {
            notifications.hide(lastToast)
        }

        const id = key || Math.random().toString(36).substring(7)

        notifications.show({
            id,
            message: opts.message,
            icon: opts.icon,
            color: opts.color,
            autoClose: opts.timeout || TOAST_TIMEOUT,
            position: 'top-center',
        })

        lastToast = id
        return lastToast
    },
}
