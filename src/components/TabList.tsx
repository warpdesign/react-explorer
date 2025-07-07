import * as React from 'react'
import { useState, useCallback } from 'react'
import { observer } from 'mobx-react'
import { MenuItemConstructorOptions, ipcRenderer } from 'electron'
import { useTranslation } from 'react-i18next'

import useIpcRendererListener from '$src/hooks/useIpcRendererListener'
import { sendFakeCombo } from '$src/utils/keyboard'
import { showAlertModal } from '$src/components/AppAlert'
import { LocalizedError } from '$src/locale/error'
import { useStores } from '$src/hooks/useStores'
import { UserHomeIcons, UserHomeIconsTabler } from '$src/constants/icons'
import { ActionIcon, Button as Button2, Flex } from '@mantine/core'
import { ALL_DIRS } from '$src/utils/platform'
import {
    Icon,
    IconProps,
    IconFolder,
    IconFolderExclamation,
    IconSquareRoundedX,
    IconCirclePlusFilled,
} from '@tabler/icons-react'

/**
 * build a list of { regex, IconName } to match folders with an icon
 * For eg:
 * {
 *    regex: /^/Users/leo$/,
 *    icon: 'home'
 * }
 */
export const TabIcons = Object.keys(UserHomeIcons).map((dirname: string) => ({
    regex: new RegExp(`^${ALL_DIRS[dirname]}$`),
    icon: UserHomeIconsTabler[dirname],
}))

export const getTabIconTabler = (
    path: string,
): React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Icon>> => {
    for (const obj of TabIcons) {
        if (obj.regex.test(path)) {
            return obj.icon
        }
    }

    return IconFolder
}

const TabList = observer(() => {
    const { viewState, settingsState } = useStores('viewState', 'settingsState')
    const [selectedMenuIndex, setSelectedMenuIndex] = useState(-1)
    const { t } = useTranslation()

    useIpcRendererListener(
        'context-menu-tab-list:click',
        useCallback(
            (_, command, param) => {
                if (!viewState?.isActive) {
                    return
                }

                switch (command) {
                    case 'CLOSE_TAB':
                        closeTab(selectedMenuIndex)
                        break
                    case 'NEW_TAB':
                        addTab(selectedMenuIndex)
                        break
                    case 'CLOSE_OTHERS':
                        closeOthers(selectedMenuIndex)
                        break
                    case 'REFRESH':
                        reloadView(selectedMenuIndex)
                        break
                    case 'OPEN_TERMINAL':
                        openTerminal()
                        break
                    case 'OPEN_FOLDER':
                        onFolderItemClick(param)
                        break
                    default:
                        console.warn('unknown tab context menu command', command)
                }
            },
            [selectedMenuIndex],
        ),
    )

    const addTab = (index: number): void => {
        viewState.addCache(settingsState.defaultFolder, index + 1, {
            activateNewCache: true,
            viewmode: settingsState.defaultViewMode,
        })
    }

    const selectTab = (tabIndex: number): void => viewState.setVisibleCache(tabIndex)

    const closeTab = (tabIndex: number, e?: React.MouseEvent): void => viewState.closeTab(tabIndex)

    const closeOthers = (index: number): void => viewState.closeOthers(index)

    const reloadView = (index: number): void => viewState.caches[index].reload()

    const openTerminal = (): Promise<void> =>
        sendFakeCombo('CmdOrCtrl+K', {
            tabIndex: selectedMenuIndex,
            viewId: viewState.viewId,
        })

    const onContextMenu = (menuIndex: number): void => {
        const tabMenuTemplate = getTabMenu()
        setSelectedMenuIndex(menuIndex)
        ipcRenderer.invoke('Menu:buildFromTemplate', tabMenuTemplate)
    }

    const onFolderItemClick = (path: string): void => {
        const cache = viewState.getVisibleCache()
        if (path) {
            cache
                .openDirectory({
                    dir: cache.path,
                    fullname: path,
                })
                .catch((err: LocalizedError) => {
                    showAlertModal({
                        message: `${err.message} (${err.code})`,
                        intent: 'danger',
                        modalId: 'tabListError',
                    })
                })
        }
    }

    const onFolderContextMenu = (index: number, e: React.MouseEvent): void => {
        e.preventDefault()
        e.stopPropagation()

        const cacheUnderMouse = viewState.caches[index]
        const tree = cacheUnderMouse.getAPI().getParentTree(cacheUnderMouse.path)

        const template: MenuItemConstructorOptions[] = tree.map(
            (el: { dir: string; fullname: string; name: string }) => {
                return {
                    label: el.name,
                    id: `OPEN_FOLDER///${el.fullname}`,
                }
            },
        )

        ipcRenderer.invoke('Menu:buildFromTemplate', template)
    }

    const getTabMenu = (): MenuItemConstructorOptions[] => {
        return [
            {
                label: t('TABS.NEW'),
                id: 'NEW_TAB',
            },
            {
                type: 'separator',
            },
            {
                label: t('TABS.REFRESH'),
                id: 'REFRESH',
            },
            {
                type: 'separator',
            },
            {
                label: t('TABS.CLOSE'),
                id: 'CLOSE_TAB',
            },
            {
                label: t('TABS.CLOSE_OTHERS'),
                id: 'CLOSE_OTHERS',
            },
            {
                type: 'separator',
            },
            {
                label: t('APP_MENUS.OPEN_TERMINAL'),
                id: 'OPEN_TERMINAL',
            },
        ]
    }

    const viewId = viewState.viewId
    const caches = viewState.caches
    // TODO: this will be created at each render: this should only be re-rendered
    // whenever the language has changed

    return (
        <Button2.Group flex={0}>
            {caches.map((cache, index) => {
                const closeIcon = cache.isVisible && caches.length > 1 && (
                    <IconSquareRoundedX
                        size={16}
                        onClick={(e) => {
                            e.stopPropagation()
                            closeTab(index, e)
                        }}
                    />
                )
                const path = cache.path
                const TabIcon = cache.error ? IconFolderExclamation : getTabIconTabler(path)
                const tabInfo = (cache.getFS() && cache.getFS().displaypath(path)) || {
                    fullPath: '',
                    shortPath: '',
                }

                return (
                    <Button2
                        key={'' + viewId + index}
                        onContextMenu={() => onContextMenu(index)}
                        onClick={() => selectTab(index)}
                        title={tabInfo.fullPath}
                        leftSection={<TabIcon size={16} onContextMenu={(e) => onFolderContextMenu(index, e)} />}
                        rightSection={closeIcon}
                        radius="0"
                        variant={cache.isVisible ? 'filled' : 'default'}
                        className="tab"
                        bd="xl"
                    >
                        {tabInfo.shortPath}
                    </Button2>
                )
            })}
            <Flex align="center" mx="sm">
                <ActionIcon variant="white" radius="xl" title={t('TABS.NEW')} size="sm">
                    <IconCirclePlusFilled stroke={1.5} onClick={() => addTab(viewState.getVisibleCacheIndex())} />
                </ActionIcon>
            </Flex>
        </Button2.Group>
    )
})

export { TabList }
