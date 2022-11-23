import * as React from 'react'
import { Navbar, Alignment, Button, Classes, Intent } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Popover2 } from '@blueprintjs/popover2'
import { runInAction } from 'mobx'
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

    const showDownloadsTab = (): void => {
        appState.showDownloadsTab()
    }

    const showExplorerTab = (): void => {
        appState.showExplorerTab()
    }

    const navClick = (): void => {
        if (appState.isExplorer) {
            showDownloadsTab()
        } else {
            showExplorerTab()
        }
    }

    const onToggleSplitView = (): void => {
        if (appState.isExplorer) {
            const winState = appState.winStates[0]
            winState.toggleSplitViewMode()
        }
    }

    const onOpenPrefs = (): void => {
        runInAction(() => (appState.isPrefsOpen = true))
    }

    const onOpenShortcuts = (): void => {
        runInAction(() => (appState.isShortcutsOpen = true))
    }

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
                <Popover2 content={<HamburgerMenu onOpenShortcuts={onOpenShortcuts} onOpenPrefs={onOpenPrefs} />}>
                    <Button className={`data-cy-toggle-app-menu ${Classes.MINIMAL}`} icon="menu" />
                </Popover2>
            </Navbar.Group>
        </Navbar>
    )
})

export { Nav }
