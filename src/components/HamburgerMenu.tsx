import * as React from 'react';
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import { withNamespaces, WithNamespaces } from 'react-i18next';

interface HamburgerProps extends WithNamespaces {
    onOpenPrefs: () => void;
    onOpenShortcuts: () => void;
}

export class HamburgerMenuClass extends React.Component<HamburgerProps> {
    constructor(props: HamburgerProps) {
        super(props);
    }

    public render(): React.ReactNode {
        const { t } = this.props;

        return (
            <React.Fragment>
                <Menu className="data-cy-app-menu">
                    <MenuItem text={t('NAV.PREFS')} icon="cog" onClick={this.props.onOpenPrefs} />
                    <MenuDivider />
                    <MenuItem text={t('NAV.SHORTCUTS')} icon="lightbulb" onClick={this.props.onOpenShortcuts} />
                </Menu>
            </React.Fragment>
        );
    }
}

const HamburgerMenu = withNamespaces()(HamburgerMenuClass);

export { HamburgerMenu };
