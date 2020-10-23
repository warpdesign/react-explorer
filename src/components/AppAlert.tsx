import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Alert, IAlertProps } from '@blueprintjs/core';
import { Deferred } from '../utils/deferred';
import { i18next } from '../locale/i18n';

type Message = React.ReactNode | string;

interface AlerterState extends IAlertProps {
    message: Message;
}

const ENTER_KEY = 13;

class Alerter extends React.Component<Record<string, unknown>, AlerterState> {
    defer: Deferred<boolean> = null;

    constructor(props: Record<string, unknown>) {
        super(props);

        this.state = {
            message: '',
            isOpen: false,
        };
    }

    public static create(container = document.body): Promise<React.ReactNode> {
        const containerElement = document.createElement('div');
        container.appendChild(containerElement);
        // use a ref and return a promise since in the future ReactDOM.render may return void
        return new Promise((resolve) => {
            ReactDOM.render(<Alerter ref={(c): void => resolve(c)} />, containerElement);
        });
    }

    onClose = (res: boolean): void => {
        this.setState({
            isOpen: false,
        });

        const defer = this.defer;
        this.defer = null;

        defer.resolve(res);
    };

    async show(message: React.ReactNode | string, options: Partial<IAlertProps>): Promise<boolean> {
        if (!this.defer) {
            this.defer = new Deferred();

            this.setState({ message, ...options, isOpen: true, onClose: this.onClose });

            return this.defer.promise;
        } else {
            // wait for the previous promise to get resolved
            await this.defer.promise;
            return this.show(message, options);
        }
    }

    private renderAlert(): React.ReactNode {
        const { message, ...alertProps } = this.state;

        if (!alertProps.confirmButtonText) {
            alertProps.confirmButtonText = i18next.t('COMMON.OK');
        }

        alertProps.onOpened = this.addEnterListener;
        alertProps.onClosing = this.removeEnterListener;
        alertProps.className = 'data-cy-alert';

        return <Alert {...alertProps}>{message}</Alert>;
    }

    public render(): React.ReactNode {
        return <div>{this.renderAlert()}</div>;
    }

    private onKeyUp = (e: KeyboardEvent): void => {
        if (this.state.isOpen && e.keyCode === ENTER_KEY) {
            this.onClose(true);
        }
    };

    addEnterListener = (): void => {
        document.addEventListener('keyup', this.onKeyUp);
    };

    removeEnterListener = (): void => {
        document.removeEventListener('keyup', this.onKeyUp);
    };

    public componenDidUnmount(): void {
        // when this method is called the listener should have already
        // been removed but we never know: the component could be unmounted
        // without calling the onClosing prop
        this.removeEnterListener();
    }
}

let MyAlerter: Alerter = null;

Alerter.create().then((component: Alerter) => {
    MyAlerter = component;
});

export const AppAlert = {
    show(message: React.ReactNode | string, props: Partial<IAlertProps> = {}): Promise<boolean> {
        return (MyAlerter && MyAlerter.show(message, props)) || Promise.reject('alerter dom not ready');
    },
};
