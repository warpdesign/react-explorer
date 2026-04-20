import React, { useState } from 'react'
import { observer } from 'mobx-react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { useStores } from '$src/hooks/useStores'
import { USERNAME, isMac } from '$src/utils/platform'
import { UserHomeIconsTabler } from '$src/constants/icons'
import { FavoritesState } from '$src/state/favoritesState'
import { showAlertModal } from '$src/components/AppAlert'

import '$src/css/favoritesPanel.css'
import { Group, ScrollArea, TreeNodeData, Tree, UseTreeReturnType } from '@mantine/core'
import { IconCaretRightFilled, IconFolder } from '@tabler/icons-react'
import { IconButton } from './common/IconButton'

export const buildNodes = (
    favorites: FavoritesState,
    { t, path }: { t: TFunction<'translation', undefined>; path: string },
): TreeNodeData[] => {
    const shouldShowWsl = favorites.distributions.length
    const nodes: TreeNodeData[] = [
        {
            label: t('FAVORITES_PANEL.SHORTCUTS'),
            value: 'FAVORITES_PANEL.SHORTCUTS',
            children: favorites.shortcuts.map(
                (shortcut) =>
                    ({
                        value: `s_${shortcut.path}`,
                        label: shortcut.label === 'HOME_DIR' ? USERNAME : t(`FAVORITES_PANEL.${shortcut.label}`),
                        nodeProps: {
                            icon: UserHomeIconsTabler[shortcut.label],
                            isSelected: shortcut.path === path,
                            path: `${shortcut.path}`,
                        },
                    } as TreeNodeData),
            ),
        } as TreeNodeData,
        {
            label: t('FAVORITES_PANEL.PLACES'),
            value: 'FAVORITES_PANEL.PLACES',
            children: favorites.places.map(
                (place) =>
                    ({
                        value: `s_${place.path}`,
                        label: `${place.label}`,
                        nodeProps: {
                            icon: IconFolder,
                            isSelected: place.path === path,
                            path: `${place.path}`,
                        },
                    } as TreeNodeData),
            ),
        } as TreeNodeData,
    ]

    if (shouldShowWsl) {
        const distributionNodes = favorites.distributions.map((distrib) => ({
            value: `p_${distrib.path}`,
            label: distrib.label,
            nodeProps: {
                icon: distrib.icon,
                path: distrib.path,
                isSelected: distrib.path === path,
            },
        })) as TreeNodeData[]

        nodes.push({
            value: 'FAVORITES_PANEL.LINUX',
            label: t('FAVORITES_PANEL.LINUX'),
            children: distributionNodes,
        })
    }

    return nodes
}

export const LeftPanel = observer(({ hide }: { hide: boolean }) => {
    const { t } = useTranslation()
    const { appState } = useStores('appState')
    const { favoritesState } = appState
    const activePath = appState.getActiveCache()?.path || ''
    const nodes = buildNodes(favoritesState, {
        t,
        path: activePath,
    })

    const [expandedState, setExpandedState] = useState({
        'FAVORITES_PANEL.SHORTCUTS': true,
        'FAVORITES_PANEL.PLACES': true,
        'FAVORITES_PANEL.LINUX': true,
    })

    const onNodeClick = async (node: TreeNodeData, e: React.MouseEvent<HTMLElement>): Promise<void> => {
        try {
            await appState.openDirectory({ dir: node.nodeProps.path, fullname: '' }, !(isMac ? e.altKey : e.ctrlKey))
        } catch (err) {
            showAlertModal({
                message: `${err.message} (${err.code})`,
                intent: 'danger',
                modalId: 'favoritesPanelError',
            })
        }
    }

    // Note: we use a fake tree object because of a bug in Mantine Tree component
    // which causes the component to endlessly re-render when the tree Data is
    // defined inside the component.
    // See: https://github.com/mantinedev/mantine/issues/6916
    const tree = {
        expandedState: expandedState,
        selectedState: [],
        initialize: () => {},
        setHoveredNode: () => {},
        toggleExpanded: (value: string) => {
            setExpandedState({
                ...expandedState,
                [value]: !expandedState[value as keyof typeof expandedState],
            })
        },
    } as unknown as UseTreeReturnType

    return (
        <>
            <ScrollArea overscrollBehavior="contain" scrollbarSize={8} scrollHideDelay={500} h="100%">
                <Tree
                    tree={tree}
                    data={nodes}
                    levelOffset={0}
                    renderNode={({ node, expanded, elementProps }) => {
                        const { nodeProps } = node

                        return (
                            <Group gap={5} {...elementProps}>
                                {!nodeProps && (
                                    <IconButton
                                        pl="xs"
                                        w="100%"
                                        size="sm"
                                        icon={IconCaretRightFilled}
                                        variant="transparent"
                                        radius="0"
                                        iconProps={{
                                            style: { transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' },
                                        }}
                                    >
                                        {node.label}
                                    </IconButton>
                                )}
                                {nodeProps && (
                                    <IconButton
                                        w="100%"
                                        size="sm"
                                        icon={nodeProps.icon}
                                        radius="0"
                                        onClick={(e) => onNodeClick(node, e)}
                                        active={nodeProps.isSelected}
                                        pl="lg"
                                    >
                                        {node.label}
                                    </IconButton>
                                )}
                            </Group>
                        )
                    }}
                />
            </ScrollArea>
        </>
    )
})
