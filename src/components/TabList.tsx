import * as React from 'react'
import { useState, useCallback } from 'react'
import { ButtonGroup, Button, Icon, IconName } from '@blueprintjs/core'
import { observer } from 'mobx-react'
import { MenuItemConstructorOptions, ipcRenderer } from 'electron'
import { useTranslation } from 'react-i18next'

import useIpcRendererListener from '$src/hooks/useIpcRendererListener'
import { sendFakeCombo } from '$src/utils/keyboard'
import { AppAlert } from '$src/components/AppAlert'
import { LocalizedError } from '$src/locale/error'
import { useStores } from '$src/hooks/useStores'
import { UserHomeIcons } from '$src/constants/icons'
import { ALL_DIRS } from '$src/utils/platform'

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
    icon: UserHomeIcons[dirname],
}))

export const getTabIcon = (path: string): IconName => {
    for (const obj of TabIcons) {
        if (obj.regex.test(path)) {
            return obj.icon as IconName
        }
    }

    return 'folder-close'
}

const TabList = observer(() => {
    const { viewState, settingsState } = useStores('viewState', 'settingsState')
    const [selectedMenuIndex, setSelectedMenuIndex] = useState(-1)
    const { t } = useTranslation()

    useIpcRendererListener(
        'context-menu-tab-list:click',
        useCallback(
            (event, command, param) => {
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
        viewState.addCache(settingsState.defaultFolder, index + 1, true)
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
                    AppAlert.show(`${err.message} (${err.code})`, {
                        intent: 'danger',
                    })
                })
        }
    }

    const onFolderContextMenu = (index: number, e: React.MouseEvent): void => {
        console.log('right click')
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
        <ButtonGroup fill className="tablist" alignText="center">
            {caches.map((cache, index) => {
                const closeIcon = caches.length > 1 && (
                    <Icon
                        iconSize={12}
                        htmlTitle={t('TABS.CLOSE')}
                        className="closetab"
                        intent="warning"
                        onClick={(e) => closeTab(index, e)}
                        icon="cross"
                    ></Icon>
                )
                const path = cache.path
                const tabIcon = cache.error ? 'issue' : getTabIcon(path)
                const tabInfo = (cache.getFS() && cache.getFS().displaypath(path)) || {
                    fullPath: '',
                    shortPath: '',
                }

                return (
                    <Button
                        key={'' + viewId + index}
                        onContextMenu={() => onContextMenu(index)}
                        onClick={() => selectTab(index)}
                        title={tabInfo.fullPath}
                        intent={cache.isVisible ? 'primary' : 'none'}
                        rightIcon={closeIcon}
                        className="tab"
                    >
                        <Icon
                            onContextMenu={(e) => onFolderContextMenu(index, e)}
                            className="folder"
                            icon={tabIcon}
                        ></Icon>
                        {tabInfo.shortPath}
                    </Button>
                )
            })}
            <Button
                icon="add"
                className="addtab"
                minimal
                title={t('TABS.NEW')}
                onClick={() => addTab(viewState.getVisibleCacheIndex())}
            ></Button>
        </ButtonGroup>
    )
})

export { TabList }
