import * as React from 'react';
import { remote, MenuItemConstructorOptions, Menu } from 'electron';

interface Props {
    template: MenuItemConstructorOptions[];
}

interface State {
    isVisible: boolean;
}

export class ContextMenu extends React.Component<Props, State> {
    menu: Menu = null;

    constructor(props: Props) {
        super(props);

        this.state = {
            isVisible: false,
        };

        // generate menu
        if (props.template) {
            this.menu = remote.Menu.buildFromTemplate(props.template);
        }
    }

    showMenu(template: MenuItemConstructorOptions[] = null): void {
        if (template) {
            this.menu = remote.Menu.buildFromTemplate(template);
        }

        const window = remote.getCurrentWindow();
        this.menu.popup({
            window,
        });
    }

    closeMenu(): void {
        // on the first render, menu isn't opened so there's no need to close it
        this.menu.closePopup();
    }

    componentWillUnmount(): void {
        this.closeMenu();
    }

    render(): React.ReactNode {
        return <div />;
    }
}
