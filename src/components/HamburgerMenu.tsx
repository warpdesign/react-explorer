import * as React from "react";
import { Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import { withNamespaces, WithNamespaces } from 'react-i18next';

interface IHamburgerProps extends WithNamespaces {
    onOpenPrefs: () => void;
    onOpenShortcuts: () => void;
};

export class HamburgerMenuClass extends React.Component<IHamburgerProps>{
    constructor (props: IHamburgerProps){
        super(props);
    }

    public render() {
        const { t } = this.props;

        return (
        <React.Fragment>
                <Menu>
                <MenuItem text={t('NAV.PREFS')} icon="cog" onClick={this.props.onOpenPrefs}/>
                <MenuDivider />
                <MenuItem text={t('NAV.SHORTCUTS')} icon="lightbulb" onClick={this.props.onOpenShortcuts} />
            </Menu>
        </React.Fragment>
        )
    }
}

const HamburgerMenu = withNamespaces()(HamburgerMenuClass);

export { HamburgerMenu };
