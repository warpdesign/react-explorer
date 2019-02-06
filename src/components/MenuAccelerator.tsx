import * as React from "react";
import { ipcRenderer } from 'electron';

const ACCELERATOR_EVENT = 'menu_accelerator';

export interface MenuAcceleratorEvent{
    combo: string;
}

export interface IConstructor<T> {
    new(...args: any[]): T;
}

export interface IAcceleratorsProps {

}

export interface IAcceleratorProps {
    combo: string;
    onClick: (combo: string) => any;
}

export interface IMenuAcceleratorComponent extends React.Component {
    /** Components decorated with the `@MenuAccelerator` decorator must implement React's component `render` function. */
    render(): React.ReactElement<any> | null | undefined;

    /**
     * Components decorated with the `@MenuAccelerator` decorator must implement
     * this method, and it must return a `Accelerator` React element.
     */
    renderMenuAccelerators(): React.ReactElement<IAcceleratorsProps>;
}



export class Accelerators extends React.PureComponent<IAcceleratorsProps>{
    render() {
        return <div></div>;
    }

    // validateProps(props: IAcceleratorsProps & { children: React.ReactNode }) {

    // }
}

export class Accelerator extends React.PureComponent<IAcceleratorProps>{
    render() {
        return <div></div>;
    }

    // validateProps(props: IAcceleratorProps & { children: React.ReactNode }) {

    // }
}

function getDisplayName(ComponentClass: React.ComponentType):string {
    return ComponentClass.displayName || ComponentClass.name || "Unknown";
}

export function MenuAccelerators<T extends IConstructor<IMenuAcceleratorComponent>>(WrappedComponent: T) {
    if (typeof WrappedComponent.prototype.renderMenuAccelerators !== 'function') {
        console.warn('Classes decorated with the @MenuAccelerators must define the renderMenuAccemeratprs method.');
    }

    interface Action{
        combo: string,
        callback: (combo?:string) => any;
    }

    return class MenuAcceleratorsClass extends WrappedComponent {
        public static displayName = `MenuAccelerators(${getDisplayName(WrappedComponent)})`;

        actions = new Array<Action>();

        getCallback(combo:string): (combo?:string) => any {
            const action = this.actions.find((action) => action.combo === combo);
            return action && action.callback || null;
        }

        onAccelerator = (e: MenuAcceleratorEvent, data: { combo: string }) => {
            // check if combo is valid
            console.log('received combo', data.combo, e);
            const callback = this.getCallback(data.combo);
            if (typeof callback === 'function') {
                callback(data.combo);
            } else {
                console.log('no callback defined for', data.combo);
            }
        }

        setActions(props: { children?: React.ReactElement<Accelerator> }) {
            console.log('setting actions');
            this.actions.length = 0;

            // get result, save events
            React.Children.forEach(props.children, (child: React.ReactElement<any>) => {
                this.actions.push({ combo: child.props.combo, callback: child.props.onClick });
            });
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

                this.setActions(accelerators.props);
            }

            return element;
        }
    }
}
