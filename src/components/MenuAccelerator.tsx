import * as React from "react";
import { ipcRenderer } from 'electron';

const ACCELERATOR_EVENT = 'menu_accelerator';

export interface MenuAcceleratorEvent{
    combo: string;
}

export interface IConstructor<T> {
    new(...args: any[]): T;
}

export interface IAcceleratorProps {

}

export interface IMenuAcceleratorComponent extends React.Component {
    /** Components decorated with the `@MenuAccelerator` decorator must implement React's component `render` function. */
    render(): React.ReactElement<any> | null | undefined;

    /**
     * Components decorated with the `@MenuAccelerator` decorator must implement
     * this method, and it must return a `Acelerator` React element.
     */
    renderMenuAccelerators(): React.ReactElement<IAcceleratorProps>;
}

export function MenuAccelerators<T extends IConstructor<IMenuAcceleratorComponent>>(WrappedComponent: T) {
    if (typeof WrappedComponent.prototype.renderMenuAccelerators !== 'function') {
        console.warn('Classes docorated with the @MenuAccelerators must define the renderMenuAccemeratprs method.');
    }

    return class MenuAcceleratorsClass extends WrappedComponent {
        instanceId: number;
        combos: string[];

        onAccelerator = (e:MenuAcceleratorEvent, combo:string) => {
            // check if combo is valid
            console.log('received combo', combo, e);
        }

        setActions(props: { children?: React.ReactNode }) {
            console.log('setting actions');
        }

        componentDidMount() {
            if (super.componentDidMount) {
                super.componentDidMount();
            }

            console.log('adding accelerator listener');
            ipcRenderer.on(ACCELERATOR_EVENT, this.onAccelerator);
        }

        componentWillUnmount() {
            if (super.componentWillUnmount) {
                super.componentWillUnmount();
            }

            console.log('removing accelerator listener');
            ipcRenderer.removeListener(ACCELERATOR_EVENT, this.onAccelerator);
        }

        render() {
            const element = super.render() as JSX.Element;

            // TODO: call renderMenuAccelerators
            if (typeof this.renderMenuAccelerators === 'function') {
                const accelerators = this.renderMenuAccelerators();
                // get result, save events
            }

            return element;
        }
    }
}
