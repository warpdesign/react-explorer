import React from 'react'

import { ViewModeName } from '$src/hooks/useViewMode'
import { Button, Menu } from '@mantine/core'
import {
    IconCheck,
    IconColumns,
    IconGridDots,
    IconSortAscending,
    IconSortDescending,
    IconFileText,
    IconChartBar,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'

export const getTickIcon = (str: string, expectedStr: string) => (str === expectedStr ? <IconCheck size={16} /> : null)

export const ViewToggleMenu = ({
    viewmode,
    onClick,
}: {
    viewmode: ViewModeName
    onClick: (viewmode: ViewModeName) => void
}) => {
    const { t } = useTranslation()

    return (
        <>
            <Menu.Item
                leftSection={getTickIcon(viewmode, 'details')}
                rightSection={<IconColumns size={16} />}
                onClick={() => onClick('details')}
            >
                {t('TOOLBAR.DETAILS_VIEW')}
            </Menu.Item>
            <Menu.Item
                leftSection={getTickIcon(viewmode, 'icons')}
                rightSection={<IconGridDots size={16} />}
                onClick={() => onClick('icons')}
            >
                {t('TOOLBAR.ICON_VIEW')}
            </Menu.Item>
        </>
    )
}

export const ViewToggle = ({
    viewmode,
    onClick,
}: {
    viewmode: ViewModeName
    onClick: (viewmode: ViewModeName) => void
}) => {
    const { t } = useTranslation()

    return (
        <Menu position="bottom-start">
            <Menu.Target>
                <Button
                    variant="default"
                    size="compact-sm"
                    title={t('TOOLBAR.CHANGE_VIEW')}
                    style={{ minWidth: 'auto', padding: '4px 8px' }}
                >
                    <IconGridDots size={16} />
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                <ViewToggleMenu onClick={onClick} viewmode={viewmode} />
            </Menu.Dropdown>
        </Menu>
    )
}

export const SortMenu = ({
    sortMethod,
    sortOrder,
    onClick,
}: {
    sortMethod: TSORT_METHOD_NAME
    sortOrder: TSORT_ORDER
    onClick: (sortMethod: TSORT_METHOD_NAME, sortOrder: TSORT_ORDER) => void
}) => {
    const { t } = useTranslation()

    return (
        <>
            <Menu.Item
                leftSection={getTickIcon(sortMethod, 'name')}
                rightSection={<IconFileText size={16} />}
                onClick={() => onClick('name', sortOrder)}
            >
                {t('FILETABLE.COL_NAME')}
            </Menu.Item>
            <Menu.Item
                leftSection={getTickIcon(sortMethod, 'size')}
                rightSection={<IconChartBar size={16} />}
                onClick={() => onClick('size', sortOrder)}
            >
                {t('FILETABLE.COL_SIZE')}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
                leftSection={getTickIcon(sortOrder, 'asc')}
                rightSection={<IconSortAscending size={16} />}
                onClick={() => onClick(sortMethod, 'asc')}
            >
                {t('FILETABLE.SORT_ASCENDING')}
            </Menu.Item>
            <Menu.Item
                leftSection={getTickIcon(sortOrder, 'desc')}
                rightSection={<IconSortDescending size={16} />}
                onClick={() => onClick(sortMethod, 'desc')}
            >
                {t('FILETABLE.SORT_DESCENDING')}
            </Menu.Item>
        </>
    )
}

export const SortMenuToggle = (props: {
    sortMethod: TSORT_METHOD_NAME
    sortOrder: TSORT_ORDER
    onClick: (sortMethod: TSORT_METHOD_NAME, sortOrder: TSORT_ORDER) => void
}) => {
    const { t } = useTranslation()

    return (
        <Menu position="bottom-start">
            <Menu.Target>
                <Button
                    variant="default"
                    size="compact-sm"
                    title={t('TOOLBAR.CHANGE_SORT_METHOD')}
                    style={{ minWidth: 'auto', padding: '4px 8px' }}
                >
                    <IconSortAscending size={16} />
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                <SortMenu {...props} />
            </Menu.Dropdown>
        </Menu>
    )
}
