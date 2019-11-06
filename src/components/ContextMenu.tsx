import * as React from "react";
import { remote, MenuItemConstructorOptions, Menu } from 'electron';

interface IProps {
    template: MenuItemConstructorOptions[];
}

interface IState {
    isVisible: boolean;
}

export class ContextMenu extends React.Component<IProps, IState> {
    menu: Menu = null;

    constructor(props: IProps) {
        super(props);

        this.state = {
            isVisible: false
        };

        // generate menu
        if (props.template) {
            this.menu = remote.Menu.buildFromTemplate(props.template);
        }
    }

    showMenu(template: MenuItemConstructorOptions[] = null) {
        if (template) {
            this.menu = remote.Menu.buildFromTemplate(template);
        }

        const window = remote.getCurrentWindow();
        this.menu.popup({
            window
        });
    }

    closeMenu() {
        // on the first render, menu isn't opened so there's no need to close it
        this.menu.closePopup();
    }

    componentWillUnmount() {
        this.closeMenu();
    }

    render() {
        return (<div />);
    }
}
