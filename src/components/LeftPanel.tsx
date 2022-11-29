import * as React from 'react'
import { Tree, TreeNodeInfo } from '@blueprintjs/core'
import { IReactionDisposer, reaction, toJS, IObservableArray } from 'mobx'
import { observer, inject } from 'mobx-react'
import i18next from 'i18next'
import { withTranslation, WithTranslation } from 'react-i18next'
import classNames from 'classnames'

import { USERNAME, isMac } from '$src/utils/platform'
import { hasWSL } from '$src/utils/wsl'
import { UserHomeIcons } from '$src/constants/icons'
import { FavoritesState, Favorite } from '$src/state/favoritesState'
import { AppState } from '$src/state/appState'
import { AppAlert } from '$src/components/AppAlert'
import CONFIG from '$src/config/appConfig'

require('$src/css/favoritesPanel.css')

interface LeftPanelState {
    nodes: TreeNodeInfo<string>[]
    selectedNode: TreeNodeInfo<string>
}

interface Props extends WithTranslation {
    hide: boolean
}

interface InjectedProps extends Props {
    appState: AppState
}

export const LeftPanelClass = inject('appState')(
    observer(
        class LeftPanelClass extends React.Component<Props, LeftPanelState> {
            favoritesState: FavoritesState
            disposers: Array<IReactionDisposer> = []
            // we have to make an async call to check for WSL
            // so we first set it to false
            showDistributions = false

            constructor(props: Props) {
                super(props)

                const { t } = props

                this.state = {
                    nodes: [
                        {
                            id: 0,
                            hasCaret: true,
                            isExpanded: true,
                            label: t('FAVORITES_PANEL.SHORTCUTS'),
                            childNodes: [],
                        },
                        {
                            id: 1,
                            hasCaret: true,
                            isExpanded: true,
                            label: t('FAVORITES_PANEL.PLACES'),
                            childNodes: [],
                        },
                    ],
                    selectedNode: null,
                }

                this.favoritesState = this.injected.appState.favoritesState

                this.installReactions()
                this.bindLanguageChange()
                if (!window.ENV.CY) {
                    this.checkForWSL()
                }
            }

            private checkForWSL = async (): Promise<boolean> => {
                console.log('checking for WSL')
                this.showDistributions = await hasWSL()
                if (this.showDistributions) {
                    console.log('WSL detected')
                    const { t } = this.props
                    const { nodes } = this.state

                    nodes.push({
                        id: 2,
                        hasCaret: true,
                        isExpanded: true,
                        label: t('FAVORITES_PANEL.LINUX'),
                        childNodes: [],
                    })

                    this.setState({ nodes })
                }
                return this.showDistributions
            }

            private bindLanguageChange = (): void => {
                console.log('languageChanged')
                i18next.on('languageChanged', this.onLanguageChanged)
            }

            private unbindLanguageChange = (): void => {
                i18next.off('languageChanged', this.onLanguageChanged)
            }

            public onLanguageChanged = (lang: string): void => {
                console.log('building nodes', lang)
                this.buildNodes(this.favoritesState)
            }

            private get injected(): InjectedProps {
                return this.props as InjectedProps
            }

            componentWillUnmount(): void {
                this.disposers.forEach((disposer) => disposer())
                this.unbindLanguageChange()
            }

            private installReactions(): void {
                this.disposers.push(
                    reaction(
                        (): IObservableArray<Favorite> => toJS(this.favoritesState.places),
                        (/*_: Favorite[]*/): void => {
                            if (!this.props.hide) {
                                console.log('places updated: need to rebuild nodes')
                                this.buildNodes(this.favoritesState)
                            }
                        },
                    ),
                )

                this.disposers.push(
                    reaction(
                        (): IObservableArray<Favorite> => toJS(this.favoritesState.distributions),
                        (/*_: Favorite[]*/): void => {
                            if (!this.props.hide) {
                                console.log('distributions updated: need to rebuild nodes')
                                this.buildNodes(this.favoritesState)
                            }
                        },
                    ),
                )
            }

            /**
             *
             * @param path string attempts to find the first node with the given path
             *
             * @returns TreeNodeInfo<string> | null
             */
            getNodeFromPath(path: string): TreeNodeInfo<string> {
                const { nodes } = this.state
                const shortcuts = nodes[0].childNodes
                const places = nodes[1].childNodes

                const found =
                    shortcuts.find((node) => node.nodeData === path) || places.find((node) => node.nodeData === path)

                if (found || !this.showDistributions) {
                    return found
                } else {
                    const distribs = nodes[2].childNodes
                    return distribs.find((node) => node.nodeData === path)
                }
            }

            setActiveNode(path: string): void {
                const { nodes } = this.state
                nodes.forEach((node) => node.childNodes.forEach((childNode) => (childNode.isSelected = false)))

                // get active path based on path
                const selectedNode = this.getNodeFromPath(path)
                if (selectedNode) {
                    selectedNode.isSelected = true
                }
            }

            getActiveCachePath(): string {
                const { appState } = this.injected
                const activeCache = appState.getActiveCache()

                if (activeCache) {
                    return activeCache.path
                } else {
                    return ''
                }
            }

            openFavorite(path: string, sameView: boolean): void {
                const { appState } = this.injected
                appState.openDirectory({ dir: path, fullname: '' }, sameView)
            }

            onNodeClick = async (
                node: TreeNodeInfo<string>,
                _: number[],
                e: React.MouseEvent<HTMLElement>,
            ): Promise<void> => {
                try {
                    await this.openFavorite(node.nodeData, !(isMac ? e.altKey : e.ctrlKey))
                } catch (err) {
                    AppAlert.show(`${err.message} (${err.code})`, {
                        intent: 'danger',
                    })
                }
            }

            onNodeToggle = (node: TreeNodeInfo<string>): void => {
                node.isExpanded = !node.isExpanded
                this.setState(this.state)
            }

            buildNodes(favorites: FavoritesState): void {
                const { t } = this.props
                const { nodes } = this.state
                const shortcuts = nodes[0]
                const places = nodes[1]
                const distributions = nodes[2]

                shortcuts.childNodes = favorites.shortcuts.map((shortcut) => ({
                    id: `s_${shortcut.path}`,
                    key: `s_${shortcut.path}`,
                    label: (
                        <span title={shortcut.path}>
                            {shortcut.label === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${shortcut.label}`)}
                        </span>
                    ),
                    icon: UserHomeIcons[shortcut.label],
                    nodeData: shortcut.path,
                }))

                places.childNodes = favorites.places.map((place) => ({
                    id: `p_${place.path}`,
                    key: `p_${place.path}`,
                    label: <span title={place.path}>{place.label}</span>,
                    icon: place.icon,
                    nodeData: place.path,
                }))

                if (this.showDistributions && favorites.distributions) {
                    distributions.childNodes = favorites.distributions.map((distrib) => ({
                        id: `p_${distrib.path}`,
                        key: `p_${distrib.path}`,
                        label: <span title={distrib.path}>{distrib.label}</span>,
                        icon: distrib.icon,
                        nodeData: distrib.path,
                    }))
                }

                // update root nodes label too
                places.label = t('FAVORITES_PANEL.PLACES')
                shortcuts.label = t('FAVORITES_PANEL.SHORTCUTS')
                if (distributions) {
                    distributions.label = t('FAVORITES_PANEL.LINUX')
                }

                this.setState(this.state)
            }

            render(): React.ReactNode {
                const path = this.getActiveCachePath()
                this.setActiveNode(path)
                const { nodes } = this.state
                const classnames = classNames(`favoritesPanel ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`, {
                    hidden: this.props.hide,
                })

                return (
                    <Tree
                        contents={nodes}
                        onNodeClick={this.onNodeClick}
                        onNodeCollapse={this.onNodeToggle}
                        onNodeExpand={this.onNodeToggle}
                        className={classnames}
                    />
                )
            }
        },
    ),
)

const LeftPanel = withTranslation()(LeftPanelClass)

export { LeftPanel }
