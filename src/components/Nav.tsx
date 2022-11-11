import * as React from 'react'
import { inject, observer } from 'mobx-react'
import { Navbar, Alignment, Button, Classes, Intent } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { Popover2 } from '@blueprintjs/popover2'
import classnames from 'classnames'
import { withNamespaces, WithNamespaces } from 'react-i18next'
import { HamburgerMenu } from './HamburgerMenu'
import { Badge } from './Badge'
import { AppState } from '../state/appState'
import { runInAction } from 'mobx'

interface InjectedProps extends WithNamespaces {
    appState: AppState
}

const NavComponent = inject('appState')(
    observer(
        class NavComponent extends React.Component<WithNamespaces> {
            appState: AppState = null

            constructor(props: WithNamespaces) {
                super(props)

                this.appState = this.injected.appState
            }

            private get injected(): InjectedProps {
                return this.props as InjectedProps
            }

            showDownloadsTab = (): void => {
                this.appState.showDownloadsTab()
            }

            showExplorerTab = (): void => {
                this.appState.showExplorerTab()
            }

            navClick = (): void => {
                if (this.appState.isExplorer) {
                    this.showDownloadsTab()
                } else {
                    this.showExplorerTab()
                }
            }

            onToggleSplitView = (): void => {
                if (this.appState.isExplorer) {
                    const winState = this.appState.winStates[0]
                    winState.toggleSplitViewMode()
                }
            }

            onOpenPrefs = (): void => {
                runInAction(() => (this.appState.isPrefsOpen = true))
            }

            onOpenShortcuts = (): void => {
                runInAction(() => (this.appState.isShortcutsOpen = true))
            }

            render(): React.ReactNode {
                const { t } = this.props
                const isExplorer = this.appState.isExplorer
                const count = this.appState.pendingTransfers
                const badgeText = (count && count + '') || '10'
                const badgeProgress = this.appState.totalTransferProgress
                const downloadClass = classnames(Classes.MINIMAL, 'download')
                const isSplitViewActive = this.appState.winStates[0].splitView

                console.log('render nav', isSplitViewActive)

                return (
                    <Navbar>
                        <Navbar.Group align={Alignment.LEFT} className="title-group">
                            <Navbar.Heading>{t('APP_MENUS.ABOUT_TITLE')}</Navbar.Heading>
                            <Navbar.Divider />
                            <Button
                                className={`${Classes.MINIMAL} data-cy-explorer-tab`}
                                icon="home"
                                text={t('NAV.EXPLORER')}
                                onClick={this.navClick}
                                intent={isExplorer ? Intent.PRIMARY : 'none'}
                            />
                            <Button
                                style={{ position: 'relative' }}
                                className={`${downloadClass} data-cy-downloads-tab`}
                                icon="download"
                                onClick={this.navClick}
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
                                onClick={this.onToggleSplitView}
                                icon={IconNames.PANEL_STATS}
                                title={t('NAV.SPLITVIEW')}
                            />
                            <Navbar.Divider />
                            <Popover2
                                content={
                                    <HamburgerMenu
                                        onOpenShortcuts={this.onOpenShortcuts}
                                        onOpenPrefs={this.onOpenPrefs}
                                    />
                                }
                            >
                                <Button className={`data-cy-toggle-app-menu ${Classes.MINIMAL}`} icon="menu" />
                            </Popover2>
                        </Navbar.Group>
                    </Navbar>
                )
            }
        },
    ),
)

const Nav = withNamespaces()(NavComponent)

export { Nav }
