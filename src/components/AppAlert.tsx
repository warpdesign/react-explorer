
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Alert, IAlertProps } from '@blueprintjs/core';
import { Deferred } from '../utils/deferred';
import i18next from '../locale/i18n';

type Message = React.ReactNode | string;

interface IAlerterState extends IAlertProps {
    message: Message
}

const ENTER_KEY = 13;

class Alerter extends React.Component<{}, IAlerterState> {
    defer: Deferred<boolean> = null;

    constructor(props: {}) {
        super(props);

        this.state = {
            message: '',
            isOpen: false
        }
    }

    public static create(container = document.body) {
        const containerElement = document.createElement("div");
        container.appendChild(containerElement);
        // use a ref and return a promise since in the future ReactDOM.render may return void
        return new Promise((resolve) => {
            ReactDOM.render(<Alerter ref={c => resolve(c)} />, containerElement);
        });
    }

    onClose = (res: boolean) => {
        this.setState({
            isOpen: false
        });

        const defer = this.defer;
        this.defer = null;

        defer.resolve(res);
    }

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

    private renderAlert() {
        const { message, ...alertProps } = this.state;

        if (!alertProps.confirmButtonText) {
            alertProps.confirmButtonText = i18next.t('COMMON.OK');
        }

        alertProps.onOpened = this.addEnterListener;
        alertProps.onClosing = this.removeEnterListener;
        alertProps.className = "data-cy-alert";

        return <Alert {...alertProps}>{message}</Alert>;
    }

    public render() {
        return (
            <div>{this.renderAlert()}</div>
        );
    }

    private onKeyUp = (e: KeyboardEvent) => {
        if (this.state.isOpen && e.keyCode === ENTER_KEY) {
            this.onClose(true);
        }
    }

    addEnterListener = () => {
        document.addEventListener('keyup', this.onKeyUp);
    }

    removeEnterListener = () => {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    public componenDidUnmount() {
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
        return MyAlerter && MyAlerter.show(message, props) || Promise.reject('alerter dom not ready');
    }
}
