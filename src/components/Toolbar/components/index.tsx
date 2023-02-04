import React from 'react'

import { LayoutName } from '$src/hooks/useLayout'
import { Button, Icon, IconName, Menu, MenuItem } from '@blueprintjs/core'
import { useTranslation } from 'react-i18next'
import { Popover2 } from '@blueprintjs/popover2'

export const getTickIcon = (currentLayout: LayoutName, wantedLayout: LayoutName): IconName | undefined =>
    currentLayout === wantedLayout ? 'small-tick' : undefined

export const ViewToggleMenu = ({ layout, onClick }: { layout: LayoutName; onClick: (layout: LayoutName) => void }) => {
    const { t } = useTranslation()

    return (
        <Menu>
            <MenuItem
                text={t('TOOLBAR.DETAILS_VIEW')}
                icon="properties"
                onClick={() => onClick('details')}
                labelElement={<Icon icon={getTickIcon(layout, 'details')} />}
            />
            <MenuItem
                text={t('TOOLBAR.ICON_VIEW')}
                icon="grid-view"
                onClick={() => onClick('icons')}
                labelElement={<Icon icon={getTickIcon(layout, 'icons')} />}
            />
        </Menu>
    )
}

export const ViewToggle = ({ layout, onClick }: { layout: LayoutName; onClick: (layout: LayoutName) => void }) => {
    const { t } = useTranslation()
    const icon = layout === 'details' ? 'properties' : 'grid-view'

    return (
        <Popover2 content={<ViewToggleMenu onClick={onClick} layout={layout} />} placement="bottom-start">
            <Button rightIcon="caret-down" icon={icon} title={t('TOOLBAR.CHANGE_VIEW')} />
        </Popover2>
    )
}
