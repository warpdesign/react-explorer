import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from '@mantine/core'
import { IconAdjustmentsHorizontal, IconBulb, IconSettings } from '@tabler/icons-react'

interface HamburgerProps {
    onOpenPrefs: () => void
    onOpenShortcuts: () => void
}

export const HamburgerMenu = ({ onOpenPrefs, onOpenShortcuts }: HamburgerProps) => {
    const { t } = useTranslation()

    return (
        <>
            <Menu.Item leftSection={<IconSettings size={14} />} onClick={onOpenPrefs}>
                {t('NAV.PREFS')}
            </Menu.Item>
            <Menu.Item leftSection={<IconBulb size={14} />} onClick={onOpenShortcuts}>
                {t('NAV.SHORTCUTS')}
            </Menu.Item>
        </>
    )
}
