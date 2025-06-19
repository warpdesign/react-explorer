import * as React from 'react'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'

import { HamburgerMenu } from '$src/components/HamburgerMenu'
import { useStores } from '$src/hooks/useStores'
import { ActionIcon, Divider, Group, Menu, Button, Indicator } from '@mantine/core'
import { IconAdjustmentsHorizontal, IconBorderVertical, IconHomeFilled, IconDownload } from '@tabler/icons-react'

const Nav = observer(() => {
    const { appState } = useStores('appState')
    // const { transferListState } = appState
    const { t } = useTranslation()
    const isExplorer = appState.isExplorer
    const count = appState.transferListState.pendingTransfers
    // const badgeText = (count && count + '') || ''
    // const badgeProgress = transferListState.totalTransferProgress
    const isSplitViewActive = appState.winStates[0].splitView

    const navClick = (): void => {
        if (appState.isExplorer) {
            appState.toggleExplorerTab(false)
        } else {
            appState.toggleExplorerTab(true)
        }
    }

    const onToggleSplitView = (): void => appState.isExplorer && appState.toggleSplitViewMode()

    return (
        <div style={{ height: '100%' }}>
            <Group h="100%" px="md" bg="background">
                <Group justify="space-between" style={{ flex: 1 }}>
                    <Group gap="sm" visibleFrom="sm">
                        {t('APP_MENUS.ABOUT_TITLE')}
                        <Divider size="sm" orientation="vertical" />
                        <Button
                            leftSection={<IconHomeFilled size={16} />}
                            className="data-cy-explorer-tab"
                            onClick={navClick}
                            size="xs"
                            variant={isExplorer ? 'filled' : 'subtle'}
                            color={!isExplorer ? '#4a5056' : ''}
                        >
                            {t('NAV.EXPLORER')}
                        </Button>
                        <Indicator color="teal" disabled={count === 0} processing={count > 0}>
                            <Button
                                leftSection={<IconDownload size={16} />}
                                className="data-cy-downloads-tab"
                                onClick={navClick}
                                size="xs"
                                variant={!isExplorer ? 'filled' : 'subtle'}
                                color={isExplorer ? '#4a5056' : ''}
                            >
                                {t('NAV.TRANSFERS')}
                            </Button>
                        </Indicator>
                    </Group>
                    <Group ml="xl" gap="sm" visibleFrom="sm">
                        <ActionIcon
                            variant={(isSplitViewActive && 'filled') || 'subtle'}
                            size="md"
                            onClick={onToggleSplitView}
                            title={t('NAV.SPLITVIEW')}
                        >
                            <IconBorderVertical size={24} stroke={1.5} />
                        </ActionIcon>
                        <Divider size="sm" orientation="vertical" />
                        <Menu width={200} position="bottom" withArrow shadow="md">
                            <Menu.Target>
                                <ActionIcon variant="subtle" size="lg">
                                    <IconAdjustmentsHorizontal size={24} stroke={1.5} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown className="data-cy-app-menu">
                                <HamburgerMenu
                                    onOpenShortcuts={(): void => appState.toggleShortcutsDialog(true)}
                                    onOpenPrefs={(): void => appState.togglePrefsDialog(true)}
                                />
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </Group>
        </div>
    )
})

export { Nav }
