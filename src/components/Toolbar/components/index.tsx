import React from 'react'

import { ViewModeName } from '$src/hooks/useViewMode'
import { Button, Icon, IconName, Menu, MenuDivider, MenuItem } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import { useTranslation } from 'react-i18next'
import { Popover2 } from '@blueprintjs/popover2'
import { TSORT_METHOD_NAME, TSORT_ORDER } from '$src/services/FsSort'

export const getTickIcon = (str: string, expectedStr: string): IconName | undefined =>
    str === expectedStr ? 'small-tick' : 'blank'

export const ViewToggleMenu = ({
    viewmode,
    onClick,
}: {
    viewmode: ViewModeName
    onClick: (viewmode: ViewModeName) => void
}) => {
    const { t } = useTranslation()

    return (
        <Menu>
            <MenuItem
                text={t('TOOLBAR.DETAILS_VIEW')}
                icon={getTickIcon(viewmode, 'details')}
                onClick={() => onClick('details')}
                labelElement={<Icon icon={IconNames.PROPERTIES} />}
            />
            <MenuItem
                text={t('TOOLBAR.ICON_VIEW')}
                icon={getTickIcon(viewmode, 'icons')}
                onClick={() => onClick('icons')}
                labelElement={<Icon icon={IconNames.GRID_VIEW} />}
            />
            <MenuItem
                text={t('TOOLBAR.TILE_VIEW')}
                icon={getTickIcon(viewmode, 'tiles')}
                onClick={() => onClick('tiles')}
                labelElement={<Icon icon={IconNames.GRID_VIEW} />}
            />
        </Menu>
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
        <Popover2 content={<ViewToggleMenu onClick={onClick} viewmode={viewmode} />} placement="bottom-start">
            <Button icon={IconNames.GRID_VIEW} title={t('TOOLBAR.CHANGE_VIEW')} />
        </Popover2>
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
        <Menu>
            <MenuItem
                icon={getTickIcon(sortMethod, 'name')}
                text={t('FILETABLE.COL_NAME')}
                onClick={() => onClick('name', sortOrder)}
            />
            <MenuItem
                icon={getTickIcon(sortMethod, 'size')}
                text={t('FILETABLE.COL_SIZE')}
                onClick={() => onClick('size', sortOrder)}
            />
            <MenuDivider />
            <MenuItem
                icon={getTickIcon(sortOrder, 'asc')}
                text={t('FILETABLE.SORT_ASCENDING')}
                onClick={() => onClick(sortMethod, 'asc')}
            />
            <MenuItem
                icon={getTickIcon(sortOrder, 'desc')}
                text={t('FILETABLE.SORT_DESCENDING')}
                onClick={() => onClick(sortMethod, 'desc')}
            />
        </Menu>
    )
}

export const SortMenuToggle = (props: {
    sortMethod: TSORT_METHOD_NAME
    sortOrder: TSORT_ORDER
    onClick: (sortMethod: TSORT_METHOD_NAME, sortOrder: TSORT_ORDER) => void
}) => {
    const { t } = useTranslation()

    return (
        <Popover2 content={<SortMenu {...props} />} placement="bottom-start">
            <Button icon={IconNames.SORT} title={t('TOOLBAR.CHANGE_SORT_METHOD')} />
        </Popover2>
    )
}
