import * as React from 'react'
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core'
import { useTranslation } from 'react-i18next'

interface HamburgerProps {
    onOpenPrefs: () => void
    onOpenShortcuts: () => void
}

export const HamburgerMenu = ({ onOpenPrefs, onOpenShortcuts }: HamburgerProps) => {
    const { t } = useTranslation()

    return (
        <>
            <Menu className="data-cy-app-menu">
                <MenuItem text={t('NAV.PREFS')} icon="cog" onClick={onOpenPrefs} />
                <MenuDivider />
                <MenuItem text={t('NAV.SHORTCUTS')} icon="lightbulb" onClick={onOpenShortcuts} />
            </Menu>
        </>
    )
}
