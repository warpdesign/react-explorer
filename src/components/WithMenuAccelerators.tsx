import * as React from "react";
import { ipcRenderer, remote } from "electron";

const ACCELERATOR_EVENT = "menu_accelerator";

export interface MenuAcceleratorEvent {
    combo: string;
}

export interface IConstructor<T> {
    new (...args: any[]): T;
}

export interface IAcceleratorsProps {}

interface Action {
    combo: string;
    callback: (combo?: string, data?: any) => any;
}

export interface IAcceleratorProps {
    combo: string;
    onClick: (combo?: string, data?: any) => any;
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

export class Accelerators extends React.PureComponent<IAcceleratorsProps> {
    render() {
        return <div></div>;
    }
}

export class Accelerator extends React.PureComponent<IAcceleratorProps> {
    render() {
        return <div></div>;
    }
}

export function sendFakeCombo(combo: string, data?: any) {
    console.log("sending fake combo");
    const id = remote.getCurrentWindow().id;
    ipcRenderer.sendTo(
        id,
        ACCELERATOR_EVENT,
        Object.assign({ combo: combo, data })
    );
}

function getDisplayName(ComponentClass: React.ComponentType): string {
    return ComponentClass.displayName || ComponentClass.name || "Unknown";
}

export function WithMenuAccelerators<
    T extends IConstructor<IMenuAcceleratorComponent>
>(WrappedComponent: T) {
    if (
        typeof WrappedComponent.prototype.renderMenuAccelerators !== "function"
    ) {
        console.warn(
            "Classes decorated with the @MenuAccelerators must define the renderMenuAccelerators method."
        );
    }

    return class MenuAcceleratorsClass extends WrappedComponent {
        public static displayName = `MenuAccelerators(${getDisplayName(
            WrappedComponent
        )})`;

        actions = new Array<Action>();

        getCallback(combo: string): (combo?: string, data?: any) => any {
            const action = this.actions.find(action => action.combo === combo);
            return (action && action.callback) || null;
        }

        onAccelerator = (
            e: MenuAcceleratorEvent,
            data: { combo: string; data: any }
        ) => {
            // check if combo is valid
            const callback = this.getCallback(data.combo);
            if (typeof callback === "function") {
                callback(data.combo, data.data);
            }
        };

        setActions(props: { children?: React.ReactElement<Accelerator> }) {
            this.actions.length = 0;

            // get result, save events
            React.Children.forEach(
                props.children,
                (child: React.ReactElement<any>) => {
                    if (child) {
                        this.actions.push({
                            combo: child.props.combo,
                            callback: child.props.onClick
                        });
                    }
                }
            );
        }

        componentDidMount() {
            if (super.componentDidMount) {
                super.componentDidMount();
            }

            ipcRenderer.on(ACCELERATOR_EVENT, this.onAccelerator);
        }

        componentWillUnmount() {
            if (super.componentWillUnmount) {
                super.componentWillUnmount();
            }

            ipcRenderer.removeListener(ACCELERATOR_EVENT, this.onAccelerator);
        }

        render() {
            const element = super.render() as JSX.Element;

            // TODO: call renderMenuAccelerators
            if (typeof this.renderMenuAccelerators === "function") {
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
