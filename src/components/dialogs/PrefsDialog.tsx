import * as React from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { languageList } from '$src/locale/i18n'
import { ipcRenderer } from 'electron'

import { Modal, Radio, Group, Select, TextInput, ActionIcon, Tooltip, Button, Text, ScrollArea } from '@mantine/core'
import { IconFlag, IconSun, IconFolder, IconTerminal, IconPlayerPlayFilled, IconTrash } from '@tabler/icons-react'

import { debounce } from '$src/utils/debounce'
import { FsLocal, FolderExists } from '$src/services/plugins/FsLocal'
import { showAlertModal } from '$src/components/AppAlert'
import { HOME_DIR } from '$src/utils/platform'
import { useStores } from '$src/hooks/useStores'
import { ViewModeName } from '$src/hooks/useViewMode'
import { observer } from 'mobx-react'

const DEBOUNCE_DELAY = 300

interface PrefsProps {
    isOpen: boolean
    onClose: () => void
}

interface Language {
    label: string
    value: string
}

interface Theme {
    label: string
    value: 'true' | 'auto' | 'false'
}

const PrefsDialog = observer(({ isOpen, onClose }: PrefsProps) => {
    const { settingsState } = useStores('settingsState')
    const { lang, darkMode, defaultTerminal, defaultViewMode } = settingsState
    const darkModeValue = darkMode === 'auto' ? 'auto' : darkMode ? 'true' : 'false'
    const { t } = useTranslation()
    const [defaultFolder, setDefaultFolder] = useState(settingsState.defaultFolder)

    // TODO: we could have a default folder that's not using FsLocal
    const [isFolderValid, setIsFolderValid] = useState(
        () => FsLocal.canread(defaultFolder) && FolderExists(defaultFolder),
    )

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

    const getSortedLanguages = (): Array<Language> => {
        const languages: Array<Language> = languageList
            .map((code: string) => ({
                value: code,
                label: t('CURRENT_LANGUAGE', { lng: code }),
            }))
            .sort((lang1: Language, lang2: Language) => {
                if (lang1.label < lang2.label) {
                    return -1
                } else return lang1.label > lang2.label ? 1 : 0
            })

        const auto = [{ value: 'auto', label: t('COMMON.AUTO') }]

        return auto.concat(languages)
    }

    const getThemeList = (): Array<Theme> => {
        return [
            {
                value: 'auto',
                label: t('COMMON.AUTO'),
            },
            {
                value: 'true',
                label: t('DIALOG.PREFS.DARK'),
            },
            {
                value: 'false',
                label: t('DIALOG.PREFS.BRIGHT'),
            },
        ]
    }

    const onLanguageSelect = (value: string | null): void => {
        if (!value) return
        settingsState.setLanguage(value)
        settingsState.saveSettings()
    }

    const onThemeSelect = (value: string | null): void => {
        if (!value) return
        const themeValue = value as Theme['value']
        settingsState.setActiveTheme(themeValue === 'auto' ? 'auto' : themeValue === 'true')
        settingsState.saveSettings()
    }

    const onResetPrefs = (): void => {
        settingsState.resetSettings()
    }

    const onTerminalChange = (event: React.FormEvent<HTMLElement>): void => {
        const terminal = (event.target as HTMLInputElement).value
        settingsState.setDefaultTerminal(terminal)
        settingsState.saveSettings()
    }

    const testTerminal = async (): Promise<void> => {
        const path = settingsState.getTerminalCommand(HOME_DIR)

        const { code, terminal } = await ipcRenderer.invoke('openTerminal', path)

        code &&
            showAlertModal({
                message: t('DIALOG.PREFS.TEST_TERMINAL_FAILED', { terminal, code }),
                intent: 'danger',
                icon: 'error',
                modalId: 'prefsTestTerminalError',
            }).then((res) => console.log('closed', res))
    }

    const onChangeViewMode = (value: string) => {
        console.log('onChangeViewMode', value)
        const viewmode = value as ViewModeName
        settingsState.setDefaultViewMode(viewmode)
        settingsState.saveSettings()
    }

    const languageItems = getSortedLanguages()
    const selectedLanguage = languageItems.find((language: Language) => language.value === lang)
    const themeItems = getThemeList()
    const selectedTheme = themeItems.find((theme: Theme) => theme.value === darkModeValue)
    const testTerminalButton = (
        <Tooltip label={t('DIALOG.PREFS.DEFAULT_TERMINAL_HELP')}>
            <ActionIcon variant="subtle" aria-label="Settings">
                <IconPlayerPlayFilled style={{ width: '70%', height: '70%' }} stroke={1.5} onClick={testTerminal} />
            </ActionIcon>
        </Tooltip>
    )

    return (
        <Modal
            centered
            closeOnEscape={false}
            onClose={onClose}
            opened={isOpen}
            title={t('DIALOG.PREFS.TITLE')}
            withCloseButton
        >
            <ScrollArea h="calc(90vh - 300px)" mih="200px" type="hover" offsetScrollbars scrollbarSize={10}>
                <Select
                    label={t('DIALOG.PREFS.LANGUAGE')}
                    rightSection={<IconFlag size={16} />}
                    data={languageItems}
                    allowDeselect={false}
                    defaultValue={selectedLanguage.value}
                    size="sm"
                    onChange={onLanguageSelect}
                ></Select>

                <Select
                    label={t('DIALOG.PREFS.THEME')}
                    rightSection={<IconSun size={16} />}
                    data={themeItems}
                    allowDeselect={false}
                    defaultValue={selectedTheme.value}
                    size="sm"
                    onChange={onThemeSelect}
                    my="lg"
                ></Select>

                <Radio.Group
                    label={t('DIALOG.PREFS.DEFAULT_VIEW_MODE')}
                    value={defaultViewMode}
                    onChange={onChangeViewMode}
                    name="default-view-mode"
                    className="data-cy-default-view-mode"
                >
                    <Group>
                        <Radio label={t('TOOLBAR.ICON_VIEW')} value="icons" />
                        <Radio label={t('TOOLBAR.DETAILS_VIEW')} value="details" />
                    </Group>
                </Radio.Group>

                <TextInput
                    label={t('DIALOG.PREFS.DEFAULT_FOLDER')}
                    value={defaultFolder}
                    onBlur={onFolderBlur}
                    onChange={onFolderChange}
                    leftSection={<IconFolder size={16} />}
                    withErrorStyles={false}
                    error={(!isFolderValid && t('DIALOG.PREFS.INVALID_FOLDER')) || ''}
                    spellCheck={false}
                    my="lg"
                />

                <TextInput
                    label={t('DIALOG.PREFS.DEFAULT_TERMINAL')}
                    value={defaultTerminal}
                    onChange={onTerminalChange}
                    leftSection={<IconTerminal size={16} />}
                    rightSection={testTerminalButton}
                    spellCheck={false}
                    my="lg"
                />

                <Button variant="filled" leftSection={<IconTrash size={16} />} onClick={onResetPrefs}>
                    {t('DIALOG.PREFS.RESET')}
                </Button>

                <Text size="xs" c="red.9" mb="md">
                    {t('DIALOG.PREFS.RESET_HELP')}
                </Text>
            </ScrollArea>

            <Group justify="end" pt="md" mt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                <Button onClick={onClose} variant="filled" color="gray">
                    {t('COMMON.CLOSE')}
                </Button>
            </Group>
        </Modal>
    )
})

export { PrefsDialog }
