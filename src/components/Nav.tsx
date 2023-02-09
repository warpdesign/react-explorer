import * as React from 'react'
import { Navbar, Alignment, Button, Classes, Intent } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Popover2 } from '@blueprintjs/popover2'
import { observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { HamburgerMenu } from '$src/components/HamburgerMenu'
import { Badge } from '$src/components/Badge'
import { useStores } from '$src/hooks/useStores'

const Nav = observer(() => {
    const { appState } = useStores('appState')
    const { transferListState } = appState
    const { t } = useTranslation()
    const isExplorer = appState.isExplorer
    const count = appState.transferListState.pendingTransfers
    const badgeText = (count && count + '') || ''
    const badgeProgress = transferListState.totalTransferProgress
    const downloadClass = classNames(Classes.MINIMAL, 'download')
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
        <Navbar>
            <Navbar.Group align={Alignment.LEFT} className="title-group">
                <Navbar.Heading>{t('APP_MENUS.ABOUT_TITLE')}</Navbar.Heading>
                <Navbar.Divider />
                <Button
                    className={`${Classes.MINIMAL} data-cy-explorer-tab`}
                    icon="home"
                    text={t('NAV.EXPLORER')}
                    onClick={navClick}
                    intent={isExplorer ? Intent.PRIMARY : 'none'}
                />
                <Button
                    style={{ position: 'relative' }}
                    className={`${downloadClass} data-cy-downloads-tab`}
                    icon="download"
                    onClick={navClick}
                    intent={!isExplorer ? Intent.PRIMARY : 'none'}
                >
                    {t('NAV.TRANSFERS')}
                    <Badge intent="none" text={badgeText} progress={badgeProgress} />
                </Button>
            </Navbar.Group>
            <Navbar.Group align={Alignment.RIGHT}>
                <Button
                    className={`data-cy-toggle-splitview ${Classes.MINIMAL}`}
                    active={isSplitViewActive}
                    intent={(isSplitViewActive && 'primary') || 'none'}
                    onClick={onToggleSplitView}
                    icon={IconNames.PANEL_STATS}
                    title={t('NAV.SPLITVIEW')}
                />
                <Navbar.Divider />
                <Popover2
                    content={
                        <HamburgerMenu
                            onOpenShortcuts={(): void => appState.toggleShortcutsDialog(true)}
                            onOpenPrefs={(): void => appState.togglePrefsDialog(true)}
                        />
                    }
                >
                    <Button className={`data-cy-toggle-app-menu ${Classes.MINIMAL}`} icon={IconNames.SETTINGS} />
                </Popover2>
            </Navbar.Group>
        </Navbar>
    )
})

export { Nav }
