
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

    constructor(props:{}) {
        super(props);

        this.state = {
            message: '',
            isOpen: false
        }
    }

    public static create(container = document.body) {
        const containerElement = document.createElement("div");
        container.appendChild(containerElement);
        const alerter = ReactDOM.render(<Alerter />, containerElement) as Alerter;
        return alerter;
    }

    onClose = (res: boolean) => {
        this.setState({
            isOpen: false
        });

        const defer = this.defer;
        this.defer = null;

        defer.resolve(res);
    }

    async show(message: React.ReactNode | string, options: Partial<IAlertProps>):Promise<boolean> {
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

    public componentWillUnmount() {
        document.removeEventListener('keyup', this.onKeyUp);
    }

    public componentDidMount() {
        document.addEventListener('keyup', this.onKeyUp);
    }
}

const MyAlerter = Alerter.create();

export const AppAlert = {
    show(message: React.ReactNode | string, props: Partial<IAlertProps> = {}): Promise<boolean> {
        return MyAlerter.show(message, props);
    }
}