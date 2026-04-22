import * as React from 'react'
import { useState } from 'react'
import { Modal, Button, TextInput, Group, Text, Stack } from '@mantine/core'
import { IconFolderPlus } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

import { optionKey } from '$src/utils/platform'
import Keys from '$src/constants/keys'

interface MakedirProps {
    isOpen: boolean
    parentPath: string
    onClose?: (dirName: string, navigate: boolean) => void
    onValidation: (dir: string) => boolean
}

const MakedirDialog = ({ onValidation, onClose, isOpen, parentPath }: MakedirProps) => {
    const [path, setPath] = useState('')
    const [isOptionKeyPressed, setIsOptionKeyPressed] = useState(false)
    const [isValid, setIsValid] = useState(true)

    const checkPath = (path: string) => {
        try {
            setIsValid(onValidation(path))
        } catch (error) {
            setIsValid(false)
        }
    }

    const cancelClose = (): void => onClose?.('', false)

    const onCreate = (): void => {
        if (onValidation(path)) {
            onClose?.(path, isOptionKeyPressed)
        } else {
            setIsValid(false)
        }
    }

    const onPathChange = (event: React.FormEvent<HTMLElement>): void => {
        const path = (event.target as HTMLInputElement).value
        setPath(path)
        checkPath(path)
    }

    const onKeyUp: React.KeyboardEventHandler = (e): void => {
        if (e.key === optionKey) {
            setIsOptionKeyPressed(false)
        }
    }

    const onKeyDown: React.KeyboardEventHandler = (e): void => {
        if (e.key === optionKey) {
            setIsOptionKeyPressed(true)
        } else if (e.key === Keys.ENTER) {
            isValid && path.length && onCreate()
        }
    }

    const { t } = useTranslation()

    const sep = parentPath.match(/\//) ? '/' : '\\'

    if (!parentPath.endsWith(sep)) {
        parentPath += sep
    }

    const ref = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        // Workaround for https://github.com/mantinedev/mantine/issues/8857
        setTimeout(() => ref.current?.focus(), 10)
    }, [])

    return (
        <Modal
            opened={isOpen}
            onClose={cancelClose}
            title={
                <Group gap="xs">
                    <IconFolderPlus size={20} />
                    {t('COMMON.MAKEDIR')}
                </Group>
            }
            centered
            closeOnEscape={true}
            withCloseButton
        >
            <Stack gap="md" onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
                <Text size="sm">{t('DIALOG.MAKEDIR.TITLE')}</Text>

                <div>
                    <TextInput
                        placeholder={t('DIALOG.MAKEDIR.NAME')}
                        value={path}
                        onChange={onPathChange}
                        error={!isValid}
                        id="directory-input"
                        name="directory-input"
                        data-autofocus
                        ref={ref}
                    />
                    <Text
                        size="xs"
                        c={!isValid ? 'red' : 'transparent'}
                        style={{ minHeight: '1.25rem', marginTop: '0.25rem' }}
                    >
                        {!isValid ? t('DIALOG.MAKEDIR.NOT_VALID') : '\u00A0'}
                    </Text>
                </div>

                <Group justify="flex-end" pt="md">
                    <Button onClick={cancelClose} variant="subtle" color="gray">
                        {t('COMMON.CANCEL')}
                    </Button>

                    <Button variant="filled" onClick={onCreate} disabled={!path.length || !isValid}>
                        {(!isOptionKeyPressed && t('DIALOG.MAKEDIR.CREATE')) || t('DIALOG.MAKEDIR.CREATE_READ')}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export { MakedirDialog }
