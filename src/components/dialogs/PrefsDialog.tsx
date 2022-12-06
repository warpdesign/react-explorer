import * as React from 'react'
import { useState } from 'react'
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup, MenuItem } from '@blueprintjs/core'
import { Tooltip2 } from '@blueprintjs/popover2'
import { Select2, ItemRenderer } from '@blueprintjs/select'
import { useTranslation } from 'react-i18next'
import { ipcRenderer } from 'electron'

import { debounce } from '$src/utils/debounce'
import { FsLocal, FolderExists } from '$src/services/plugins/FsLocal'
import { AppAlert } from '$src/components/AppAlert'
import { HOME_DIR } from '$src/utils/platform'
import { useStores } from '$src/hooks/useStores'

const DEBOUNCE_DELAY = 300

interface PrefsProps {
    isOpen: boolean
    onClose: () => void
}

interface Language {
    lang: string
    code: string
}

interface Theme {
    name: string
    code: boolean | 'auto'
}

const PrefsDialog = ({ isOpen, onClose }: PrefsProps) => {
    const { settingsState } = useStores('settingsState')

    const [lang, setLang] = useState(settingsState.lang)
    const [defaultFolder, setDefaultFolder] = useState(settingsState.defaultFolder)
    const [darkMode, setDarkMode] = useState(settingsState.darkMode)
    const [defaultTerminal, setDefaultTerminal] = useState(settingsState.defaultTerminal)
    const [isFolderValid, setIsFolderValid] = useState(
        () => FsLocal.canread(defaultFolder) && FolderExists(defaultFolder),
    )
    const { t } = useTranslation()

    const checkPath: (path: string) => void = debounce((path: string) => {
        const isValid = FsLocal.canread(path) && FolderExists(path)
        if (path !== settingsState.defaultFolder) {
            setIsFolderValid(isValid)
            // need to save settings
            if (isValid) {
                settingsState.setDefaultFolder(path)
                settingsState.saveSettings()
            }
        } else if (!isFolderValid) {
            // remove error
            setIsFolderValid(isValid)
        }
    }, DEBOUNCE_DELAY)

    const onFolderChange = (event: React.FormEvent<HTMLElement>): void => {
        const path = (event.target as HTMLInputElement).value
        setDefaultFolder(path)
        checkPath(path)
    }

    const onFolderBlur = (): void => {
        if (!isFolderValid) {
            setDefaultFolder(settingsState.defaultFolder)
            setIsFolderValid(true)
        }
    }

    const renderLanguageItem: ItemRenderer<Language> = (lang, { handleClick, modifiers }) => {
        return (
            <MenuItem
                active={modifiers.active}
                key={lang.code}
                label={lang.code}
                onClick={handleClick}
                text={lang.lang}
            />
        )
    }

    const renderThemeItem: ItemRenderer<Theme> = (theme, { handleClick, modifiers }) => {
        return (
            <MenuItem active={modifiers.active} key={theme.code.toString()} onClick={handleClick} text={theme.name} />
        )
    }

    const getSortedLanguages = (): Array<Language> => {
        const auto = [{ code: 'auto', lang: t('COMMON.AUTO') }]
        const languages = (t('LANG', { returnObjects: true }) as Array<Language>).sort(
            (lang1: Language, lang2: Language) => {
                if (lang1.lang < lang2.lang) {
                    return -1
                } else return lang1.lang > lang2.lang ? 1 : 0
            },
        )

        return auto.concat(languages)
    }

    const getThemeList = (): Array<Theme> => {
        return [
            {
                code: 'auto',
                name: t('COMMON.AUTO'),
            },
            {
                code: true,
                name: t('DIALOG.PREFS.DARK'),
            },
            {
                code: false,
                name: t('DIALOG.PREFS.BRIGHT'),
            },
        ]
    }

    const onLanguageSelect = (newLang: Language): void => {
        setLang(newLang.code)
        settingsState.setLanguage(newLang.code)
        settingsState.saveSettings()
    }

    const onThemeSelect = (newTheme: Theme): void => {
        setDarkMode(newTheme.code)
        settingsState.setActiveTheme(newTheme.code)
        settingsState.saveSettings()
    }

    const onResetPrefs = (): void => {
        settingsState.resetSettings()
        setLang(settingsState.lang)
        setDarkMode(settingsState.darkMode)
        setDefaultFolder(settingsState.defaultFolder)
        setDefaultTerminal(settingsState.defaultTerminal)
    }

    const onTerminalChange = (event: React.FormEvent<HTMLElement>): void => {
        const terminal = (event.target as HTMLInputElement).value
        setDefaultTerminal(terminal)
        settingsState.setDefaultTerminal(terminal)
        settingsState.saveSettings()
    }

    const testTerminal = async (): Promise<void> => {
        const path = settingsState.getTerminalCommand(HOME_DIR)

        const { code, terminal } = await ipcRenderer.invoke('openTerminal', path)

        code &&
            AppAlert.show(t('DIALOG.PREFS.TEST_TERMINAL_FAILED', { terminal, code }), {
                intent: Intent.DANGER,
                icon: 'error',
            })
    }

    const languageItems = getSortedLanguages()
    const selectedLanguage = languageItems.find((language: Language) => language.code === lang)
    const themeItems = getThemeList()
    const selectedTheme = themeItems.find((theme: Theme) => theme.code === darkMode)
    const activeTheme = settingsState.isDarkModeActive ? t('DIALOG.PREFS.DARK') : t('DIALOG.PREFS.BRIGHT')
    const intent: Intent = isFolderValid ? Intent.NONE : Intent.DANGER
    const testTerminalButton = (
        <Tooltip2 content={t('DIALOG.PREFS.TEST_TERMINAL')}>
            <Button icon="play" intent={Intent.PRIMARY} minimal={true} onClick={testTerminal} />
        </Tooltip2>
    )

    return (
        <Dialog
            icon="cog"
            className="data-cy-prefs-dialog"
            title={t('DIALOG.PREFS.TITLE')}
            isOpen={isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={onClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <FormGroup inline={true} label={t('DIALOG.PREFS.LANGUAGE')}>
                    <Select2<Language>
                        filterable={false}
                        activeItem={selectedLanguage}
                        items={languageItems}
                        itemRenderer={renderLanguageItem}
                        onItemSelect={onLanguageSelect}
                    >
                        <Button
                            className="data-cy-language-select"
                            icon="flag"
                            rightIcon="caret-down"
                            text={selectedLanguage.lang}
                        />
                    </Select2>
                </FormGroup>

                <FormGroup inline={true} label={t('DIALOG.PREFS.THEME')}>
                    <Select2<Theme>
                        filterable={false}
                        activeItem={selectedTheme}
                        items={themeItems}
                        itemRenderer={renderThemeItem}
                        onItemSelect={onThemeSelect}
                    >
                        <Button
                            icon="contrast"
                            rightIcon="caret-down"
                            text={
                                selectedTheme.code === 'auto'
                                    ? `${selectedTheme.name} (${activeTheme})`
                                    : `${selectedTheme.name}`
                            }
                        />
                    </Select2>
                </FormGroup>

                <FormGroup
                    inline={true}
                    labelFor="default-folder"
                    label={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                    helperText={isFolderValid ? <span>&nbsp;</span> : <span>{t('DIALOG.PREFS.INVALID_FOLDER')}</span>}
                    intent={intent}
                >
                    <InputGroup
                        onChange={onFolderChange}
                        onBlur={onFolderBlur}
                        value={defaultFolder}
                        leftIcon="folder-close"
                        placeholder={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                        id="default-folder"
                        name="default-folder"
                        title={defaultFolder}
                    />
                </FormGroup>

                <FormGroup
                    inline={true}
                    labelFor="default-terminal"
                    label={t('DIALOG.PREFS.DEFAULT_TERMINAL')}
                    helperText={t('DIALOG.PREFS.DEFAULT_TERMINAL_HELP')}
                >
                    <InputGroup
                        onChange={onTerminalChange}
                        value={defaultTerminal}
                        rightElement={testTerminalButton}
                        leftIcon="console"
                        placeholder={t('DIALOG.PREFS.DEFAULT_TERMINAL')}
                        id="default-terminal"
                        name="default-terminal"
                        title={defaultTerminal}
                    />
                </FormGroup>

                <FormGroup inline={true} intent="danger" helperText={t('DIALOG.PREFS.RESET_HELP')} label=" ">
                    <Button icon="trash" intent="primary" text={t('DIALOG.PREFS.RESET')} onClick={onResetPrefs} />
                </FormGroup>
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

export { PrefsDialog }
