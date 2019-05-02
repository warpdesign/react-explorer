import * as React from "react";
import { remote, MenuItemConstructorOptions, Menu } from 'electron';

interface IProps {
    onItemClick: (item: number) => void;
    template: MenuItemConstructorOptions[];
}

interface IState {
    isVisible: boolean;
}

export class ContextMenu extends React.Component<IProps, IState> {
    menu: Menu;

    constructor(props: IProps) {
        super(props);

        this.state = {
            isVisible: false
        };

        // generate menu
        this.menu = remote.Menu.buildFromTemplate(props.template);
    }

    showMenu() {
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
