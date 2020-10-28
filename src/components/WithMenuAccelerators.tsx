import * as React from 'react';
import { ipcRenderer, remote, IpcRendererEvent } from 'electron';

const ACCELERATOR_EVENT = 'menu_accelerator';

export interface MenuAcceleratorEvent {
    combo: string;
}

export interface Constructor<T> {
    // eslint-disable-next-line
    new (...args: any[]): T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (combo?: string, data?: any) => void;

interface Action {
    combo: string;
    callback: Callback;
}

export interface AcceleratorProps {
    combo: string;
    onClick: Callback;
}

export interface MenuAcceleratorComponent extends React.Component {
    /** Components decorated with the `@MenuAccelerator` decorator must implement React's component `render` function. */
    render(): React.ReactElement<HTMLElement> | null | undefined;

    /**
     * Components decorated with the `@MenuAccelerator` decorator must implement
     * this method, and it must return a `Accelerator` React element.
     */
    renderMenuAccelerators(): React.ReactElement<Record<string, unknown>>;
}

export class Accelerators extends React.PureComponent<Record<string, unknown>> {
    render(): React.ReactNode {
        return <div></div>;
    }
}

export class Accelerator extends React.PureComponent<AcceleratorProps> {
    combo: string;
    onClick: Callback;
    render(): React.ReactNode {
        return <div></div>;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sendFakeCombo(combo: string, data?: any): void {
    console.log('sending fake combo');
    const id = remote.getCurrentWindow().id;
    ipcRenderer.sendTo(id, ACCELERATOR_EVENT, Object.assign({ combo: combo, data }));
}

function getDisplayName(ComponentClass: React.ComponentType): string {
    return ComponentClass.displayName || ComponentClass.name || 'Unknown';
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function WithMenuAccelerators<T extends Constructor<MenuAcceleratorComponent>>(WrappedComponent: T) {
    if (typeof WrappedComponent.prototype.renderMenuAccelerators !== 'function') {
        console.warn('Classes decorated with the @MenuAccelerators must define the renderMenuAccelerators method.');
    }

    return class MenuAcceleratorsClass extends WrappedComponent {
        public static displayName = `MenuAccelerators(${getDisplayName(WrappedComponent)})`;

        actions = new Array<Action>();

        getCallback(combo: string): Callback {
            const action = this.actions.find((action) => action.combo === combo);
            return (action && action.callback) || null;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onAccelerator = (e: IpcRendererEvent, data: { combo: string; data: any }) => {
            // check if combo is valid
            const callback = this.getCallback(data.combo);
            if (typeof callback === 'function') {
                callback(data.combo, data.data);
            }
        };

        setActions(props: { children?: React.ReactElement<Accelerator> }): void {
            this.actions.length = 0;

            // get result, save events
            React.Children.forEach(props.children, (child: React.ReactElement<Accelerator>): void => {
                if (child) {
                    this.actions.push({
                        combo: child.props.combo,
                        callback: child.props.onClick,
                    });
                }
            });
        }

        componentDidMount(): void {
            if (super.componentDidMount) {
                super.componentDidMount();
            }

            ipcRenderer.on(ACCELERATOR_EVENT, this.onAccelerator);
        }

        componentWillUnmount(): void {
            if (super.componentWillUnmount) {
                super.componentWillUnmount();
            }

            ipcRenderer.removeListener(ACCELERATOR_EVENT, this.onAccelerator);
        }

        render(): JSX.Element {
            const element = super.render() as JSX.Element;

            // TODO: call renderMenuAccelerators
            if (typeof this.renderMenuAccelerators === 'function') {
                const accelerators = this.renderMenuAccelerators();

                this.setActions(accelerators.props);
            }

            return element;
        }
    };

    // const WrapperWithRef = React.forwardRef((props, ref) => (
    //     <MenuAcceleratorsClass {...props} />
    // ));
    // //hoistNonReactStatics(WrapperWithRef, Comp);
    // WrapperWithRef.WrappedComponent = Comp;

    // return WrapperWithRef;
}
