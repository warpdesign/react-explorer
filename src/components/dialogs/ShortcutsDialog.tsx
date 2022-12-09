import * as React from 'react'
import { Dialog, Classes, Button, KeyCombo, InputGroup, Callout } from '@blueprintjs/core'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { isMac } from '$src/utils/platform'
import CONFIG from '$src/config/appConfig'

interface ShortcutsProps {
    isOpen: boolean
    onClose: () => void
}

interface Combo {
    combo: string
    label: string
}

export const buildShortcuts = (t: TFunction<'translation', undefined>) => ({
    [t('SHORTCUT.GROUP.GLOBAL')]: [
        { combo: 'alt + mod + l', label: t('SHORTCUT.MAIN.DOWNLOADS_TAB') },
        { combo: 'alt + mod + e', label: t('SHORTCUT.MAIN.EXPLORER_TAB') },
        { combo: 'ctrl + alt + right', label: t('SHORTCUT.MAIN.NEXT_VIEW') },
        { combo: 'ctrl + alt + left', label: t('SHORTCUT.MAIN.PREVIOUS_VIEW') },
        { combo: 'mod + r', label: t('SHORTCUT.MAIN.RELOAD_VIEW') },
        { combo: 'escape', label: t('SHORTCUT.LOG.TOGGLE') },
        { combo: 'mod + s', label: t('SHORTCUT.MAIN.KEYBOARD_SHORTCUTS') },
        { combo: 'mod + ,', label: t('SHORTCUT.MAIN.PREFERENCES') },
        { combo: 'alt + mod + i', label: t('SHORTCUT.OPEN_DEVTOOLS') },
        { combo: 'mod + q', label: t('SHORTCUT.MAIN.QUIT') },
        { combo: 'mod + alt + shift + v', label: t('NAV.SPLITVIEW') },
    ],
    [t('SHORTCUT.GROUP.ACTIVE_VIEW')]: [
        { combo: (isMac && 'mod + left') || 'alt + left', label: t('SHORTCUT.ACTIVE_VIEW.BACKWARD_HISTORY') },
        { combo: (isMac && 'mod + right') || 'alt + right', label: t('SHORTCUT.ACTIVE_VIEW.FORWARD_HISTORY') },
        { combo: 'meta + c', label: t('SHORTCUT.ACTIVE_VIEW.COPY') },
        { combo: 'meta + v', label: t('SHORTCUT.ACTIVE_VIEW.PASTE') },
        { combo: 'mod + shift + c', label: t('SHORTCUT.ACTIVE_VIEW.COPY_PATH') },
        { combo: 'mod + shift + n', label: t('SHORTCUT.ACTIVE_VIEW.COPY_FILENAME') },
        { combo: 'mod + o', label: t('SHORTCUT.ACTIVE_VIEW.OPEN_FILE') },
        { combo: 'mod + a', label: t('SHORTCUT.ACTIVE_VIEW.SELECT_ALL') },
        { combo: 'mod + i', label: t('SHORTCUT.ACTIVE_VIEW.SELECT_INVERT') },
        { combo: 'mod + l', label: t('SHORTCUT.ACTIVE_VIEW.FOCUS_PATH') },
        { combo: 'mod + n', label: t('COMMON.MAKEDIR') },
        { combo: 'mod + d', label: t('SHORTCUT.ACTIVE_VIEW.DELETE') },
        { combo: 'mod + k', label: t('SHORTCUT.ACTIVE_VIEW.OPEN_TERMINAL') },
        { combo: 'backspace', label: t('SHORTCUT.ACTIVE_VIEW.PARENT_DIRECTORY') },
        { combo: 'mod + u', label: t('APP_MENUS.TOGGLE_HIDDEN_FILES') },
    ],
    [t('SHORTCUT.GROUP.TABS')]: [
        { combo: 'ctrl + tab', label: t('APP_MENUS.SELECT_NEXT_TAB') },
        { combo: 'ctrl + shift + tab', label: t('APP_MENUS.SELECT_PREVIOUS_TAB') },
        { combo: 'mod + t', label: t('APP_MENUS.NEW_TAB') },
        { combo: 'mod + w', label: t('SHORTCUT.TABS.CLOSE_ACTIVE_TAB') },
    ],
})

const renderShortcuts = (shortcuts: Combo[]) =>
    shortcuts.map((shortcut) => (
        <div key={shortcut.combo} className={Classes.HOTKEY}>
            <div className={Classes.HOTKEY_LABEL}>{shortcut.label}</div>
            <KeyCombo combo={shortcut.combo}></KeyCombo>
        </div>
    ))

const renderTitle = (title: string) => <h4 className={Classes.HEADING}>{title}</h4>

const ShortcutsDialog = ({ isOpen, onClose }: ShortcutsProps) => {
    const { t, i18n } = useTranslation()
    const [shortcutsList, setShortcutsList] = React.useState(() => buildShortcuts(t))
    const [filter, setFilter] = React.useState('')
    const labels = Object.keys(shortcutsList)
    const shortcuts: { [x: string]: Combo[] } = {}
    for (const label of labels) {
        shortcuts[label] = shortcutsList[label].filter((shortcut) => shortcut.label.match(filter))
    }

    const isEmpty = labels.every((label) => shortcuts[label].length === 0)
    React.useEffect(() => {
        setShortcutsList(() => buildShortcuts(t))
    }, [i18n.language])

    return (
        <Dialog
            icon="lightbulb"
            title={t('NAV.SHORTCUTS')}
            isOpen={isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={onClose}
            className="shortcutsDialog"
        >
            <div className={`${Classes.DIALOG_BODY}`}>
                <InputGroup
                    leftIcon="filter"
                    onChange={(e) => {
                        setFilter(e.target.value)
                    }}
                    placeholder={t('DIALOG.SHORTCUTS.FILTER_PLACEHOLDER')}
                    value={filter}
                />
                <div className={`${Classes.HOTKEY_COLUMN} ${CONFIG.CUSTOM_SCROLLBAR_CLASSNAME}`}>
                    {isEmpty ? (
                        <Callout>{t('DIALOG.SHORTCUTS.NO_RESULTS')}</Callout>
                    ) : (
                        <>
                            {labels.map((label) =>
                                shortcuts[label].length ? (
                                    <React.Fragment key={`title_${label}`}>
                                        {renderTitle(label)}
                                        {renderShortcuts(shortcuts[label])}
                                    </React.Fragment>
                                ) : null,
                            )}
                        </>
                    )}
                </div>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button onClick={onClose} className="data-cy-close">
                        {t('COMMON.CLOSE')}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}

export { ShortcutsDialog }
