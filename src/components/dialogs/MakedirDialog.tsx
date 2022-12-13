import * as React from 'react'
import { useState } from 'react'
import { Dialog, Classes, Intent, Button, InputGroup, FormGroup } from '@blueprintjs/core'
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

    const cancelClose = (): void => onClose('', false)

    const onCreate = (): void => {
        if (onValidation(path)) {
            onClose(path, isOptionKeyPressed)
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

    const intent = (!isValid && 'danger') || 'none'
    const helperText = (!isValid && <span>{t('DIALOG.MAKEDIR.NOT_VALID')}</span>) || <span>&nbsp;</span>

    const sep = parentPath.match(/\//) ? '/' : '\\'

    if (!parentPath.endsWith(sep)) {
        parentPath += sep
    }

    return (
        <Dialog
            icon="folder-new"
            title={t('COMMON.MAKEDIR')}
            isOpen={isOpen}
            autoFocus={true}
            enforceFocus={true}
            canEscapeKeyClose={true}
            usePortal={true}
            onClose={cancelClose}
            className="makedirDialog"
        >
            <div onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
                <div className={Classes.DIALOG_BODY}>
                    <p>{t('DIALOG.MAKEDIR.TITLE')}</p>
                    <FormGroup
                        helperText={helperText}
                        inline={true}
                        labelFor="directory-input"
                        labelInfo={`${parentPath}`}
                    >
                        <InputGroup
                            onChange={onPathChange}
                            placeholder={t('DIALOG.MAKEDIR.NAME')}
                            value={path}
                            id="directory-input"
                            name="directory-input"
                            intent={intent}
                            autoFocus
                        />
                    </FormGroup>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={cancelClose}>{t('COMMON.CANCEL')}</Button>

                        <Button intent={Intent.PRIMARY} onClick={onCreate} disabled={!path.length || !isValid}>
                            {(!isOptionKeyPressed && t('DIALOG.MAKEDIR.CREATE')) || t('DIALOG.MAKEDIR.CREATE_READ')}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    )
}

export { MakedirDialog }
