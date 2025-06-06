import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Alert, AlertProps } from '@blueprintjs/core'

import { Deferred } from '$src/utils/deferred'
import { i18n } from '$src/locale/i18n'
import Keys from '$src/constants/keys'

type Message = React.ReactNode | string

interface AlerterState extends AlertProps {
    message: Message
}

class Alerter extends React.Component<Record<string, unknown>, AlerterState> {
    defer: Deferred<boolean> = null

    constructor(props: Record<string, unknown>) {
        super(props)

        this.state = {
            message: '',
            isOpen: false,
        }
    }

    public static create(container = document.body): Promise<Alerter> {
        const containerElement = document.createElement('div')
        container.appendChild(containerElement)
        const root = createRoot(containerElement)
        return new Promise((resolve) => {
            root.render(<Alerter ref={(c) => resolve(c)} />)
        })
    }

    onClose = (res: boolean): void => {
        this.setState({
            isOpen: false,
        })

        const defer = this.defer
        this.defer = null

        defer.resolve(res)
    }

    async show(message: React.ReactNode | string, options: Omit<AlertProps, 'isOpen'>): Promise<boolean> {
        if (!this.defer) {
            this.defer = new Deferred()

            this.setState({ message, ...options, isOpen: true, onClose: this.onClose })

            return this.defer.promise
        } else {
            // wait for the previous promise to get resolved
            await this.defer.promise
            return this.show(message, options)
        }
    }

    private renderAlert(): React.ReactNode {
        const { message, ...alertProps } = this.state

        if (!alertProps.confirmButtonText) {
            alertProps.confirmButtonText = i18n.i18next.t('COMMON.OK')
        }

        alertProps.onOpened = this.addEnterListener
        alertProps.onClosing = this.removeEnterListener
        alertProps.className = 'data-cy-alert'

        return <Alert {...alertProps}>{message}</Alert>
    }

    public render(): React.ReactNode {
        return <div>{this.renderAlert()}</div>
    }

    private onKeyUp = (e: KeyboardEvent): void => {
        if (this.state.isOpen && e.key === Keys.ENTER) {
            this.onClose(true)
        }
    }

    addEnterListener = (): void => {
        document.addEventListener('keyup', this.onKeyUp)
    }

    removeEnterListener = (): void => {
        document.removeEventListener('keyup', this.onKeyUp)
    }

    public componenDidUnmount(): void {
        // when this method is called the listener should have already
        // been removed but we never know: the component could be unmounted
        // without calling the onClosing prop
        this.removeEnterListener()
    }
}

let MyAlerter: Alerter = null

Alerter.create().then((component) => {
    MyAlerter = component
})

export const AppAlert = {
    show(message: React.ReactNode | string, props: Omit<AlertProps, 'isOpen'> = {} as AlertProps): Promise<boolean> {
        return (MyAlerter && MyAlerter.show(message, props)) || Promise.reject('alerter dom not ready')
    },
}
