
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Alert, IAlertProps } from '@blueprintjs/core';
import { Deferred } from '../utils/deferred';

class Alerter extends React.Component<{}, IAlertProps> {
    defer: Deferred<boolean> = null;

    constructor(props:IAlertProps) {
        super(props);
    }

    public static create(props: IAlertProps, container = document.body) {
        const containerElement = document.createElement("div");
        container.appendChild(containerElement);
        const alerter = ReactDOM.render(<Alerter {...props} />, containerElement) as Alerter;
        return alerter;
    }

    onClose = (res:boolean) => {
        this.setState({
            isOpen: false
        });

        const defer = this.defer;
        this.defer = null;

        if (res) {
            defer.resolve();
        } else {
            defer.reject();
        }
    }

    async show(options: Partial<IAlertProps>):Promise<boolean> {
        if (!this.defer) {
            this.defer = new Deferred();

            this.setState({ ...options, isOpen: true, onClose: this.onClose });

            return this.defer.promise;
        } else try {
            // wait for the previous promise to get resolved
            await this.defer.promise;
            return this.show(options);
        } catch {
            return this.show(options);
        }
    }

    private renderAlert() {
        return <Alert {...this.state}></Alert>;
    }

    public render() {
        return (
            <div>{this.renderAlert()}</div>
        );
    }
}

const MyAlerter = Alerter.create({
    isOpen: false
});

export const AppAlert = {
    show(props: Partial<IAlertProps>): Promise<boolean> {
        return MyAlerter.show(props);
    }
}