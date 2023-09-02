import React, { useState } from 'react'
import { Tree, TreeNodeInfo } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { useStores } from '$src/hooks/useStores'
import { USERNAME, isMac } from '$src/utils/platform'
import { UserHomeIcons } from '$src/constants/icons'
import { FavoritesState } from '$src/state/favoritesState'
import { AppAlert } from '$src/components/AppAlert'
import CONFIG from '$src/config/appConfig'

import '$src/css/favoritesPanel.css'

export const buildNodes = (
    favorites: FavoritesState,
    { t, path, expanded }: { t: TFunction<'translation', undefined>; path: string; expanded: boolean[] },
): TreeNodeInfo<string>[] => {
    const shouldShowWsl = favorites.distributions.length
    const nodes: TreeNodeInfo<string>[] = [
        {
            id: 0,
            hasCaret: true,
            isExpanded: expanded[0],
            label: t('FAVORITES_PANEL.SHORTCUTS'),
            childNodes: favorites.shortcuts.map((shortcut) => ({
                id: `s_${shortcut.path}`,
                key: `s_${shortcut.path}`,
                label: (
                    <span title={shortcut.path}>
                        {shortcut.label === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${shortcut.label}`)}
                    </span>
                ),
                icon: UserHomeIcons[shortcut.label],
                nodeData: shortcut.path,
                isSelected: shortcut.path === path,
            })) as Array<TreeNodeInfo<string>>,
        },
        {
            id: 1,
            hasCaret: true,
            isExpanded: expanded[1],
            label: t('FAVORITES_PANEL.PLACES'),
            childNodes: favorites.places.map((place) => ({
                id: `p_${place.path}`,
                key: `p_${place.path}`,
                label: <span title={place.path}>{place.label}</span>,
                icon: place.icon,
                nodeData: place.path,
                isSelected: place.path === path,
            })) as Array<TreeNodeInfo<string>>,
        },
    ]

    if (shouldShowWsl) {
        const distributionNodes = favorites.distributions.map((distrib) => ({
            id: `p_${distrib.path}`,
            key: `p_${distrib.path}`,
            label: <span title={distrib.path}>{distrib.label}</span>,
            icon: distrib.icon,
            nodeData: distrib.path,
            isSelected: distrib.path === path,
        }))

        nodes.push({
            id: 2,
            hasCaret: true,
            isExpanded: expanded[2],
            label: t('FAVORITES_PANEL.LINUX'),
            childNodes: distributionNodes as Array<TreeNodeInfo<string>>,
        })
    }

    return nodes
}

export const LeftPanel = observer(({ hide }: { hide: boolean }) => {
    const { t } = useTranslation()
    const { appState } = useStores('appState')
    const { favoritesState } = appState
    const [expanded, setExpanded] = useState([true, true, true])
    const activePath = appState.getActiveCache()?.path || ''
    const nodes = buildNodes(favoritesState, {
        t,
        path: activePath,
        expanded,
    })

    const onNodeClick = async (
        node: TreeNodeInfo<string>,
        _: number[],
        e: React.MouseEvent<HTMLElement>,
    ): Promise<void> => {
        try {
            /* if (node.id === 's_bookmarks'{

            })*/
            await appState.openDirectory({ dir: node.nodeData, fullname: '' }, !(isMac ? e.altKey : e.ctrlKey))
        } catch (err) {
            AppAlert.show(`${err.message} (${err.code})`, {
                intent: 'danger',
            })
        }
    }

    const onNodeToggle = (node: TreeNodeInfo<string>): void => {
        const isExpanded = expanded[node.id as number]
        expanded[node.id as number] = !isExpanded

        setExpanded([...expanded])
    }

    const classnames = classNames(`favoritesPanel ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`, {
        hidden: hide,
    })

    return (
        <Tree
            contents={nodes}
            onNodeClick={onNodeClick}
            onNodeCollapse={onNodeToggle}
            onNodeExpand={onNodeToggle}
            className={classnames}
        />
    )
})
